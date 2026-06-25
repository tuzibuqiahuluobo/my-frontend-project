<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ensureDefaultBiliEmojiPack, loadInstalledBiliEmojiPacks } from '../utils/biliEmojiPacks'

const props = defineProps({
  text: {
    type: String,
    default: ''
  }
})

const emoteMap = ref({})

const mapPackEmotes = (nextMap, pack) => {
  ;(pack?.emotes || []).forEach(emote => {
    if (emote.code && emote.src) {
      nextMap[emote.code] = emote
    }
  })
}

const loadEmoteMap = async () => {
  const nextMap = {}
  try {
    // 先确保默认小黄脸已经下载，再把所有已安装表情包放进解析表。
    await ensureDefaultBiliEmojiPack()
    const packs = await loadInstalledBiliEmojiPacks()
    packs.forEach(pack => mapPackEmotes(nextMap, pack))
  } catch (error) {
    // 默认包加载失败时不要影响正文显示，保留原文本能让用户至少看到发送内容。
  }
  emoteMap.value = nextMap
}

const parts = computed(() => {
  // B 站表情以 [表情名] 保存；渲染时只替换已知表情，未知内容仍按普通文本显示。
  const result = []
  const pattern = /(\[[^\[\]\n]{1,30}\])/g
  let lastIndex = 0
  String(props.text || '').replace(pattern, (match, code, offset) => {
    if (offset > lastIndex) {
      result.push({ type: 'text', value: props.text.slice(lastIndex, offset) })
    }
    const emote = emoteMap.value[code]
    result.push(emote ? { type: 'emote', value: code, src: emote.src, name: emote.name } : { type: 'text', value: code })
    lastIndex = offset + code.length
    return match
  })
  if (lastIndex < String(props.text || '').length) {
    result.push({ type: 'text', value: props.text.slice(lastIndex) })
  }
  return result
})

onMounted(() => {
  loadEmoteMap()
  window.addEventListener('sunshine-emote-packs-updated', loadEmoteMap)
})

onUnmounted(() => {
  window.removeEventListener('sunshine-emote-packs-updated', loadEmoteMap)
})
</script>

<template>
  <span class="bilibili-emote-text">
    <template v-for="(part, index) in parts" :key="`${part.value}-${index}`">
      <img v-if="part.type === 'emote'" class="inline-emote" :src="part.src" :alt="part.name" :title="part.value" loading="lazy">
      <span v-else>{{ part.value }}</span>
    </template>
  </span>
</template>

<style scoped>
.bilibili-emote-text {
  white-space: pre-wrap;
}

.inline-emote {
  width: 1.8em;
  height: 1.8em;
  object-fit: contain;
  vertical-align: -0.45em;
  margin: 0 2px;
}
</style>
