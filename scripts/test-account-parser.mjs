import assert from 'node:assert/strict'
import { parseAccount } from '../src/lib/account-parser.js'

assert.equal(
  parseAccount('user----pass----mail@example.com----mailpass----code1----code2----secret----hint'),
  '用户名：user----密码：pass----邮箱：mail@example.com----邮箱密码：mailpass----2FA：secret',
)
assert.throws(() => parseAccount('user----pass'), /需要 8 段/)
console.log('account parser checks passed')
