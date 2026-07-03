import yaml from 'js-yaml'
import { toast } from 'sonner'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import {
  createBlob,
  createCommit,
  createTree,
  getCommit,
  getRef,
  readTextFileFromRepo,
  toBase64Utf8,
  updateRef,
} from '@/lib/github-client'

export type ContactSocial = { href: string; title: string; ariaLabel: string; svg: string }
export type ContactData = { name: string; description: string; avatar: string; socials: ContactSocial[] }

export async function saveContactToGitHub(contact: ContactData) {
  const token = await getAuthToken()
  const toastId = toast.loading('正在保存联系信息...')

  try {
    const content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, 'ryuchan.config.yaml', GITHUB_CONFIG.BRANCH)
    if (!content) throw new Error('无法读取网站配置')

    const config = yaml.load(content) as any
    config.user = config.user || {}
    config.user.name = contact.name
    config.user.description = contact.description
    config.user.avatar = contact.avatar
    config.user.sidebar = config.user.sidebar || {}
    config.user.sidebar.social = contact.socials

    const { sha: blobSha } = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(yaml.dump(config, { lineWidth: -1, noRefs: true })), 'base64')
    const refName = `heads/${GITHUB_CONFIG.BRANCH}`
    const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName)
    const commit = await getCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, ref.sha)
    const { sha: treeSha } = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, [{ path: 'ryuchan.config.yaml', mode: '100644', type: 'blob', sha: blobSha }], commit.tree.sha)
    const { sha: commitSha } = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, 'chore(contact): update contact information', treeSha, [ref.sha])
    await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, refName, commitSha)
    toast.success('联系信息保存成功', { id: toastId })
  } catch (error: any) {
    toast.error('保存失败', { id: toastId, description: error.message || '请稍后重试' })
    throw error
  }
}
