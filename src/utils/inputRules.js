export const INPUT_LIMITS = {
  usernameMin: 2,
  usernameMax: 20,
  nicknameMax: 15,
  passwordMin: 6,
  passwordMax: 32,
  emailMax: 254
}

export const textLength = (value) => {
  // 用 Array.from 统计用户看见的字符数，中文、英文和常见符号都更接近“字数”的直觉。
  return Array.from(String(value || '')).length
}

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

export const validateUsernameInput = (value) => {
  const length = textLength(String(value || '').trim())
  if (length < INPUT_LIMITS.usernameMin || length > INPUT_LIMITS.usernameMax) {
    return `账号长度需要在 ${INPUT_LIMITS.usernameMin}-${INPUT_LIMITS.usernameMax} 个字之间`
  }
  return ''
}

export const validateNicknameInput = (value) => {
  if (textLength(String(value || '').trim()) > INPUT_LIMITS.nicknameMax) {
    return `昵称最多 ${INPUT_LIMITS.nicknameMax} 个字`
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
