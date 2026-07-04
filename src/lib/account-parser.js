const labels = ['用户名', '密码', '邮箱', '邮箱密码', '2FA']

const removeLabel = (value, label) => value.trim().replace(new RegExp(`^${label}[：:]?`), '')

export function parseAccount(value) {
  const parts = value.trim().replace(/-{5,}/g, '----').replace(/^(----)+|(----)+$/g, '').split('----')
  if (parts.length !== 8) throw new Error(`需要 8 段，当前得到 ${parts.length} 段。`)
  if (parts.some(part => !part.trim())) throw new Error('字段不能为空。')

  return [parts[0], parts[1], parts[2], parts[3], parts[6]]
    .map((part, index) => `${labels[index]}：${removeLabel(part, labels[index])}`)
    .join('----')
}
