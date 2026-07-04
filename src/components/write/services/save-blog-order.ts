import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, readTextFileFromRepo, toBase64Utf8, updateRef, type TreeItem } from '@/lib/github-client'

export async function saveBlogOrder(slugs: string[]) {
  const token = await getAuthToken()
  const ref = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
  const tree: TreeItem[] = []

  for (const [order, slug] of slugs.entries()) {
    let path = `src/content/blog/${slug}.md`
    let source = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    if (!source) {
      path = `src/content/blog/${slug}.mdx`
      source = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    }
    if (!source) throw new Error(`找不到文章：${slug}`)

    const content = /^order:\s*\d+\s*$/m.test(source)
      ? source.replace(/^order:\s*\d+\s*$/m, `order: ${order}`)
      : source.replace(/^---\r?\n/, `---\norder: ${order}\n`)
    const blob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(content), 'base64')
    tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  const nextTree = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, tree, ref.sha)
  const commit = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, 'chore(blog): update article order', nextTree.sha, [ref.sha])
  await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commit.sha)
}
