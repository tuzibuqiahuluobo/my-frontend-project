export const INPUT_LIMITS = {
  usernameMin: 3,
  usernameMax: 15,
  nicknameMax: 15,
  passwordMin: 8,
  passwordMax: 32,
  emailMax: 254
}

const sensitiveWords = [
  'admin', 'administrator', 'root', 'system', 'official', 'sunshine官方',
  '管理员', '超级管理员', '官方', '客服', '站长', '版主',
  '傻逼', '垃圾', '操', '妈的', 'fuck', 'shit',
  '赌博', '博彩', '诈骗', '外挂', '代刷', '色情', '约炮', '毒品'
]

const passwordSpecialChars = '！!@#￥%*&.'
const passwordSpecialCharsText = '！@#￥%*&.'

export const textLength = (value) => {
  // 用 Array.from 统计用户看见的字符数，中文、英文和常见符号都更接近“字数”的直觉。
  return Array.from(String(value || '')).length
}

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const hasSensitiveWord = (value) => {
  // 统一转小写后检查，避免 Admin / ADMIN 绕过敏感词限制。
  const normalized = String(value || '').trim().toLowerCase()
  return sensitiveWords.some(word => normalized.includes(word.toLowerCase()))
}

const validateNoSensitiveWord = (label, value) => {
  if (hasSensitiveWord(value)) {
    return `${label}包含不适合使用的词，请换一个更友好的内容`
  }
  return ''
}

export const validateUsernameInput = (value) => {
  const username = String(value || '').trim()
  const length = textLength(username)
  if (length < INPUT_LIMITS.usernameMin || length > INPUT_LIMITS.usernameMax) {
    return `账号长度需要在 ${INPUT_LIMITS.usernameMin}-${INPUT_LIMITS.usernameMax} 个字之间`
  }
  if (!/^[A-Za-z]/.test(username)) {
    return '账号必须以英文字母开头'
  }
  const sensitiveMessage = validateNoSensitiveWord('账号', username)
  if (sensitiveMessage) {
    return sensitiveMessage
  }
  return ''
}

export const validateNicknameInput = (value) => {
  const nickname = String(value || '').trim()
  if (textLength(nickname) > INPUT_LIMITS.nicknameMax) {
    return `昵称最多 ${INPUT_LIMITS.nicknameMax} 个字`
  }
  const sensitiveMessage = validateNoSensitiveWord('昵称', nickname)
  if (sensitiveMessage) {
    return sensitiveMessage
  }
  return ''
}

export const validateSignatureInput = (value) => {
  const sensitiveMessage = validateNoSensitiveWord('个性签名', value)
  if (sensitiveMessage) {
    return sensitiveMessage
  }
  return ''
}

export const validatePasswordInput = (value, { allowEmpty = false } = {}) => {
  const password = String(value || '').trim()
  if (allowEmpty && password === '') {
    return ''
  }
  const length = textLength(password)
  if (length < INPUT_LIMITS.passwordMin || length > INPUT_LIMITS.passwordMax) {
    return `密码长度需要在 ${INPUT_LIMITS.passwordMin}-${INPUT_LIMITS.passwordMax} 个字之间`
  }
  if (/\s/.test(password)) {
    return '密码不能包含空格或换行'
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return '密码需要同时包含大写字母、小写字母和数字'
  }
  for (const char of Array.from(password)) {
    if (/[A-Za-z0-9]/.test(char)) {
      continue
    }
    if (!passwordSpecialChars.includes(char)) {
      return `密码特殊字符只能使用 ${passwordSpecialCharsText}`
    }
  }
  return ''
}

export const validateEmailInput = (value) => {
  const email = normalizeEmail(value)
  if (!email) {
    return '请先填写邮箱'
  }
  if (textLength(email) > INPUT_LIMITS.emailMax) {
    return `邮箱长度不能超过 ${INPUT_LIMITS.emailMax} 个字符`
  }
  // 前端先做基础格式检查，后端还会再检查一次，避免绕过页面直接请求接口。
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '邮箱格式不正确'
  }
  if (!email.endsWith('@qq.com') && !email.endsWith('@gmail.com')) {
    return '目前仅支持 QQ 或 Gmail 邮箱'
  }
  return ''
}
