<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ChatDotRound, Delete, Star, StarFilled } from '@element-plus/icons-vue'
import { apiRequest, getStoredUser, isAdmin } from '../api'

const route = useRoute()
const router = useRouter()
const post = ref(null)
const loading = ref(true)
const commentContent = ref('')
const currentUser = ref({ uid: null, username: '', role: 0 })

const formatDate = (timeString) => {
  // 详情页显示完整一点的时间，方便用户知道这条动态具体是什么时候发的。
  const date = new Date(timeString)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
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

const submitComment = async () => {
  const content = commentContent.value.trim()
  if (!content) {
    ElMessage.warning('评论内容不能为空哦')
    return
  }

  try {
    const data = await apiRequest('/api/create-comment', {
      method: 'POST',
      body: JSON.stringify({ post_id: post.value.id, content })
    })
    ElMessage.success(data.message)
    commentContent.value = ''
    loadPostDetail()
  } catch (error) {
    ElMessage.error(error.message || '评论发送失败')
  }
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
    <el-button :icon="ArrowLeft" link class="back-button" @click="router.back()">返回</el-button>

    <el-skeleton v-if="loading" :rows="8" animated />

    <el-card v-else-if="post" class="detail-card" shadow="never">
      <div class="post-header">
        <el-avatar :size="46" :src="post.avatar" />
        <div class="user-info">
          <span class="username">{{ post.nickname || post.username }}</span>
          <span class="time">{{ formatDate(post.created_at) }}</span>
        </div>
      </div>

      <div class="post-content">{{ post.content }}</div>

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
        <el-input
          v-model="commentContent"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="写下你的回复..."
        />
        <div class="reply-action">
          <el-button type="primary" round color="#38bdf8" @click="submitComment">回复</el-button>
        </div>
      </div>

      <div class="comment-list">
        <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
          <el-avatar :size="34" :src="comment.avatar" />
          <div class="comment-body">
            <div class="comment-user">
              <div>
                <span class="comment-name">{{ comment.nickname || comment.username }}</span>
                <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
              </div>
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
            <div class="comment-text">{{ comment.content }}</div>
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

.time,
.comment-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.comment-time {
  margin-left: 10px;
}

.post-content {
  color: #303133;
  font-size: 18px;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 24px 0;
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

.reply-action {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
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

.comment-text {
  color: #606266;
  line-height: 1.6;
  margin-top: 6px;
  white-space: pre-wrap;
}
</style>
