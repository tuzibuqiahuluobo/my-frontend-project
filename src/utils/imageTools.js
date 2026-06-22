export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const POST_GIF_MAX_BYTES = 2 * 1024 * 1024
export const POST_SOURCE_MAX_BYTES = 8 * 1024 * 1024
export const POST_DATA_URL_MAX_LENGTH = 2.75 * 1024 * 1024
export const POST_MAX_IMAGES = 9
export const BACKGROUND_SOURCE_MAX_BYTES = 20 * 1024 * 1024

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export const isGifFile = (file) => file?.type === 'image/gif'

export const readFileAsDataUrl = (file) => {
  // FileReader 是浏览器读取本地文件的标准方式，转成 dataURL 后就能直接预览和提交给后端。
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target.result)
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择一次'))
    reader.readAsDataURL(file)
  })
}

export const assertImageFile = (file, maxBytes, sceneName = '图片') => {
  if (!file) {
    throw new Error(`请先选择${sceneName}`)
  }
  if (!acceptedImageTypes.includes(file.type)) {
    throw new Error(`${sceneName}只支持 JPG、PNG、WEBP 或 GIF 格式`)
  }
  if (file.size > maxBytes) {
    throw new Error(`${sceneName}不能超过 ${Math.floor(maxBytes / 1024 / 1024)}MB`)
  }
}

const loadImage = (url) => {
  // canvas 处理前必须等图片加载完成，否则拿不到真实宽高。
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，请换一张图片试试'))
    image.src = url
  })
}

const canvasToBlob = (canvas, type, quality) => {
  // toBlob 比 toDataURL 更省内存，图片较大时页面不会那么容易卡住。
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片处理失败，请换一张图片试试'))
    }, type, quality)
  })
}

export const compressBackgroundImageFile = async (file) => {
  assertImageFile(file, BACKGROUND_SOURCE_MAX_BYTES, '背景图')
  if (isGifFile(file)) {
    throw new Error('背景图暂不支持 GIF，请选择 JPG、PNG、WEBP 图片')
  }

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const maxWidth = 1920
    const maxHeight = 1080
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    // 背景图通常会铺满大面积区域，缩放时打开高质量插值可以减少边缘锯齿和糊块。
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, width, height)

    // 持久化前保存成 WebP Blob，既避免 Base64 膨胀，也能明显减少上传和数据库压力。
    return await canvasToBlob(canvas, 'image/webp', 0.9)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export const compressPostImage = async (file) => {
  assertImageFile(file, POST_SOURCE_MAX_BYTES, '帖子图片')

  if (isGifFile(file)) {
    // GIF 不能用 canvas 压缩，否则会丢失动画，所以保留原图并使用更严格的大小限制。
    assertImageFile(file, POST_GIF_MAX_BYTES, 'GIF 动图')
    return readFileAsDataUrl(file)
  }

  if (file.size <= POST_DATA_URL_MAX_LENGTH * 0.72) {
    // 小图直接保留原文件，不经过 canvas 二次编码；这是最接近无损的方式，也能避免清晰度被压坏。
    return readFileAsDataUrl(file)
  }

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const maxSide = 1920
    const scale = Math.min(1, maxSide / image.width, maxSide / image.height)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    // 大图必须缩放时使用高质量插值，优先保证观感清晰，再控制最终体积。
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, width, height)

    // WebP 使用更高质量值，减少帖子和评论图片出现明显糊感；体积仍由后面的大小校验兜底。
    const blob = await canvasToBlob(canvas, 'image/webp', 0.92)
    const dataUrl = await readFileAsDataUrl(blob)
    if (dataUrl.length > POST_DATA_URL_MAX_LENGTH) {
      throw new Error('图片处理后仍然偏大，请换一张更小的图片')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export const compressPostImages = async (files, existingCount = 0) => {
  const imageFiles = Array.from(files || [])
  if (existingCount + imageFiles.length > POST_MAX_IMAGES) {
    throw new Error(`帖子图片最多上传 ${POST_MAX_IMAGES} 张`)
  }

  const results = []
  for (const file of imageFiles) {
    // 多图按顺序逐张处理，预览顺序就和用户选择文件时保持一致。
    results.push(await compressPostImage(file))
  }
  return results
}
