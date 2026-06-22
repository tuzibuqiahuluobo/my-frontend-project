<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Star, StarFilled, Delete, Picture, Edit } from '@element-plus/icons-vue'
import { apiRequest, getStoredUser, isAdmin } from '../api'
import PostImageGrid from '../components/PostImageGrid.vue'
import CommentComposer from '../components/CommentComposer.vue'
import BilibiliEmotePicker from '../components/BilibiliEmotePicker.vue'
import BilibiliEmoteText from '../components/BilibiliEmoteText.vue'
import { IMAGE_ACCEPT, POST_MAX_IMAGES, compressPostImages } from '../utils/imageTools'

const router = useRouter()
const route = useRoute()
const posts = ref([])
const loading = ref(true)
const topics = ref([])
const selectedTopicId = ref(null)
const topicsLoading = ref(false)
const postTags = ref([])
const tagInput = ref('')
const isComposerExpanded = ref(false)
const composerRef = ref(null)
const POST_MAX_TAGS = 5
const POST_TAG_MAX_LENGTH = 12

// 【新增】发帖相关的变量
const currentUser = ref({ uid: null, username: '匿名', nickname: '', avatar: '', role: 0, token: '' })
const newPostTitle = ref('')
const newPostContent = ref('')
const postImages = ref([])
const postImageInputRef = ref(null)
const isSubmitting = ref(false)
const isProcessingImage = ref(false)
const editingPostId = ref(null)
const currentTopic = computed(() => {
  return topics.value.find(topic => Number(topic.id) === Number(selectedTopicId.value)) || null
})
const defaultTopicId = computed(() => {
  return topics.value.find(topic => topic.name === '综合社区')?.id || topics.value[0]?.id || null
})
const shouldShowComposerTools = computed(() => {
  return isComposerExpanded.value || Boolean(editingPostId.value) || postImages.value.length > 0 || postTags.value.length > 0
})
const hasComposerDraft = computed(() => {
  // 新增：有草稿或正在处理图片时不自动收起，避免用户误点空白后找不到正在编辑的上下文。
  return Boolean(
    editingPostId.value ||
    newPostTitle.value.trim() ||
    newPostContent.value.trim() ||
    tagInput.value.trim() ||
    postTags.value.length ||
    postImages.value.length ||
    isProcessingImage.value ||
    isSubmitting.value
  )
})

// 新增：记录每个帖子当前正在回复哪条评论，键名是 postId，值是被回复的评论对象。
const replyTargets = ref({})

const loadTopics = async () => {
  topicsLoading.value = true
  try {
    // 新增：话题列表由后端控制，前端只展示已通过的话题，避免用户发到停用社区。
    const data = await apiRequest('/api/topics')
    topics.value = data
    const routeTopicId = Number(route.query.topic_id)
    if (routeTopicId && data.some(topic => Number(topic.id) === routeTopicId)) {
      selectedTopicId.value = routeTopicId
    }
    if (!selectedTopicId.value && data.length > 0) {
      selectedTopicId.value = data[0].id
    }
  } catch (error) {
    ElMessage.error(error.message || '话题列表读取失败')
  } finally {
    topicsLoading.value = false
  }
}

const switchTopic = async (topicId) => {
  selectedTopicId.value = topicId
  router.replace({ path: '/main/community', query: { topic_id: topicId } })
  resetPostForm()
  await loadPosts()
}

const expandComposer = () => {
  isComposerExpanded.value = true
}

const collapseComposerIfIdle = (event) => {
  // 新增：Element Plus 的下拉框和表情面板会挂到页面外层，点击它们时不应该被当成“空白处”。
  if (event.target?.closest?.('.el-popper')) return
  // 新增：只有空草稿才自动收起；已经输入内容时保留展开，保护用户正在写的东西。
  if (!isComposerExpanded.value || hasComposerDraft.value) return
  if (composerRef.value && !composerRef.value.contains(event.target)) {
    isComposerExpanded.value = false
  }
}

const topicToneClass = (topicLike) => {
  const id = Number(topicLike?.id || topicLike?.topic_id || 0)
  return `tone-${Math.abs(id) % 6}`
}

const isDefaultTopic = (postOrTopic) => {
  return postOrTopic?.name === '综合社区' || postOrTopic?.topic_name === '综合社区' || Number(postOrTopic?.topic_id) === Number(defaultTopicId.value)
}

