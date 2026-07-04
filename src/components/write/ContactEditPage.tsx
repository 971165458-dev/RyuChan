'use client'

import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Toaster, toast } from 'sonner'
import { readFileAsText } from '@/lib/file-utils'
import { useAuthStore } from './hooks/use-auth'
import { saveContactToGitHub, type ContactData, type ContactItem } from './services/contact-service'

const emptyItem: ContactItem = { name: '', avatar: '', url: '', badge: '', description: '' }

export default function ContactEditPage({ initialContact }: { initialContact: ContactData }) {
  const [contact, setContact] = useState(initialContact)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)

  const updateItem = (index: number, key: keyof ContactItem, value: string) => setContact(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }))
  const hostname = (url: string) => { try { return new URL(url).hostname } catch { return url } }

  const save = async () => {
    if (!contact.name.trim()) return toast.error('名称不能为空')
    if (contact.items.some(item => !item.name.trim() || !item.url.trim())) return toast.error('联系方式名称和链接不能为空')
    if (!isAuth) { toast.error('请先导入密钥'); keyInputRef.current?.click(); return }
    try {
      setSaving(true)
      await saveContactToGitHub(contact)
      setEditing(false)
    } finally { setSaving(false) }
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <input ref={keyInputRef} type="file" accept=".pem" className="hidden" onChange={async e => {
        const file = e.target.files?.[0]
        if (file) { setPrivateKey(await readFileAsText(file)); toast.success('密钥导入成功') }
        e.currentTarget.value = ''
      }} />

      <div className="flex justify-end mb-5">
        {editing ? <div className="flex flex-wrap justify-end gap-2">
          <button className="btn btn-sm btn-ghost" onClick={() => { setContact(initialContact); setEditing(false) }}>取消</button>
          <button className="btn btn-sm btn-outline" onClick={() => setContact(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))}>添加联系方式</button>
          <button className="btn btn-sm btn-outline" disabled={isAuth} onClick={() => keyInputRef.current?.click()}>{isAuth ? '已导入' : '导入密钥'}</button>
          <button className="btn btn-sm btn-primary" disabled={saving} onClick={save}>{saving ? '保存中...' : '保存'}</button>
        </div> : <button className="btn btn-sm btn-primary gap-2" onClick={() => setEditing(true)}><Icon icon="lucide:pencil" />编辑</button>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 mb-8 text-center sm:text-left">
        <img src={contact.avatar} alt={`${contact.name} avatar`} className="w-24 h-24 rounded-3xl object-cover ring ring-primary ring-offset-4 ring-offset-base-100" />
        {editing ? <div className="w-full space-y-2">
          <input className="input input-sm input-bordered w-full" value={contact.avatar} onChange={e => setContact(prev => ({ ...prev, avatar: e.target.value }))} placeholder="头像 URL" />
          <input className="input input-sm input-bordered w-full" value={contact.name} onChange={e => setContact(prev => ({ ...prev, name: e.target.value }))} placeholder="名称" />
          <textarea className="textarea textarea-bordered w-full" rows={2} value={contact.description} onChange={e => setContact(prev => ({ ...prev, description: e.target.value }))} placeholder="简介" />
        </div> : <div><h3 className="text-2xl font-bold">{contact.name}</h3><p className="mt-2 text-base-content/70">{contact.description}</p></div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {contact.items.map((item, index) => editing ? (
          <div key={index} className="bg-base-100 rounded-3xl p-5 shadow-sm border border-base-200 space-y-3">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <img src={item.avatar || '/favicon.ico'} alt="" className="w-16 h-16 rounded-2xl object-cover bg-base-200" />
              <div className="space-y-2"><input className="input input-sm input-bordered w-full" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} placeholder="名称" /><input className="input input-sm input-bordered w-full" value={item.avatar} onChange={e => updateItem(index, 'avatar', e.target.value)} placeholder="图标 URL" /></div>
            </div>
            <input className="input input-sm input-bordered w-full" value={item.url} onChange={e => updateItem(index, 'url', e.target.value)} placeholder="链接" />
            <input className="input input-sm input-bordered w-full" value={item.badge} onChange={e => updateItem(index, 'badge', e.target.value)} placeholder="徽章文字" />
            <textarea className="textarea textarea-bordered w-full" rows={2} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="说明" />
            <button className="btn btn-sm btn-ghost text-error w-full" onClick={() => setContact(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}>删除</button>
          </div>
        ) : (
          <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="group bg-base-100 rounded-3xl p-6 shadow-sm border border-base-200 hover:border-primary/40 hover:-translate-y-1 transition-all">
            <div className="flex items-center gap-4"><img src={item.avatar || '/favicon.ico'} alt="" className="w-16 h-16 rounded-2xl object-cover bg-base-200" /><div className="min-w-0"><h3 className="text-xl font-bold truncate">{item.name}</h3><p className="text-sm text-base-content/45 truncate">{hostname(item.url)}</p></div></div>
            {item.badge && <span className="inline-flex mt-5 px-3 py-1 rounded-lg text-sm font-semibold text-primary border border-primary/30 bg-primary/5">{item.badge}</span>}
            <p className="mt-5 text-base-content/70 leading-relaxed">{item.description}</p>
          </a>
        ))}
      </div>
      {!editing && contact.items.length === 0 && <p className="text-center py-10 text-base-content/50">暂无联系方式，点击“编辑”添加</p>}
    </>
  )
}
