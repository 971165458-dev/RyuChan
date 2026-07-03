import { getAuthToken, hasAuth } from './auth'
import { readTextFileFromRepo, listRepoFilesRecursive } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { parseFrontmatter } from './frontmatter'
import type { PublishForm } from '@/components/write/types'
import dayjs from 'dayjs'
import { decrypt } from './aes256-util'

export async function loadBlog(slug: string): Promise<{ form: PublishForm, cover?: string }> {
    let token: string | undefined
    if (await hasAuth()) {
        try {
            token = await getAuthToken()
        } catch (e) {
            console.warn('Failed to get auth token, trying public access', e)
        }
    }
    
    let path = `src/content/blog/${slug}.md`
    let content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    
    if (!content) {
         path = `src/content/blog/${slug}.mdx`
         content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
    }

    // Fallback: Case-insensitive search
    if (!content) {
        try {
            const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, 'src/content/blog', GITHUB_CONFIG.BRANCH)
            const targetMd = `/${slug}.md`.toLowerCase()
            const targetMdx = `/${slug}.mdx`.toLowerCase()
            
            const foundPath = files.find(f => {
                const lower = f.toLowerCase()
                return lower.endsWith(targetMd) || lower.endsWith(targetMdx)
            })

            if (foundPath) {
                path = foundPath
                content = await readTextFileFromRepo(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, path, GITHUB_CONFIG.BRANCH)
            }
        } catch (e) {
            console.warn('Failed to list repo files for fallback search', e)
        }
    }

    if (!content) {
        throw new Error('Blog not found')
    }

    const { data, content: body } = parseFrontmatter(content)
    let md = body
    let password = ''
    if (data.encrypted) {
        password = window.prompt('请输入文章密码以继续编辑') || ''
        if (!password) throw new Error('已取消加密文章编辑')
        try {
            md = await decrypt(body.trim(), password)
        } catch {
            throw new Error('文章密码错误')
        }
    }

    // 根据文件路径确定文件格式
    const fileFormat = path.endsWith('.mdx') ? 'mdx' : 'md';

    const form: PublishForm = {
        slug,
        title: data.title || '',
        md: md || '',
        tags: data.tags || [],
        date: data.pubDate ? dayjs(data.pubDate).format('YYYY-MM-DDTHH:mm') : '',
        summary: data.description || '',
        hidden: data.draft || false,
        password,
        categories: data.categories || [],
        badge: data.badge || '',
        fileFormat
    }

    return { form, cover: data.image }
}
