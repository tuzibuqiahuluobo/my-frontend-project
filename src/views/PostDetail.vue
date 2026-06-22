<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ChatDotRound, Delete, Star, StarFilled } from '@element-plus/icons-vue'
import { apiRequest, getStoredUser, isAdmin } from '../api'
import PostImageGrid from '../components/PostImageGrid.vue'
import CommentComposer from '../components/CommentComposer.vue'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const loading = ref(true)
const currentUser = ref({ uid: null, username: '', role: 0 })
const replyTarget = ref(null)

const formatDate = (timeString) => {
  // 详情页显示完整一点的时间，方便用户知道这条动态具体是什么时候发的。
  const date = new Date(timeString)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getPostImages = (targetPost) => {
  // 新帖子使用 images 数组，旧帖子可能只有 image 字段；详情页统一转成数组交给九宫格组件。
  if (Array.isArray(targetPost?.images) && targetPost.images.length > 0) return targetPost.images
  return targetPost?.image ? [targetPost.image] : []
}

const hasPostTitle = (targetPost) => {
  return String(targetPost?.title || '').trim() !== ''
}

const getPostTags = (targetPost) => {
  return Array.isArray(targetPost?.tags) ? targetPost.tags.filter(Boolean) : []
}

const getCommentImages = (comment) => {
  return Array.isArray(comment?.images) ? comment.images.filter(Boolean) : []
}

const shouldShowTopic = (targetPost) => {
  return targetPost?.topic_name && targetPost.topic_name !== '综合社区'
}

const backToCommunity = () => {
  // 新增：详情页知道帖子所属话题时，返回社区就带上 topic_id，用户不会迷路到默认社区。
  if (post.value?.topic_id) {
    router.push(`/main/community?topic_id=${post.value.topic_id}`)
    return
  }
  router.back()
}

const goToUserProfile = (uid) => {
  // 使用后端返回的 author_uid 跳转，避免用户改昵称或账号后链接失效。
  if (!uid) return
  router.push(Number(uid) === Number(currentUser.value.uid) ? '/main/dashboard' : `/main/user/${uid}`)
}

const loadPostDetail = async () => {
  loading.value = true
  try {
    // id 来自路由参数，比如 /main/community/post/3，这样详情页刷新后也能重新加载。
    post.value = await apiRequest(`/api/post-detail?id=${route.params.id}`)
  } catch (error) {
    ElMessage.error(error.message || '帖子详情读取失败')
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  if (!currentUser.value.uid) {
    ElMessage.warning('请先登录再执行收藏操作')
    return
  }

  try {
    const data = await apiRequest('/api/toggle-favorite', {
      method: 'POST',
      body: JSON.stringify({ post_id: post.value.id })
    })
    post.value.is_favorited = data.is_favorited
    post.value.favorite_count = data.is_favorited
      ? post.value.favorite_count + 1
      : Math.max(0, post.value.favorite_count - 1)
    ElMessage.success(data.message)
  } catch (error) {
    ElMessage.error(error.message || '收藏失败')
  }
}

const onCommentCreated = async () => {
  replyTarget.value = null
  await loadPostDetail()
}

const startReply = (comment) => {
  replyTarget.value = comment
}

const cancelReply = () => {
  replyTarget.value = null
}

const deleteComment = (commentId) => {
  ElMessageBox.confirm('确认要删除这条评论吗？', '提示', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const data = await apiRequest('/api/delete-comment', {
        method: 'POST',
        body: JSON.stringify({ comment_id: commentId })
      })
      ElMessage.success(data.message)
      loadPostDetail()
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {
    // 用户取消删除时不需要提示，页面保持原样即可。
  })
}

onMounted(() => {
  const user = getStoredUser()
  if (user) {
    currentUser.value = user
  }
  loadPostDetail()
})
</script>

<template>
  <div class="detail-container">
    <el-button :icon="ArrowLeft" link class="back-button" @click="backToCommunity">返回</el-button>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-card v-else-if="post" class="detail-card" shadow="never">
      <div class="post-header">
        <el-avatar :size="46" :src="post.avatar" class="clickable-user" @click.stop="goToUserProfile(post.author_uid)" />
        <div class="user-info">
          <span class="username clickable-user" @click.stop="goToUserProfile(post.author_uid)">{{ post.nickname || post.username }}</span>
          <span v-if="post.signature" class="signature">{{ post.signature }}</span>
          <span class="time">{{ formatDate(post.created_at) }}</span>
        </div>
      </div>
      <div v-if="shouldShowTopic(post) || getPostTags(post).length" class="detail-pill-row">
        <el-tag v-if="shouldShowTopic(post)" class="detail-topic-tag" size="small" effect="plain">
          {{ post.topic_name }}
        </el-tag>
        <span v-for="tag in getPostTags(post)" :key="tag" class="detail-tag-pill">#{{ tag }}</span>
      </div>

      <h1 v-if="hasPostTitle(post)" class="detail-title">{{ post.title }}</h1>
      <div class="post-content">{{ post.content }}</div>

      <PostImageGrid :images="getPostImages(post)" />

      <div class="post-stats">
        <span><el-icon><ChatDotRound /></el-icon> {{ post.comments ? post.comments.length : 0 }} 条评论</span>
        <span>{{ post.favorite_count }} 次收藏</span>
      </div>

      <div class="post-actions">
        <el-button
          link
          :icon="post.is_favorited ? StarFilled : Star"
          :style="{ color: post.is_favorited ? '#e6a23c' : '#409eff' }"
          @click="toggleFavorite"
        >
          {{ post.is_favorited ? '已收藏' : '收藏' }}
        </el-button>
      </div>

      <div class="reply-box">
        <CommentComposer
          :post-id="post.id"
          :parent-comment="replyTarget"
          @created="onCommentCreated"
          @cancel-reply="cancelReply"
        />
      </div>

      <div class="comment-list">
        <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
          <el-avatar :size="34" :src="comment.avatar" class="clickable-user" @click.stop="goToUserProfile(comment.author_uid)" />
          <div class="comment-body">
            <div class="comment-user">
              <div>
                <span class="comment-name clickable-user" @click.stop="goToUserProfile(comment.author_uid)">{{ comment.nickname || comment.username }}</span>
                <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
              </div>
              <div class="comment-actions-inline">
                <el-button type="primary" link size="small" @click="startReply(comment)">
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
            <div class="comment-text">{{ comment.content }}</div>
            <PostImageGrid :images="getCommentImages(comment)" compact />
          </div>
        </div>
        <el-empty v-if="!post.comments || post.comments.length === 0" description="暂无评论，快来回复吧~" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.detail-container {
  max-width: 760px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 14px;
}

.detail-card {
  border-radius: 8px;
}

.post-header,
.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username,
.comment-name {
  font-weight: bold;
  color: #303133;
}

.clickable-user {
  cursor: pointer;
}

.clickable-user:hover {
  color: #38bdf8;
}

.time,
.comment-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.signature {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

.detail-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.detail-tag-pill {
  border-radius: 999px;
  padding: 6px 9px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.comment-time {
  margin-left: 10px;
}

.detail-title {
  margin: 24px 0 10px;
  color: #303133;
  font-size: 24px;
  line-height: 1.35;
}

.post-content {
  color: #303133;
  font-size: 18px;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 24px 0 16px;
}

.post-stats,
.post-actions {
  border-top: 1px solid #ebeef5;
  padding: 12px 0;
  color: #909399;
  display: flex;
  gap: 24px;
}

.reply-box {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.comment-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.comment-body {
  flex: 1;
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
  margin-top: 5px;
  color: #0284c7;
  font-size: 12px;
}

.comment-text {
  color: #606266;
  line-height: 1.6;
  margin-top: 6px;
  white-space: pre-wrap;
}
</style>
