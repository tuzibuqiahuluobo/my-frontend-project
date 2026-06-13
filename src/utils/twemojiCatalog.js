import { parse as parseTwemoji } from 'twemoji-parser'

const emojiRanges = [
  [0x1F300, 0x1F5FF],
  [0x1F600, 0x1F64F],
  [0x1F680, 0x1F6FF],
  [0x1F900, 0x1F9FF],
  [0x1FA70, 0x1FAFF],
  [0x2600, 0x27BF]
]

const toSupportedEmoji = (codePoint) => {
  const emoji = String.fromCodePoint(codePoint)
  const parsed = parseTwemoji(emoji)

  if (parsed.length === 1 && parsed[0].text === emoji) {
    return emoji
  }

  const emojiWithVariant = `${emoji}\uFE0F`
  const parsedWithVariant = parseTwemoji(emojiWithVariant)
  if (parsedWithVariant.length === 1 && parsedWithVariant[0].text === emojiWithVariant) {
    return emojiWithVariant
  }

  return null
}

export const buildTwemojiCatalog = () => {
  const result = []
  const seen = new Set()

  emojiRanges.forEach(([start, end]) => {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      // 这里不手写具体表情，而是生成 Unicode 候选，再交给 twemoji-parser 判断 Twemoji 是否支持。
      const emoji = toSupportedEmoji(codePoint)
      if (emoji && !seen.has(emoji)) {
        seen.add(emoji)
        result.push(emoji)
      }
    }
  })

  return result
}

export const findTwemojiByCodePoint = (codePoint) => {
  // 按钮上的默认图标只需要一个稳定笑脸，所以用 Unicode 编号生成，避免在页面里直接写死表情字符。
  return toSupportedEmoji(codePoint) || ''
}
