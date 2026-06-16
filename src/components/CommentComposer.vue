<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { apiRequest } from '../api'
import TwemojiIcon from './TwemojiIcon.vue'
import { IMAGE_ACCEPT, POST_MAX_IMAGES, compressPostImages } from '../utils/imageTools'
import { buildTwemojiCatalog, findTwemojiByCodePoint } from '../utils/twemojiCatalog'

const props = defineProps({
  postId: {
    type: Number,
    required: true
  },
  parentComment: {
    type: Object,
    default: null
  },
  placeholder: {
    type: String,
    default: '善语结善缘，恶言伤人心...'
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['created', 'cancel-reply'])

const content = ref('')
const images = ref([])
const imageInputRef = ref(null)
const isSubmitting = ref(false)
const isProcessingImage = ref(false)
const emojiPageSize = 40
const emojiPage = ref(1)
// 新增：评论区和发帖区使用同一个 Twemoji 目录，避免两边表情不一致。
const emojiList = buildTwemojiCatalog()
const emojiButtonIcon = findTwemojiByCodePoint(0x1F642)

const emojiPageCount = computed(() => Math.ceil(emojiList.length / emojiPageSize))
const pagedEmojiList = computed(() => {
  const start = (emojiPage.value - 1) * emojiPageSize
  return emojiList.slice(start, start + emojiPageSize)
})
const replyName = computed(() => props.parentComment?.nickname || props.parentComment?.username || '')

const addEmoji = (emoji) => {
  // 新增：表情直接追加到评论末尾，初学阶段最容易理解，也不会破坏用户已经写好的文字。
  content.value += emoji
}

const triggerImageUpload = () => {
  imageInputRef.value?.click()
}

const handleImageFiles = async (files) => {
  const imageFiles = Array.from(files || []).filter(file => file.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  isProcessingImage.value = true
  try {
    // 新增：评论图片沿用帖子图片压缩逻辑，减少请求体积，线上加载也会更快。
    const compressedImages = await compressPostImages(imageFiles, images.value.length)
    images.value = [...images.value, ...compressedImages]
    ElMessage.success(`已添加 ${compressedImages.length} 张图片`)
  } catch (error) {
    ElMessage.error(error.message || '图片处理失败，请重新选择')
  } finally {
    isProcessingImage.value = false
  }
}

const onImageSelected = (event) => {
  handleImageFiles(event.target.files)
  event.target.value = ''
}

const handlePaste = (event) => {
  const items = Array.from(event.clipboardData?.items || [])
  const imageItems = items.filter(item => item.type.startsWith('image/'))
  if (imageItems.length === 0) return

  // 新增：粘贴图片时阻止文件名进入输入框，只把真正的图片加入预览。
  event.preventDefault()
  handleImageFiles(imageItems.map(item => item.getAsFile()))
}

const removeImage = (index) => {
  images.value = images.value.filter((_, imageIndex) => imageIndex !== index)
}

const resetComposer = () => {
  content.value = ''
  images.value = []
}

const submitComment = async () => {
  const text = content.value.trim()
  if (!text && images.value.length === 0) {
    ElMessage.warning('评论内容或图片至少要有一个')
    return
  }

  isSubmitting.value = true
  try {
    const data = await apiRequest('/api/create-comment', {
      method: 'POST',
      body: JSON.stringify({
        post_id: props.postId,
        parent_id: props.parentComment?.id || 0,
        content: text,
        images: images.value
      })
    })
    ElMessage.success(data.message)
    resetComposer()
    emit('created', data.comment)
  } catch (error) {
    ElMessage.error(error.message || '评论发送失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="comment-composer" :class="{ compact }" @paste.capture="handlePaste">
    <div v-if="parentComment" class="reply-target">
      <span>回复 @{{ replyName }}</span>
      <button type="button" @click="emit('cancel-reply')">取消</button>
    </div>

    <el-input
      v-model="content"
      type="textarea"
      :autosize="{ minRows: compact ? 1 : 2, maxRows: 4 }"
      :placeholder="parentComment ? `回复 @${replyName}` : placeholder"
      @keyup.ctrl.enter="submitComment"
    />

    <div v-if="images.length || isProcessingImage" class="comment-image-preview-grid">
      <el-skeleton v-if="isProcessingImage" :rows="1" animated />
      <template v-else>
        <div v-for="(image, index) in images" :key="`${image.slice(0, 30)}-${index}`" class="comment-preview-cell">
          <img :src="image" alt="待发送评论图片预览" />
          <button type="button" @click="removeImage(index)">移除</button>
        </div>
      </template>
    </div>

    <div class="comment-composer-actions">
      <div class="comment-tools">
        <el-popover placement="bottom-start" trigger="click" width="340">
          <template #reference>
            <button class="comment-tool-trigger" type="button" title="添加表情">
              <TwemojiIcon :emoji="emojiButtonIcon" />
            </button>
          </template>
          <div class="emoji-panel">
            <button
              v-for="emoji in pagedEmojiList"
              :key="emoji"
              class="emoji-item"
              type="button"
              @click="addEmoji(emoji)"
            >
              <TwemojiIcon :emoji="emoji" />
            </button>
          </div>
          <div class="emoji-pagination">
            <el-pagination
              v-model:current-page="emojiPage"
              size="small"
              layout="prev, pager, next"
              :page-size="emojiPageSize"
              :total="emojiList.length"
              :pager-count="5"
            />
            <span class="emoji-page-text">{{ emojiPage }} / {{ emojiPageCount }}</span>
          </div>
        </el-popover>

        <button
          class="comment-tool-trigger image-trigger"
          type="button"
          title="添加图片"
          :disabled="isProcessingImage || images.length >= POST_MAX_IMAGES"
          @click="triggerImageUpload"
        >
          <el-icon><Picture /></el-icon>
        </button>
        <span class="image-count-text">{{ images.length }}/{{ POST_MAX_IMAGES }}</span>
        <input ref="imageInputRef" type="file" :accept="IMAGE_ACCEPT" multiple hidden @change="onImageSelected">
      </div>

      <el-button
        type="primary"
        round
        color="#38bdf8"
        :loading="isSubmitting || isProcessingImage"
        @click="submitComment"
      >
        {{ parentComment ? '回复' : '发送' }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.comment-composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reply-target {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  border-radius: 8px;
  background: #ecfeff;
  color: #0891b2;
  font-size: 12px;
}

.reply-target button {
  border: none;
  background: transparent;
  color: #0284c7;
  cursor: pointer;
}

.comment-composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.comment-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-tool-trigger {
  width: 34px;
  height: 34px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.comment-tool-trigger:hover:not(:disabled) {
  border-color: #38bdf8;
  box-shadow: 0 3px 10px rgba(56, 189, 248, 0.2);
  transform: translateY(-1px);
}

.comment-tool-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.image-trigger {
  color: #38bdf8;
}

.image-count-text,
.emoji-page-text {
  color: #909399;
  font-size: 12px;
}

.emoji-panel {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.emoji-item {
  border: none;
  background: #f5f7fa;
  border-radius: 10px;
  cursor: pointer;
  font-size: 21px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, transform 0.15s;
}

.emoji-item:hover {
  background: #e0f2fe;
  transform: scale(1.08);
}

.emoji-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.comment-image-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  width: min(320px, 100%);
}

.comment-preview-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.comment-preview-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.comment-preview-cell button {
  position: absolute;
  top: 6px;
  right: 6px;
  border: none;
  border-radius: 999px;
  padding: 3px 8px;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
  font-size: 12px;
}

.compact .comment-composer-actions {
  align-items: flex-start;
}

@media (max-width: 640px) {
  .comment-composer-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
