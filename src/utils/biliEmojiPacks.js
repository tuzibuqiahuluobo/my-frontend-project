export const STORAGE_INSTALLED_PACK_IDS_KEY = 'sunshine-biliemoji-installed-pack-ids'
export const STORAGE_ACTIVE_KEY = 'sunshine-active-bilibili-emote-pack'

export const DEFAULT_PACK_ID = '小黄脸'
const DB_NAME = 'sunshine-biliemoji-cache'
const DB_VERSION = 1
const PACK_STORE = 'packs'
const IMAGE_STORE = 'images'
const REPO_TREE_URL = 'https://api.github.com/repos/lrhtony/BiliEmoji/git/trees/master?recursive=1'
const PACK_INFO_BASE_URL = 'https://cdn.jsdelivr.net/gh/lrhtony/BiliEmoji@master/src/'
const PACK_IMAGE_BASE_URL = 'https://emoji.shojo.cn/bili/src/'

// 这里用内存变量做一次性缓存，避免用户反复打开表情面板时重复请求 GitHub 的目录列表。
let repoPackListCache = null
let repoPackListPromise = null
const runtimeUrlMap = new Map()

export const emoteNameFromFile = (fileName) => {
  return String(fileName || '').replace(/\.[^.]+$/, '').trim()
}

const packIdToSource = (packId) => {
  return `https://github.com/lrhtony/BiliEmoji/tree/master/src/${encodeURIComponent(packId)}`
}

const iconUrlFromPack = (packId, iconName = 'icon', type = 'png') => {
  return `${PACK_IMAGE_BASE_URL}${encodeURIComponent(packId)}/${encodeURIComponent(`${iconName}.${type}`)}`
}

const imageUrlFromPack = (packId, fileName) => {
  return `${PACK_IMAGE_BASE_URL}${encodeURIComponent(packId)}/${encodeURIComponent(fileName)}`
}

const infoUrlFromPack = (packId) => {
  return `${PACK_INFO_BASE_URL}${encodeURIComponent(packId)}/info.json`
}

const installedPackIds = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_INSTALLED_PACK_IDS_KEY) || '[]')
    return Array.isArray(stored) && stored.length ? stored : [DEFAULT_PACK_ID]
  } catch (error) {
    return [DEFAULT_PACK_ID]
  }
}

const saveInstalledPackIds = (ids) => {
  const uniqueIds = Array.from(new Set([DEFAULT_PACK_ID, ...ids].filter(Boolean)))
  localStorage.setItem(STORAGE_INSTALLED_PACK_IDS_KEY, JSON.stringify(uniqueIds))
}

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    // 表情图片数量较多，不适合继续塞进 localStorage；IndexedDB 更适合保存 Blob 这类二进制文件。
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('表情缓存数据库打开失败'))
  })
}

const dbRequest = async (storeName, mode, action) => {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = action(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('表情缓存读取失败'))
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error || new Error('表情缓存事务失败'))
    }
  })
}

const putRecord = (storeName, record) => dbRequest(storeName, 'readwrite', store => store.put(record))
const getRecord = (storeName, key) => dbRequest(storeName, 'readonly', store => store.get(key))
const getAllRecords = (storeName) => dbRequest(storeName, 'readonly', store => store.getAll())

export const loadRepoBiliEmojiPacks = async () => {
  if (repoPackListCache) return repoPackListCache
  if (repoPackListPromise) return repoPackListPromise

  repoPackListPromise = fetch(REPO_TREE_URL)
    .then(response => {
      if (!response.ok) throw new Error('在线表情包列表加载失败')
      return response.json()
    })
    .then(payload => {
      const names = new Set()
      // GitHub 的 tree 接口能一次拿到仓库目录；只要目录里有 info.json，就认为它是一套表情包。
      ;(payload.tree || []).forEach(item => {
        const match = String(item.path || '').match(/^src\/([^/]+)\/info\.json$/)
        if (match) names.add(match[1])
      })
      repoPackListCache = Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
        .map(name => ({
          id: name,
          name,
          icon: iconUrlFromPack(name),
          source: packIdToSource(name)
        }))
      return repoPackListCache
    })
    .catch(error => {
      repoPackListPromise = null
      throw error
    })

  return repoPackListPromise
}

