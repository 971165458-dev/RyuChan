import assert from 'node:assert/strict'
import { createHash, createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const validPassword = value => Number.isInteger(Number(value)) && Number(value) >= 1111 && Number(value) <= 9999
const key = password => createHash('sha256').update(String(password)).digest()

function encrypt(text, password) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(password), iv)
  return Buffer.concat([iv, cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64')
}

function decrypt(value, password) {
  const data = Buffer.from(value, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key(password), data.subarray(0, 12))
  decipher.setAuthTag(data.subarray(-16))
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString('utf8')
}

function decryptWithKnownPasswords(value, candidates) {
  for (const password of [...new Set(candidates.filter(validPassword).map(String))]) {
    try { return decrypt(value, password) } catch {}
  }
  throw new Error('无法使用现有密码解密')
}

async function filesUnder(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat()
}

function splitPost(source) {
  const match = source.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/)
  if (!match) throw new Error('文章 frontmatter 格式无效')
  const field = name => match[1].match(new RegExp(`^${name}:\\s*['"]?([^'"\\r\\n]+)['"]?\\s*$`, 'm'))?.[1]?.trim()
  return { frontmatter: match[1], body: match[2].trim(), title: field('title'), group: field('passwordGroup') }
}

const beijingDate = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(date)

async function rotate(blogDir = 'src/content/blog', passwordFile = 'public/daily-password.json', { scheduled = false } = {}) {
  /** @type {{ password?: string, passwords: Record<string, string>, groups?: string[], rotatedDate?: string, updatedAt?: string }} */
  let old = { passwords: {}, groups: [] }
  try { old = JSON.parse(await fs.readFile(passwordFile, 'utf8')) } catch {}
  if (scheduled && old.rotatedDate === beijingDate(new Date())) {
    console.log('今日密码已经更新，跳过重复轮换')
    return false
  }

  const encryptedPosts = []
  for (const file of (await filesUnder(blogDir)).filter(file => file.endsWith('.md'))) {
    const post = splitPost(await fs.readFile(file, 'utf8'))
    if (/^encrypted:\s*true\s*$/m.test(post.frontmatter)) {
      if (!post.title) throw new Error(`${file} 缺少标题`)
      encryptedPosts.push({ file, ...post, accessName: post.group || post.title })
    }
  }

  const accessNames = [...new Set(encryptedPosts.map(post => post.accessName))]
  const groups = [...new Set(encryptedPosts.map(post => post.group).filter(Boolean))]
  const individualNames = encryptedPosts.filter(post => !post.group).map(post => post.title)
  if (new Set(individualNames).size !== individualNames.length) throw new Error('独立加密文章的标题必须唯一')
  if (individualNames.some(title => groups.includes(title))) throw new Error('文章标题不能与密码组同名')

  const allOldPasswords = [old.password, ...Object.values(old.passwords || {})]
  const plainTexts = encryptedPosts.map(post => {
    try {
      return decryptWithKnownPasswords(post.body, [old.passwords?.[post.accessName], old.password, ...allOldPasswords])
    } catch {
      throw new Error(`${post.file} 无法使用现有密码解密`)
    }
  })

  const passwords = Object.fromEntries(accessNames.map(name => {
    let password
    do password = String(randomInt(1111, 10000))
    while (password === String(old.passwords?.[name] || old.password || ''))
    return [name, password]
  }))

  await Promise.all(encryptedPosts.map((post, index) =>
    fs.writeFile(post.file, `${post.frontmatter}${encrypt(plainTexts[index], passwords[post.accessName])}\n`)
  ))
  const updatedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace(' ', 'T') + '+08:00'
  await fs.writeFile(passwordFile, JSON.stringify({ passwords, groups, rotatedDate: beijingDate(new Date()), updatedAt, timezone: 'Asia/Shanghai' }, null, 2) + '\n')
  console.log(`已扫描 ${encryptedPosts.length} 篇加密文章，更新 ${accessNames.length} 个密码`)
  return true
}

async function selfTest() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ryuchan-password-test-'))
  const blogDir = path.join(root, 'blog')
  const passwordFile = path.join(root, 'daily-password.json')
  await fs.mkdir(blogDir)
  const frontmatter = (title, group = '') => `---\ntitle: ${title}\nencrypted: true\n${group ? `passwordGroup: ${group}\n` : ''}---\n`
  await fs.writeFile(path.join(blogDir, 'group.md'), frontmatter('分组文章', '测试组') + encrypt('分组正文', '5120'))
  await fs.writeFile(path.join(blogDir, 'single.md'), frontmatter('独立文章') + encrypt('独立正文', '6000'))
  await fs.writeFile(passwordFile, JSON.stringify({ password: '5120', passwords: { 测试组: '4571', 独立文章: '6000' } }))

  await rotate(blogDir, passwordFile)
  const first = JSON.parse(await fs.readFile(passwordFile, 'utf8'))
  assert.equal(first.password, undefined)
  assert.deepEqual(first.groups, ['测试组'])
  assert.deepEqual(Object.keys(first.passwords).sort(), ['测试组', '独立文章'])
  assert.equal(decrypt(splitPost(await fs.readFile(path.join(blogDir, 'group.md'), 'utf8')).body, first.passwords.测试组), '分组正文')
  assert.equal(decrypt(splitPost(await fs.readFile(path.join(blogDir, 'single.md'), 'utf8')).body, first.passwords.独立文章), '独立正文')

  await rotate(blogDir, passwordFile)
  const second = JSON.parse(await fs.readFile(passwordFile, 'utf8'))
  assert.notEqual(second.passwords.测试组, first.passwords.测试组)
  assert.notEqual(second.passwords.独立文章, first.passwords.独立文章)
  const twiceRotatedGroupBody = splitPost(await fs.readFile(path.join(blogDir, 'group.md'), 'utf8')).body
  assert.throws(() => decrypt(twiceRotatedGroupBody, first.passwords.测试组))
  assert.equal(await rotate(blogDir, passwordFile, { scheduled: true }), false)
  assert.equal(splitPost(await fs.readFile(path.join(blogDir, 'group.md'), 'utf8')).body, twiceRotatedGroupBody)
  await fs.rm(root, { recursive: true, force: true })
  console.log('连续两日轮换、旧密码失效、默认密码迁移及当日防重复检查通过')
}

if (process.argv.includes('--self-test')) await selfTest()
else await rotate('src/content/blog', 'public/daily-password.json', { scheduled: process.env.GITHUB_EVENT_NAME === 'schedule' })
