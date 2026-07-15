import assert from 'node:assert/strict'
import { parseAccount } from '../src/lib/account-parser.js'

assert.equal(
  parseAccount('SilveiraHelder----lcLWq7VsAkRS----LeviHawkins5221@hotmail.com----Wcqnzanod----ALXZJNRGNUDEONXM----02bfd58f7eb9e16d687ec5c742bbc6a0a79dd817'),
  '用户名：SilveiraHelder----密码：lcLWq7VsAkRS----邮箱：LeviHawkins5221@hotmail.com----邮箱密码：Wcqnzanod----2FA：ALXZJNRGNUDEONXM',
)
assert.throws(() => parseAccount('user----pass'), /需要 6 段/)
console.log('account parser checks passed')
