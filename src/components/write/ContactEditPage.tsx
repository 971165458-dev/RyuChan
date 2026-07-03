'use client'

import { useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { Toaster, toast } from 'sonner'
import { readFileAsText } from '@/lib/file-utils'
import { useAuthStore } from './hooks/use-auth'
import { saveContactToGitHub, type ContactData } from './services/contact-service'

export default function ContactEditPage({ initialContact }: { initialContact: ContactData }) {
  const [contact, setContact] = useState(initialContact)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { isAuth, setPrivateKey } = useAuthStore()
  const keyInputRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof ContactData>(key: K, value: ContactData[K]) => setContact(prev => ({ ...prev, [key]: value }))
  const updateSocial = (index: number, key: keyof ContactData['socials'][number], value: string) => update('socials', contact.socials.map((item, i) => i === index ? { ...item, [key]: value } : item))

  const save = async () => {
    if (!contact.name.trim()) return toast.error('名称不能为空')
    if (!isAuth) { toast.error('请先导入密钥'); keyInputRef.current?.click(); return }
    try {
      setSaving(true)
      await saveContactToGitHub(contact)
      setEditing(false)
    } finally {
      setSaving(false)
    }
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
        {editing ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn btn-sm btn-ghost" onClick={() => { setContact(initialContact); setEditing(false) }}>取消</button>
            <button className="btn btn-sm btn-outline" disabled={isAuth} onClick={() => keyInputRef.current?.click()}>{isAuth ? '已导入' : '导入密钥'}</button>
            <button className="btn btn-sm btn-primary" disabled={saving} onClick={save}>{saving ? '保存中...' : '保存'}</button>
          </div>
        ) : (
          <button className="btn btn-sm btn-primary gap-2" onClick={() => setEditing(true)}><Icon icon="lucide:pencil" />编辑</button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
        {editing ? (
          <div className="w-full lg:w-48 space-y-3">
            <img src={contact.avatar} alt="头像预览" className="w-32 h-32 mx-auto rounded-3xl object-cover ring ring-primary ring-offset-4 ring-offset-base-100" />
            <input className="input input-sm input-bordered w-full" value={contact.avatar} onChange={e => update('avatar', e.target.value)} placeholder="头像 URL" />
          </div>
        ) : (
          <img src={contact.avatar} alt={`${contact.name} avatar`} className="w-32 h-32 rounded-3xl object-cover ring ring-primary ring-offset-4 ring-offset-base-100" />
        )}

        <div className="flex-1 w-full text-center lg:text-left">
          {editing ? (
            <div className="space-y-3">
              <input className="input input-bordered w-full" value={contact.name} onChange={e => update('name', e.target.value)} placeholder="名称" />
              <textarea className="textarea textarea-bordered w-full" rows={3} value={contact.description} onChange={e => update('description', e.target.value)} placeholder="简介" />
              <div className="space-y-3">
                {contact.socials.map((social, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_1fr_auto] gap-2 p-3 rounded-xl bg-base-200/50">
                    <input className="input input-sm input-bordered" value={social.title} onChange={e => updateSocial(index, 'title', e.target.value)} placeholder="名称" />
                    <input className="input input-sm input-bordered" value={social.href} onChange={e => updateSocial(index, 'href', e.target.value)} placeholder="链接" />
                    <input className="input input-sm input-bordered" value={social.svg} onChange={e => updateSocial(index, 'svg', e.target.value)} placeholder="图标，如 ri:telegram-line" />
                    <button className="btn btn-sm btn-ghost text-error" onClick={() => update('socials', contact.socials.filter((_, i) => i !== index))}>删除</button>
                  </div>
                ))}
                <button className="btn btn-sm btn-outline" onClick={() => update('socials', [...contact.socials, { title: '新链接', ariaLabel: '新链接', href: '', svg: 'ri:link' }])}>添加联系方式</button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold">{contact.name}</h3>
              <p className="mt-2 text-base-content/70">{contact.description}</p>
              <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-3">
                {contact.socials.map((social, index) => <a key={index} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.ariaLabel} className="btn btn-outline btn-sm gap-2"><Icon icon={social.svg} />{social.title || social.ariaLabel}</a>)}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
