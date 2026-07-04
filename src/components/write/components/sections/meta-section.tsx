import { motion } from 'motion/react'
import { useWriteStore } from '../../stores/write-store'
import { TagInput } from '../ui/tag-input'
import { CustomSelect } from '../ui/custom-select'
import { useEffect, useState } from 'react'

type MetaSectionProps = {
	delay?: number
	categories?: string[]
}

export function MetaSection({ delay = 0, categories = [] }: MetaSectionProps) {
	const { form, updateForm } = useWriteStore()
	const [passwordGroups, setPasswordGroups] = useState<string[]>([])
	useEffect(() => {
		fetch('/daily-password.json', { cache: 'no-store' })
			.then(response => response.json())
			.then(data => setPasswordGroups(data.groups || []))
			.catch(() => {})
	}, [])
	// 如果当前选中的分类不在预设列表中，且有值，则默认为自定义模式
	const [isCustomCategory, setIsCustomCategory] = useState(() => {
		if (form.categories.length === 0) return false
		// 如果有多个分类，或者是单个分类但不在预设列表中，则为自定义模式
		return form.categories.length > 1 || (form.categories.length === 1 && !categories.includes(form.categories[0]))
	})

	const categoryOptions = [
		...categories.map(c => ({ value: c, label: c })),
		{ value: '__custom__', label: '+ 自定义/多选...' }
	]

	return (
		<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }} className='card bg-base-100 border border-base-200 shadow-sm p-4 relative'>
			<h2 className='text-sm font-bold text-primary'>元信息</h2>

			<div className='mt-3 space-y-3'>
				<textarea
					placeholder='为这篇文章写一段简短摘要'
					rows={3}
					className='textarea textarea-bordered w-full bg-base-100 focus:textarea-primary resize-none text-sm'
					value={form.summary}
					onChange={e => updateForm({ summary: e.target.value })}
				/>

				<div className='flex items-center gap-2 rounded-xl border border-base-200 bg-base-200/40 px-3 py-2.5'>
					<input
						type='checkbox'
						id='pinned-check'
						checked={form.badge === 'Pin'}
						onChange={e => updateForm({ badge: e.target.checked ? 'Pin' : '' })}
						className='checkbox checkbox-primary checkbox-sm'
					/>
					<label htmlFor='pinned-check' className='cursor-pointer text-sm font-medium text-base-content/80 select-none'>
						置顶文章
					</label>
				</div>

				<div className="text-xs font-medium text-base-content/70">文章密码</div>
				<input
					type="password"
					autoComplete="new-password"
					placeholder="留空表示不加密"
					className="input input-bordered w-full bg-base-100 focus:input-primary text-sm"
					value={form.password || ''}
					onChange={e => updateForm({ password: e.target.value })}
				/>
				<input
					type="text"
					list="password-groups"
					placeholder="密码组（可选，如：会员文章）"
					className="input input-bordered w-full bg-base-100 focus:input-primary text-sm"
					value={form.passwordGroup || ''}
					onChange={e => updateForm({ passwordGroup: e.target.value })}
				/>
				<datalist id="password-groups">
					{passwordGroups.map(group => <option key={group} value={group} />)}
				</datalist>
				<p className="text-[11px] leading-relaxed text-base-content/55">
					填写相同密码组的文章会共用一个每日密码；不填密码组时将以文章标题显示独立密码。密码每天北京时间 00:00 后自动轮换，读者解锁后 12 小时内无需重复输入。
				</p>

				<div className="text-xs font-medium text-base-content/70">文件格式</div>
				<CustomSelect
					value={form.fileFormat}
					onChange={value => updateForm({ fileFormat: value as 'md' | 'mdx' })}
					options={[
						{ value: 'md', label: 'Markdown (.md)' },
						{ value: 'mdx', label: 'MDX (.mdx)' }
					]}
					placeholder="选择文件格式"
				/>

				<div className="text-xs font-medium text-base-content/70">标签</div>
				<TagInput tags={form.tags} onChange={tags => updateForm({ tags })} />

				<div className="text-xs font-medium text-base-content/70">分类</div>
				{categories.length > 0 && !isCustomCategory ? (
					<CustomSelect
						value={categories.includes(form.categories[0]) ? form.categories[0] : ''}
						onChange={val => {
							if (val === '__custom__') {
								setIsCustomCategory(true)
							} else {
								updateForm({ categories: [val] })
							}
						}}
						options={categoryOptions}
						placeholder="选择分类..."
					/>
				) : (
					<div className="space-y-1">
						<TagInput tags={form.categories} onChange={categories => updateForm({ categories })} />
						{categories.length > 0 && (
							<button
								onClick={() => setIsCustomCategory(false)}
								className="text-xs text-primary hover:underline"
							>
								返回选择已有分类
							</button>
						)}
					</div>
				)}

				<input
					type='datetime-local'
					placeholder='日期'
					className='input input-bordered w-full bg-base-100 focus:input-primary text-sm'
					value={form.date}
					onChange={e => {
						updateForm({ date: e.target.value })
					}}
				/>

				<div className='flex items-center gap-2 pt-1'>
					<input
						type='checkbox'
						id='hidden-check'
						checked={form.hidden || false}
						onChange={e => updateForm({ hidden: e.target.checked })}
						className='checkbox checkbox-primary checkbox-sm'
					/>
					<label htmlFor='hidden-check' className='cursor-pointer text-sm text-base-content/80 select-none'>
						隐藏此文章（草稿）
					</label>
				</div>
			</div>
		</motion.div>
	)
}
