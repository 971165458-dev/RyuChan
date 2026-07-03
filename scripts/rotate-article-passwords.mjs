import { createHash, createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const blogDir = 'src/content/blog'
const passwordFile = 'public/daily-password.json'
const validPassword = value => Number.isInteger(Number(value)) && Number(value) >= 1111 && Number(value) <= 9999

const key = password => createHash('sha256').update(password).digest()

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

async function filesUnder(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesUnder(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat()
}

function splitPost(source) {
  const match = source.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/)
  if (!match) throw new Error('文章 frontmatter 格式无效')
  return { frontmatter: match[1], body: match[2].trim() }
}

async function currentPasswords() {
  try {
    const data = JSON.parse(await fs.readFile(passwordFile, 'utf8'))
    if (validPassword(data.password)) return { common: String(data.password), byFile: {} }
  } catch {}
  const byFile = process.env.ARTICLE_CURRENT_PASSWORDS ? JSON.parse(process.env.ARTICLE_CURRENT_PASSWORDS) : {}
  if (process.env.ARTICLE_CURRENT_PASSWORD || Object.keys(byFile).length) return { common: process.env.ARTICLE_CURRENT_PASSWORD, byFile }
  throw new Error('首次运行需设置 GitHub Secret：ARTICLE_CURRENT_PASSWORD，或按文件设置 ARTICLE_CURRENT_PASSWORDS')
}

async function rotate() {
  const oldPasswords = await currentPasswords()
  let newPassword
  do newPassword = String(randomInt(1111, 10000))
  while (newPassword === oldPasswords.common)

  const files = (await filesUnder(blogDir)).filter(file => file.endsWith('.md'))
  const updates = []
  for (const file of files) {
    const source = await fs.readFile(file, 'utf8')
    const post = splitPost(source)
    if (!/^encrypted:\s*true\s*$/m.test(post.frontmatter)) continue
    const oldPassword = oldPasswords.byFile[file] || oldPasswords.byFile[path.basename(file, '.md')] || oldPasswords.common
    if (!oldPassword) throw new Error(`缺少 ${file} 的当前密码`)
    const plainText = decrypt(post.body, oldPassword)
    updates.push([file, `${post.frontmatter}${encrypt(plainText, newPassword)}\n`])
  }

  for (const [file, content] of updates) await fs.writeFile(file, content)
  const updatedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace(' ', 'T') + '+08:00'
  await fs.writeFile(passwordFile, JSON.stringify({ password: newPassword, updatedAt, timezone: 'Asia/Shanghai' }, null, 2) + '\n')
  console.log(`已更新 ${updates.length} 篇加密文章，密码范围验证：${validPassword(newPassword)}`)
}

if (process.argv.includes('--self-test')) {
  const password = '1111'
  if (decrypt(encrypt('测试正文', password), password) !== '测试正文') throw new Error('加解密自检失败')
  console.log('加解密自检通过')
} else {
  await rotate()
}
