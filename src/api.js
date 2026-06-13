const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const STORAGE_KEY = 'user'

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY)
}

export function isAdmin(user = getStoredUser()) {
  return Number(user?.role) === 2
}

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const user = getStoredUser()
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok || data.error) {
    const error = new Error(data.error || `请求失败 (${response.status})`)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

