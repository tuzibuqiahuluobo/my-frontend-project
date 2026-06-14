export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const POST_GIF_MAX_BYTES = 2 * 1024 * 1024
export const POST_SOURCE_MAX_BYTES = 8 * 1024 * 1024
export const POST_DATA_URL_MAX_LENGTH = 2 * 1024 * 1024

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export const isGifFile = (file) => file?.type === 'image/gif'

export const readFileAsDataUrl = (file) => {
  // FileReader 是浏览器读取本地文件的标准方式；转成 dataURL 后，后端可以像头像一样直接保存。
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
  // canvas 压缩前必须先把图片加载成 img，浏览器加载完成后才能拿到真实宽高。
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，请换一张图片试试'))
    image.src = url
  })
}

const canvasToBlob = (canvas, type, quality) => {
  // toBlob 比 toDataURL 更省内存；如果浏览器偶发返回空值，就给出明确提示。
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片压缩失败，请换一张图片试试'))
    }, type, quality)
  })
}

export const compressPostImage = async (file) => {
  assertImageFile(file, POST_SOURCE_MAX_BYTES, '帖子图片')

  if (isGifFile(file)) {
    // GIF 不能用 canvas 压缩，否则会丢失动画；这里保留原图，但用更严格的大小限制保护数据库。
    assertImageFile(file, POST_GIF_MAX_BYTES, 'GIF 动图')
    return readFileAsDataUrl(file)
  }

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const maxSide = 1280
    const scale = Math.min(1, maxSide / image.width, maxSide / image.height)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, width, height)

    // WebP 在同等清晰度下通常更小；如果用户浏览器不支持，后面的读取结果仍会走大小校验。
    const blob = await canvasToBlob(canvas, 'image/webp', 0.76)
    const dataUrl = await readFileAsDataUrl(blob)
    if (dataUrl.length > POST_DATA_URL_MAX_LENGTH) {
      throw new Error('图片压缩后仍然偏大，请换一张更小的图片')
    }
    return dataUrl
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