export const loadPackInfo = async (packId) => {
  const response = await fetch(infoUrlFromPack(packId))
  if (!response.ok) throw new Error(`${packId} 表情包信息加载失败`)
  const payload = await response.json()
  const type = payload.type || 'png'
  return {
    id: payload.name || packId,
    name: payload.name || packId,
    type,
    iconName: payload.icon || 'icon',
    items: (payload.items || []).filter(Boolean)
  }
}

const objectUrlFromImage = async (packId, fileName) => {
  const key = `${packId}/${fileName}`
  if (runtimeUrlMap.has(key)) return runtimeUrlMap.get(key)
  const record = await getRecord(IMAGE_STORE, key)
  if (!record?.blob) return imageUrlFromPack(packId, fileName)
  // Blob 不能直接写进 img 的 src，所以这里把本地缓存图片转换成浏览器临时地址。
  const url = URL.createObjectURL(record.blob)
  runtimeUrlMap.set(key, url)
  return url
}

const hydratePackImages = async (pack) => {
  const emotes = []
  for (const emote of pack.emotes || []) {
    emotes.push({
      ...emote,
      src: await objectUrlFromImage(pack.id, emote.fileName)
    })
  }
  return {
    ...pack,
    icon: pack.iconFileName ? await objectUrlFromImage(pack.id, pack.iconFileName) : pack.icon,
    emotes
  }
}

export const loadInstalledBiliEmojiPacks = async () => {
  const ids = installedPackIds()
  const records = await getAllRecords(PACK_STORE)
  const recordMap = new Map(records.map(record => [record.id, record]))
  const packs = []

  for (const id of ids) {
    const record = recordMap.get(id)
    if (record) {
      packs.push(await hydratePackImages(record))
    }
  }
  return packs
}

export const ensureDefaultBiliEmojiPack = async () => {
  const existing = await getRecord(PACK_STORE, DEFAULT_PACK_ID)
  if (existing) {
    saveInstalledPackIds(installedPackIds())
    return await hydratePackImages(existing)
  }
  return await downloadBiliEmojiPack(DEFAULT_PACK_ID)
}

export const downloadBiliEmojiPack = async (packId) => {
  const info = await loadPackInfo(packId)
  const files = info.items.map(name => `${name}.${info.type}`)
  const iconFileName = `${info.iconName}.${info.type}`
  const emotes = files.map(fileName => {
    const name = emoteNameFromFile(fileName)
    return {
      name,
      code: `[${name}]`,
      fileName
    }
  })

  // 下载时把真实图片 Blob 存进 IndexedDB；以后切换表情包时不用重复请求网络，也符合“下载完整表情包”的交互预期。
  const allFiles = Array.from(new Set([iconFileName, ...files]))
  for (const fileName of allFiles) {
    const response = await fetch(imageUrlFromPack(info.id, fileName))
    if (!response.ok) throw new Error(`${info.name} 的 ${fileName} 下载失败`)
    await putRecord(IMAGE_STORE, {
      key: `${info.id}/${fileName}`,
      packId: info.id,
      fileName,
      blob: await response.blob()
    })
  }

  const pack = {
    id: info.id,
    name: info.name,
    source: packIdToSource(info.id),
    builtin: info.id === DEFAULT_PACK_ID,
    iconFileName,
    emotes
  }
  await putRecord(PACK_STORE, pack)
  saveInstalledPackIds([...installedPackIds(), info.id])
  window.dispatchEvent(new CustomEvent('sunshine-emote-packs-updated'))
  return await hydratePackImages(pack)
}

export const saveActiveBiliEmojiPack = (packId) => {
  localStorage.setItem(STORAGE_ACTIVE_KEY, packId)
}

export const getActiveBiliEmojiPackId = () => {
  return localStorage.getItem(STORAGE_ACTIVE_KEY) || DEFAULT_PACK_ID
}

export const revokeBiliEmojiRuntimeUrls = () => {
  runtimeUrlMap.forEach(url => URL.revokeObjectURL(url))
  runtimeUrlMap.clear()
}
