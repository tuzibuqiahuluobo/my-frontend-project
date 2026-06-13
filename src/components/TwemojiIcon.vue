<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import twemoji from 'twemoji'

const props = defineProps({
  emoji: {
    type: String,
    required: true
  }
})

const emojiRef = ref(null)

const renderTwemoji = async () => {
  await nextTick()
  if (!emojiRef.value) {
    return
  }

  // twemoji.parse 会把节点里的 emoji 文本换成官方图片，但不会执行用户输入的 HTML，更适合放在组件里复用。
  twemoji.parse(emojiRef.value, {
    folder: 'svg',
    ext: '.svg'
  })
}

onMounted(renderTwemoji)

watch(() => props.emoji, renderTwemoji)
</script>

<template>
  <span ref="emojiRef" class="twemoji-icon">{{ emoji }}</span>
</template>

<style scoped>
.twemoji-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.twemoji-icon :deep(img.emoji) {
  width: 1.25em;
  height: 1.25em;
  display: block;
}
</style>