const getPostTags = (post) => {
  return Array.isArray(post.tags) ? post.tags.filter(Boolean) : []
}

const addPostTag = () => {
  const tag = tagInput.value.trim().replace(/^#/, '')
  if (!tag) return
  if (tag.length > POST_TAG_MAX_LENGTH) {
    ElMessage.warning(`标签最多 ${POST_TAG_MAX_LENGTH} 个字`)
    return
  }
  if (postTags.value.some(item => item.toLowerCase() === tag.toLowerCase())) {
    tagInput.value = ''
    return
  }
  if (postTags.value.length >= POST_MAX_TAGS) {
    ElMessage.warning(`最多添加 ${POST_MAX_TAGS} 个标签`)
    return
  }
  postTags.value.push(tag)
  tagInput.value = ''
}

const removePostTag = (index) => {
  postTags.value = postTags.value.filter((_, tagIndex) => tagIndex !== index)
}

// 【优化】把获取帖子的逻辑单独抽成一个函数，方便发帖后瞬间刷新
const loadPosts = async () => {
  try {
    //刷新前：把当前帖子的展开状态存进字典里
    const stateMap = {}
    const expandMap = {}
    posts.value.forEach(post => {
      stateMap[post.id] = post.showComments
      expandMap[post.id] = post.isExpanded
    })
    // 如果用户已登录，apiRequest 会自动带上 token，后端会据此判断哪些帖子已收藏
    const path = selectedTopicId.value ? `/api/posts?topic_id=${selectedTopicId.value}` : '/api/posts'
    const data = await apiRequest(path)
    // 刷新后：去字典里核对，之前是展开的就保持展开，如果是新帖子就默认折叠(false)
    posts.value = data.map(post => ({ 
      ...post, 
      showComments: stateMap[post.id] || false,
      isExpanded: expandMap[post.id] || false
    }))
  } catch (error) {
    console.error("获取帖子失败", error)
    ElMessage.error(error.message || '获取帖子失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 1. 页面加载时，先看看是谁在登录
  const user = getStoredUser()
  if (user) {
    currentUser.value = user
  }
  // 2. 拉取帖子列表
  await loadTopics()
  loadPosts()
  window.addEventListener('pointerdown', collapseComposerIfIdle)
})

onBeforeUnmount(() => {
  // 新增：组件离开页面时移除监听，避免回到其他页面后还触发社区页的收起逻辑。
  window.removeEventListener('pointerdown', collapseComposerIfIdle)
})

// 发送帖子的核心函数
const submitPost = async () => {
  if (!newPostContent.value.trim() && postImages.value.length === 0) {
    ElMessage.warning('好歹写点什么再发呀！')
    return
  }

  isSubmitting.value = true
  try {
    const isEditing = Boolean(editingPostId.value)
    const topicIdForSubmit = selectedTopicId.value || defaultTopicId.value
    const data = await apiRequest(isEditing ? '/api/update-post' : '/api/create-post', {
      method: 'POST',
      body: JSON.stringify({
        post_id: editingPostId.value,
        topic_id: topicIdForSubmit,
        title: newPostTitle.value,
        content: newPostContent.value,
        tags: postTags.value,
        images: postImages.value
      })
    })

    ElMessage.success(data.message)
    resetPostForm()
    loadPosts() // 加载新帖子
  } catch (error) {
    ElMessage.error(error.message || '网络错误，发送失败')
  } finally {
    isSubmitting.value = false
  }
}

const addEmojiToPost = (emoteCode) => {
  // B 站表情使用 [表情名] 这种文本格式保存，别人没有安装同款表情包时也能看懂大概含义。
  newPostContent.value += emoteCode
}

const resetPostForm = () => {
  // 发布和编辑共用同一个表单，保存成功或取消编辑时统一清空，避免旧图片残留到下一篇帖子。
  editingPostId.value = null
  newPostTitle.value = ''
  newPostContent.value = ''
  postTags.value = []
  tagInput.value = ''
  postImages.value = []
  isComposerExpanded.value = false
}

const triggerPostImageUpload = () => {
  postImageInputRef.value?.click()
}

const handlePostImageFiles = async (files) => {
  const imageFiles = Array.from(files || []).filter(file => file.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  isProcessingImage.value = true
  try {
    // 发帖图片统一在前端压缩，减少请求体积，也能让列表里的图片加载更快；数组追加可以支持一次选择多张。
    const compressedImages = await compressPostImages(imageFiles, postImages.value.length)
    postImages.value = [...postImages.value, ...compressedImages]
    ElMessage.success(`已添加 ${compressedImages.length} 张图片`)
  } catch (error) {
    ElMessage.error(error.message || '图片处理失败，请重新选择')
  } finally {
    isProcessingImage.value = false
  }
}

const onPostImageSelected = (event) => {
  handlePostImageFiles(event.target.files)
  event.target.value = ''
}

const handlePostPaste = (event) => {
  const items = Array.from(event.clipboardData?.items || [])
  const imageItems = items.filter(item => item.type.startsWith('image/'))
  if (imageItems.length === 0) return

  // 用户粘贴图片时阻止浏览器把图片文件名或无意义内容塞进文本框，只保留真正的图片预览。
  event.preventDefault()
  handlePostImageFiles(imageItems.map(item => item.getAsFile()))
}

const removePostImage = (index) => {
  postImages.value = postImages.value.filter((_, imageIndex) => imageIndex !== index)
}

const getPostImages = (post) => {
  // 后端新字段是 images，旧数据可能只有 image；这里合并处理，前端展示就不用到处写兼容判断。
  if (Array.isArray(post.images) && post.images.length > 0) return post.images
  return post.image ? [post.image] : []
}

const hasPostTitle = (post) => {
  return String(post.title || '').trim() !== ''
}

const shouldShowExpand = (post) => {
  const maxPreviewLength = getPostImages(post).length > 0 ? 120 : 420
  return String(post.content || '').length > maxPreviewLength
}

const postContentClass = (post) => {
  if (post.isExpanded || !shouldShowExpand(post)) return ''
  return getPostImages(post).length > 0 ? 'collapsed with-images' : 'collapsed no-images'
}

const startEditPost = (post) => {
  // 编辑时复用顶部发布框，初学阶段比弹窗状态更直观：把旧内容放回表单，保存时调用编辑接口。
  editingPostId.value = post.id
  selectedTopicId.value = post.topic_id || selectedTopicId.value
  newPostTitle.value = post.title || ''
  newPostContent.value = post.content || ''
  postTags.value = [...getPostTags(post)]
  postImages.value = [...getPostImages(post)]
  isComposerExpanded.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const goToPostDetail = (postId) => {
  // 详情页使用帖子 id 做路由参数，这样刷新页面也能重新向后端读取同一条帖子。
  router.push(`/main/community/post/${postId}`)
}

const goToUserProfile = (uid) => {
  // 后端会给帖子和评论补 author_uid，点击头像或昵称时用 uid 跳转更稳定。
  if (!uid) return
  router.push(Number(uid) === Number(currentUser.value.uid) ? '/main/dashboard' : `/main/user/${uid}`)
}

const startReplyComment = (postId, comment) => {
  // 新增：只记录被回复评论的信息，真正提交时由 CommentComposer 传 parent_id 给后端。
  replyTargets.value = { ...replyTargets.value, [postId]: comment }
}

const cancelReplyComment = (postId) => {
  const nextTargets = { ...replyTargets.value }
  delete nextTargets[postId]
  replyTargets.value = nextTargets
}

const onCommentCreated = async (postId) => {
  cancelReplyComment(postId)
  await loadPosts()
}

const getCommentImages = (comment) => {
  return Array.isArray(comment.images) ? comment.images.filter(Boolean) : []
}

// 切换收藏状态逻辑
const toggleFavorite = async (post) => {
  if (!currentUser.value.uid) {
    ElMessage.warning('请先登录再执行收藏操作')
    return
  }
  try {
    const data = await apiRequest('/api/toggle-favorite', {
      method: 'POST',
      body: JSON.stringify({ post_id: post.id })
    })
    ElMessage.success(data.message)
    
    // 纯前端丝滑刷新状态，无需重新请求整张表，提升交互体验
    post.is_favorited = data.is_favorited
    if (data.is_favorited) { post.favorite_count++ } 
    else { post.favorite_count = Math.max(0, post.favorite_count - 1) }
  } catch (error) { ElMessage.error(error.message || '收藏失败') }
}

// ✨【新增】删除评论逻辑
const deleteComment = (commentId) => {
  ElMessageBox.confirm('确认要删除这条评论吗？', '提示', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      const data = await apiRequest('/api/delete-comment', {
        method: 'POST',
        body: JSON.stringify({
          comment_id: commentId
        })
      })
      ElMessage.success(data.message)
      // 重新拉取数据！因为我们上一轮做了“状态记忆”，所以刷新后评论抽屉依然会开着，体验极佳
      loadPosts() 
    } catch (error) {
      ElMessage.error(error.message || '网络通讯中断，删除失败')
    }
  }).catch(() => {
    // 静默取消
  })
}

// 销毁帖子的函数
const deletePost = (postId) => {
  // 二次确认框
  ElMessageBox.confirm(
    '确认要永久销毁这条动态吗？该操作不可逆转！',
    '高危操作警告',
    {
      confirmButtonText: '确认销毁',
      cancelButtonText: '手滑了',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/delete-post', {
        method: 'POST',
        body: JSON.stringify({
          post_id: postId
        })
      })
      ElMessage.success(data.message)
      loadPosts() // 瞬间重新拉取数据，让被删除的帖子从屏幕上消失
    } catch (error) {
      ElMessage.error(error.message || '网络通讯中断，删除指令未送达')
    }
  }).catch(() => {
    // 用户点了取消，静默处理
  })
}

