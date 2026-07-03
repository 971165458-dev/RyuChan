import { useEffect, useState } from 'react'
import { marked } from 'marked'
import {
  base64ToBytes,
  bytesToBase64,
  decryptWithKeyBytes,
  deriveKeyBytes,
} from '@/lib/aes256-util'

type Props = {
  cipherText: string
  slug: string
}

const AUTH_TTL = 12 * 60 * 60 * 1000

export default function EncryptedPost({ cipherText, slug }: Props) {
  const [password, setPassword] = useState('')
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const storageKey = `ryuchan:post-unlock:${slug}`

  const unlockWithKey = async (keyBytes: Uint8Array, remember: boolean) => {
    const markdown = await decryptWithKeyBytes(cipherText.trim(), keyBytes)
    setHtml(await marked.parse(markdown))
    setError('')
    if (remember) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          key: bytesToBase64(keyBytes),
          expiresAt: Date.now() + AUTH_TTL,
        }))
      } catch {
        // Decryption still succeeds when storage is unavailable.
      }
    }
    window.dispatchEvent(new CustomEvent('ryuchan:post-unlocked'))
  }

  useEffect(() => {
    const restore = async () => {
      try {
        const cached = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
        if (!cached?.key || !cached?.expiresAt || cached.expiresAt <= Date.now()) {
          window.localStorage.removeItem(storageKey)
          return
        }
        await unlockWithKey(base64ToBytes(cached.key), false)
      } catch {
        window.localStorage.removeItem(storageKey)
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [cipherText, storageKey])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!password) return
    setLoading(true)
    try {
      const keyBytes = await deriveKeyBytes(password)
      await unlockWithKey(keyBytes, true)
      setPassword('')
    } catch {
      setError('密码错误，请重试。')
    } finally {
      setLoading(false)
    }
  }

  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div className="not-prose rounded-3xl border border-primary/20 bg-base-200/60 p-6 md:p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">🔒</div>
      <h2 className="text-2xl font-bold">这是一篇加密文章</h2>
      <p className="mt-2 text-sm text-base-content/60">输入密码后可阅读，本设备将保留授权 12 小时。</p>
      <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="文章密码"
          aria-label="文章密码"
          className="input input-bordered min-w-0 flex-1 bg-base-100"
        />
        <button type="submit" disabled={loading || !password} className="btn btn-primary">
          {loading ? '解锁中…' : '解锁文章'}
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
    </div>
  )
}
