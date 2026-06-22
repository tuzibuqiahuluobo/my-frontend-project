export const STORAGE_PACKS_KEY = 'sunshine-bilibili-emote-packs'
export const STORAGE_ACTIVE_KEY = 'sunshine-active-bilibili-emote-pack'

const BILIEMOJI_REPO_SOURCE = 'https://github.com/lrhtony/BiliEmoji/tree/master'
const SMALL_YELLOW_SOURCE = `${BILIEMOJI_REPO_SOURCE}/src/%E5%B0%8F%E9%BB%84%E8%84%B8`
const SMALL_YELLOW_INFO_URL = 'https://cdn.jsdelivr.net/gh/lrhtony/BiliEmoji@master/src/%E5%B0%8F%E9%BB%84%E8%84%B8/info.json'
const SMALL_YELLOW_IMAGE_BASE_URL = 'https://emoji.shojo.cn/bili/src/%E5%B0%8F%E9%BB%84%E8%84%B8/'

export const DEFAULT_BILIEMOJI_PACK = {
  id: 'biliemoji-xiaohuanglian',
  name: '小黄脸',
  source: SMALL_YELLOW_SOURCE,
  builtin: true,
  emotes: []
}

let defaultPackCache = null
let defaultPackPromise = null

export const emoteNameFromFile = (fileName) => {
  return String(fileName || '').replace(/\.[^.]+$/, '').trim()
}

const imageUrlFromFile = (fileName) => {
  // 文件名里有中文、空格和感叹号，单独编码文件名可以避免浏览器请求地址时出现 404。
  return `${SMALL_YELLOW_IMAGE_BASE_URL}${encodeURIComponent(fileName)}`
}

const normalizeInfoFiles = (payload) => {
  const imageType = payload?.type || 'png'
  // BiliEmoji 的 info.json 用 items 保存表情名、type 保存后缀，这比 README 里的展示 HTML 更适合程序读取。
  return (payload?.items || [])
    .filter(name => typeof name === 'string' && name.trim())
    .map(name => `${name}.${imageType}`)
}

export const buildPackFromFiles = (packName, files, options = {}) => {
  return {
    id: options.id || `local-${packName}-${Date.now()}`,
    name: packName,
    source: options.source || '本地导入',
    builtin: Boolean(options.builtin),
    emotes: files.map(fileName => {
      const name = emoteNameFromFile(fileName)
      return {
        name,
        code: `[${name}]`,
        fileName,
        src: options.imageBaseUrl ? `${options.imageBaseUrl}${encodeURIComponent(fileName)}` : ''
      }
    })
  }
}

export const loadDefaultBiliEmojiPack = async () => {
  if (defaultPackCache) return defaultPackCache
  if (defaultPackPromise) return defaultPackPromise

  defaultPackPromise = fetch(SMALL_YELLOW_INFO_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error('默认表情包信息加载失败')
      }
      return response.json()
    })
    .then(payload => {
      const files = normalizeInfoFiles(payload)
      // 默认“小黄脸”不写死在代码里，而是跟随仓库 info.json 生成，仓库新增表情后前端也能自动吃到。
      defaultPackCache = {
        ...DEFAULT_BILIEMOJI_PACK,
        emotes: files.map(fileName => {
          const name = emoteNameFromFile(fileName)
          return {
            name,
            code: `[${name}]`,
            fileName,
            src: imageUrlFromFile(fileName)
          }
        })
      }
      return defaultPackCache
    })
    .catch(error => {
      defaultPackPromise = null
      throw error
    })

  return defaultPackPromise
}

export const loadCustomBiliEmojiPacks = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PACKS_KEY) || '[]')
  } catch (error) {
    localStorage.removeItem(STORAGE_PACKS_KEY)
    return []
  }
}

export const saveCustomBiliEmojiPacks = (packs, activePackId) => {
  const customPacks = packs.filter(pack => !pack.builtin)
  localStorage.setItem(STORAGE_PACKS_KEY, JSON.stringify(customPacks))
  localStorage.setItem(STORAGE_ACTIVE_KEY, activePackId)
  window.dispatchEvent(new CustomEvent('sunshine-emote-packs-updated'))
}
