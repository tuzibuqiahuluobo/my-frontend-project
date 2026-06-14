<script setup>
import { computed } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const visibleImages = computed(() => {
  // 后端最多返回 9 张，这里再截一次是为了让组件自己也有边界保护。
  return props.images.filter(Boolean).slice(0, 9)
})
</script>

<template>
  <div
    v-if="visibleImages.length"
    class="post-image-grid"
    :class="[`image-count-${visibleImages.length}`, { compact }]"
  >
    <el-image
      v-for="(image, index) in visibleImages"
      :key="`${image.slice(0, 30)}-${index}`"
      class="grid-image"
      :src="image"
      :preview-src-list="visibleImages"
      :initial-index="index"
      fit="cover"
      loading="lazy"
      hide-on-click-modal
      preview-teleported
    />
  </div>
</template>

<style scoped>
.post-image-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  margin: 10px 0 15px;
}

.post-image-grid.image-count-1 {
  grid-template-columns: minmax(0, 1fr);
  max-width: 420px;
}

.post-image-grid.image-count-2,
.post-image-grid.image-count-4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 520px;
}

.grid-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
  cursor: zoom-in;
}

.compact {
  gap: 4px;
  margin-bottom: 10px;
}

.compact .grid-image {
  border-radius: 6px;
}
</style>