const formatDate = (timeString) => {
  const date = new Date(timeString)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="community-container">
    <div class="topic-strip">
      <button
        v-for="topic in topics"
        :key="topic.id"
        type="button"
        class="topic-pill"
        :class="[topicToneClass(topic), { active: Number(selectedTopicId) === Number(topic.id) }]"
        @click="switchTopic(topic.id)"
      >
        <span>{{ topic.name }}</span>
        <small>{{ topic.post_count || 0 }}</small>
      </button>
      <span v-if="topicsLoading" class="topic-loading">话题加载中...</span>
    </div>

    <el-card class="publish-card" shadow="never">
      <div class="publish-area">
        <el-avatar :size="45" :src="currentUser.avatar" />
        <div ref="composerRef" class="publish-main" :class="{ 'is-expanded': shouldShowComposerTools }" @paste.capture="handlePostPaste" @focusin="expandComposer">
          <div v-if="editingPostId" class="editing-banner">
            正在编辑帖子 #{{ editingPostId }}
            <button type="button" @click="resetPostForm">取消编辑</button>
          </div>
          <el-select
            v-model="selectedTopicId"
            class="topic-select"
            placeholder="选择发布话题"
            :disabled="topicsLoading || topics.length === 0"
          >
            <el-option
              v-for="topic in topics"
              :key="topic.id"
              :label="topic.name"
              :value="topic.id"
            />
          </el-select>
          <el-input
            v-model="newPostTitle"
            maxlength="15"
            show-word-limit
            placeholder="标题（可不填，最多 15 字）"
            class="publish-title-input"
          />
          <el-input
            v-model="newPostContent"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            maxlength="20000"
            show-word-limit
            placeholder="有什么新鲜事想和大家分享？（支持回车换行）"
            class="publish-input"
          />

          <div class="tag-editor">
            <div class="tag-list">
              <span v-for="(tag, index) in postTags" :key="`${tag}-${index}`" class="tag-chip">
                #{{ tag }}
                <button type="button" @click="removePostTag(index)">×</button>
              </span>
            </div>
            <el-input
              v-model="tagInput"
              class="tag-input"
              size="small"
              :maxlength="POST_TAG_MAX_LENGTH"
              :disabled="postTags.length >= POST_MAX_TAGS"
              placeholder="输入标签后回车"
              @keyup.enter="addPostTag"
              @blur="addPostTag"
            />
            <span class="tag-count">{{ postTags.length }}/{{ POST_MAX_TAGS }}</span>
          </div>

          <div v-if="postImages.length || isProcessingImage" class="post-image-preview-grid">
            <el-skeleton v-if="isProcessingImage" :rows="1" animated />
            <template v-else>
              <div v-for="(image, index) in postImages" :key="`${image.slice(0, 30)}-${index}`" class="preview-image-cell">
                <img :src="image" alt="待发布图片预览" />
                <button type="button" class="remove-image-button" @click="removePostImage(index)">移除</button>
              </div>
            </template>
          </div>

          <div class="publish-action">
            <div class="publish-tools">
              <BilibiliEmotePicker @select="addEmojiToPost" />
              <button
                class="tool-trigger image-trigger"
                type="button"
                title="添加图片"
                :disabled="isProcessingImage || postImages.length >= POST_MAX_IMAGES"
                @click="triggerPostImageUpload"
              >
                <el-icon><Picture /></el-icon>
              </button>
              <span class="image-count-text">{{ postImages.length }}/{{ POST_MAX_IMAGES }}</span>
              <input ref="postImageInputRef" type="file" :accept="IMAGE_ACCEPT" multiple style="display: none;" @change="onPostImageSelected">
            </div>
            <el-button 
              type="primary" 
              :loading="isSubmitting || isProcessingImage" 
              @click="submitPost" 
              round
              size="large"
              color="#38bdf8"
              class="publish-button"
            >
              {{ editingPostId ? '保存修改' : '立即发布' }}
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-skeleton :rows="5" animated v-if="loading" />

    <div v-else class="post-list">
      <el-card
        v-for="post in posts"
        :key="post.id"
        class="post-card"
        :class="getPostImages(post).length > 0 ? 'has-images' : 'no-images'"
        shadow="hover"
      >
        
        <div class="post-header">
          <el-avatar :size="40" :src="post.avatar" class="clickable-user" @click.stop="goToUserProfile(post.author_uid)" />
          <div class="user-info">
            <span class="username clickable-user" @click.stop="goToUserProfile(post.author_uid)">{{ post.nickname || post.username }}</span>
            <span v-if="post.signature" class="signature">{{ post.signature }}</span>
            <span class="time">{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
        <div v-if="(!isDefaultTopic(post) && post.topic_name) || getPostTags(post).length" class="post-pill-row">
          <span v-if="!isDefaultTopic(post) && post.topic_name" class="post-topic-pill" :class="topicToneClass(post)">
            {{ post.topic_name }}
          </span>
          <span v-for="tag in getPostTags(post)" :key="tag" class="post-tag-pill">#{{ tag }}</span>
        </div>

        <h3 v-if="hasPostTitle(post)" class="post-title" @click="goToPostDetail(post.id)">{{ post.title }}</h3>
        
        <div
          class="post-content"
          :class="postContentClass(post)"
          @click="goToPostDetail(post.id)"
        >
          <BilibiliEmoteText :text="post.content" />
        </div>

        <button v-if="shouldShowExpand(post)" type="button" class="expand-button" @click.stop="post.isExpanded = !post.isExpanded">
          {{ post.isExpanded ? '收起全文' : '展开全文' }}
        </button>

        <PostImageGrid :images="getPostImages(post)" />
        
        <div class="post-footer">
          
          <div class="post-actions">
            <div class="left-actions">
              <el-button type="primary" link :icon="ChatDotRound" @click="post.showComments = !post.showComments">
                评论 ({{ post.comments ? post.comments.length : 0 }})
              </el-button>
              <el-button
                link 
                :icon="post.is_favorited ? StarFilled : Star" 
                :style="{ color: post.is_favorited ? '#e6a23c' : '#409eff' }"
                @click="toggleFavorite(post)"
              >
                {{ post.is_favorited ? '已收藏' : '收藏' }} ({{ post.favorite_count }})
              </el-button>
            </div>

            <div class="right-actions" v-if="post.username === currentUser.username || isAdmin(currentUser)">
              <el-button type="primary" link :icon="Edit" @click="startEditPost(post)">
                编辑
              </el-button>
              <el-button type="danger" link :icon="Delete" @click="deletePost(post.id)">
                删除
              </el-button>
            </div>
          </div>

          <el-collapse-transition>
            <div v-show="post.showComments" class="comment-box">
              
              <div class="comment-input-area">
                <CommentComposer
                  :post-id="post.id"
                  :parent-comment="replyTargets[post.id]"
                  compact
                  @created="onCommentCreated(post.id)"
                  @cancel-reply="cancelReplyComment(post.id)"
                />
              </div>
              
              <div v-if="post.comments && post.comments.length > 0" class="comment-list">
                <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
                  <el-avatar :size="28" :src="comment.avatar" class="clickable-user" @click.stop="goToUserProfile(comment.author_uid)" />
                  <div class="comment-body">
                    <div class="comment-user">
                      <div style="display: flex; gap: 10px; align-items: baseline;">
                        <span class="comment-name clickable-user" @click.stop="goToUserProfile(comment.author_uid)">{{ comment.nickname || comment.username }}</span>
                        <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                      </div>
                      
                      <div class="comment-actions-inline">
                        <el-button type="primary" link size="small" @click="startReplyComment(post.id, comment)">
                          回复
                        </el-button>
                        <el-button
                          v-if="comment.username === currentUser.username || isAdmin(currentUser)"
                          type="danger"
                          link
                          :icon="Delete"
                          size="small"
                          @click="deleteComment(comment.id)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>
                    <div v-if="comment.reply_to_nickname || comment.reply_to_username" class="reply-hint">
                      回复 @{{ comment.reply_to_nickname || comment.reply_to_username }}
                    </div>
                    <div class="comment-text"><BilibiliEmoteText :text="comment.content" /></div>
                    <PostImageGrid :images="getCommentImages(comment)" compact />
                  </div>
                </div>
              </div>
              <div v-else class="no-comments">暂无评论，快来抢沙发吧~</div>

            </div>
          </el-collapse-transition>
          
        </div>
        </el-card>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 
   1. 整体容器与发帖区 
==================== */
.community-container {
  max-width: 800px; 
  margin: 0 auto; 
}

.topic-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.topic-pill {
  border: 1px solid #dbeafe;
  background: #ffffff;
  color: #475569;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.topic-pill small {
  color: #94a3b8;
}

.topic-pill.active {
  border-color: #38bdf8;
  background: #ecfeff;
  color: #0284c7;
  font-weight: 700;
}

.topic-pill.tone-0,
.post-topic-pill.tone-0 { --topic-bg: #ecfeff; --topic-border: #67e8f9; --topic-text: #0e7490; }
.topic-pill.tone-1,
.post-topic-pill.tone-1 { --topic-bg: #f0fdf4; --topic-border: #86efac; --topic-text: #15803d; }
.topic-pill.tone-2,
.post-topic-pill.tone-2 { --topic-bg: #fff7ed; --topic-border: #fdba74; --topic-text: #c2410c; }
.topic-pill.tone-3,
.post-topic-pill.tone-3 { --topic-bg: #f5f3ff; --topic-border: #c4b5fd; --topic-text: #6d28d9; }
.topic-pill.tone-4,
.post-topic-pill.tone-4 { --topic-bg: #fdf2f8; --topic-border: #f9a8d4; --topic-text: #be185d; }
.topic-pill.tone-5,
.post-topic-pill.tone-5 { --topic-bg: #eff6ff; --topic-border: #93c5fd; --topic-text: #1d4ed8; }

.topic-pill[class*="tone-"] {
  background: var(--topic-bg);
  border-color: var(--topic-border);
  color: var(--topic-text);
}

.topic-loading {
  color: #909399;
  font-size: 13px;
  align-self: center;
}

.topic-select {
  width: 220px;
  margin-bottom: 10px;
}

.publish-main .topic-select,
.publish-main .tag-editor,
.publish-main .post-image-preview-grid,
.publish-main .publish-action {
  max-height: 260px;
  opacity: 1;
  transform: translateY(0);
  transition: max-height 0.28s ease, opacity 0.22s ease, transform 0.28s ease, margin 0.28s ease;
}

.publish-main:not(.is-expanded) .topic-select,
.publish-main:not(.is-expanded) .tag-editor,
.publish-main:not(.is-expanded) .post-image-preview-grid,
.publish-main:not(.is-expanded) .publish-action {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
  pointer-events: none;
  overflow: hidden;
  transform: translateY(-8px);
}

.publish-card {
  margin-bottom: 25px;
  border-radius: 12px;
}

.publish-area {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.publish-main {
  flex: 1;
  min-width: 0;
}

.editing-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #ecfeff;
  color: #0891b2;
  font-size: 13px;
}

.editing-banner button {
  border: none;
  background: transparent;
  color: #0284c7;
  cursor: pointer;
}

.publish-title-input {
  margin-bottom: 10px;
}

.publish-input {
  flex-grow: 1;
}

.tag-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px auto;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
}

.tag-chip,
.post-tag-pill,
.post-topic-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.tag-chip {
  gap: 5px;
  padding: 7px 9px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.tag-chip button {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tag-count {
  color: #94a3b8;
  font-size: 12px;
}

.publish-action {
  display: flex;
  justify-content: space-between; /* 表情在输入框左侧，发布按钮保持在右侧 */
  align-items: center;
  gap: 10px;
  width: 100%;              
  margin-top: 15px;
}

.publish-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-trigger {
  width: 42px;
  height: 42px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.tool-trigger:hover:not(:disabled) {
  border-color: #38bdf8;
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.22);
  transform: translateY(-1px);
}

.tool-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.image-trigger {
  color: #38bdf8;
  font-size: 20px;
}

.image-count-text {
  color: #909399;
  font-size: 12px;
}

.publish-button {
  min-width: 96px;
  height: 42px;
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

.emoji-page-text {
  font-size: 12px;
  color: #909399;
}

.post-image-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: min(420px, 100%);
  margin-top: 12px;
}

.preview-image-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.preview-image-cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-button {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  border-radius: 999px;
  padding: 4px 10px;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

/* ==================== 
   2. 帖子卡片主体 
==================== */
.post-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.post-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}

.post-card.has-images :deep(.el-card__body) {
  min-height: 360px;
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.user-info {
  display: flex;
  flex-direction: column;
  margin-left: 12px;
}

.username {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.clickable-user {
  cursor: pointer;
}

.clickable-user:hover {
  color: #38bdf8;
}

.time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.signature {
  font-size: 12px;
  color: #6b7280;
  margin-top: 3px;
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-title {
  margin: 0 0 8px;
  color: #303133;
  font-size: 17px;
  line-height: 1.4;
  cursor: pointer;
}

.post-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 10px;
}

.post-topic-pill {
  padding: 6px 10px;
  background: var(--topic-bg);
  border: 1px solid var(--topic-border);
  color: var(--topic-text);
  font-weight: 700;
}

.post-tag-pill {
  padding: 6px 9px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.post-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  min-height: 44px;
  margin-bottom: 8px;
  white-space: pre-wrap;
  cursor: pointer;
}

.post-content.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.post-content.collapsed.with-images {
  -webkit-line-clamp: 3;
}

.post-content.collapsed.no-images {
  -webkit-line-clamp: 10;
}

.expand-button {
  border: none;
  padding: 0;
  margin: 0 0 8px;
  background: transparent;
  color: #38bdf8;
  cursor: pointer;
  font-size: 13px;
}

/* ==================== 
   3. 底部互动大区与操作栏 
==================== */
.post-footer {
  border-top: 1px solid #ebeef5; 
  padding-top: 12px;
  margin-top: 12px;
}

.post-card.has-images .post-footer {
  margin-top: auto;
}

.post-actions {
  display: flex;
  justify-content: space-between; /* 左右两边按钮各靠边界 */
  align-items: center;
}

.left-actions {
  display: flex;
  gap: 20px; /* 评论和收藏按钮之间的间距 */
}

.right-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 640px) {
  .tag-editor {
    grid-template-columns: 1fr;
  }

  .tag-input,
  .topic-select {
    width: 100%;
  }
}

/* ==================== 
   4. 瀑布流评论
==================== */
.comment-box { 
  margin-top: 12px; 
  background-color: #f7f9fc; 
  border-radius: 8px; 
  padding: 15px; 
}

.comment-input-area { 

  margin-bottom: 15px; 
}

.comment-list { 
  display: flex; 
  flex-direction: column; 
  gap: 15px; 
}

.comment-item { 
  display: flex; 
  gap: 10px; 
  align-items: flex-start; 
}

.comment-body { 
  flex-grow: 1; 
  display: flex; 
  flex-direction: column; 
}

.comment-user { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
}

.comment-actions-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-hint {
  margin-top: 4px;
  color: #0284c7;
  font-size: 12px;
}

.comment-name { 
  font-size: 13px; 
  font-weight: bold; 
  color: #409eff; 
}

.comment-time { 
  font-size: 11px; 
  color: #c0c4cc; 
}

.comment-text { 
  font-size: 13px; 
  color: #606266; 
  margin-top: 4px; 
  line-height: 1.4; 
}

.no-comments { 
  text-align: center; 
  font-size: 12px; 
  color: #909399; 
  padding: 10px 0; 
}

</style>
