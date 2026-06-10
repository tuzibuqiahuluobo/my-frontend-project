<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Star, StarFilled, Delete } from '@element-plus/icons-vue'

const posts = ref([])
const loading = ref(true)

// 【新增】发帖相关的变量
const currentUser = ref({ uid: null, username: '匿名', nickname: '', avatar: '' })
const newPostContent = ref('')
const isSubmitting = ref(false)

// 用于绑定每条帖子独立的评论输入框内容，键名是 postId，键值是输入的字符串
const commentInputs = ref({})

// 【优化】把获取帖子的逻辑单独抽成一个函数，方便发帖后瞬间刷新
const loadPosts = async () => {
  try {
    //刷新前：把当前帖子的展开状态存进字典里
    const stateMap = {}
    posts.value.forEach(post => {
      stateMap[post.id] = post.showComments
    })
    // 带上当前登录用户的 UID，让后端告诉我们哪些帖子我们已经收藏过了
    const response = await fetch(`http://localhost:8080/api/posts?uid=${currentUser.value.uid || ''}`)
    const data = await response.json()
    // 刷新后：去字典里核对，之前是展开的就保持展开，如果是新帖子就默认折叠(false)
    posts.value = data.map(post => ({ 
      ...post, 
      showComments: stateMap[post.id] || false 
    }))
  } catch (error) {
    console.error("获取帖子失败", error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 1. 页面加载时，先看看是谁在登录
  const userStr = localStorage.getItem('user')
  if (userStr) {
    currentUser.value = JSON.parse(userStr)
  }
  // 2. 拉取帖子列表
  loadPosts()
})

// 发送帖子的核心函数
const submitPost = async () => {
  if (!newPostContent.value.trim()) {
    ElMessage.warning('好歹写点什么再发呀！')
    return
  }

  isSubmitting.value = true
  try {
    const response = await fetch('http://localhost:8080/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.value.username,
        nickname: currentUser.value.nickname || currentUser.value.username, // 新增
        avatar: currentUser.value.avatar,
        content: newPostContent.value
      })
    })
    
    const data = await response.json()
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success(data.message)
      newPostContent.value = '' // 清空输入框
      loadPosts() // 加载新帖子
    }
  } catch (error) {
    ElMessage.error('网络错误，发送失败')
  } finally {
    isSubmitting.value = false
  }
}

// 发表评论逻辑
const submitComment = async (postId) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) {
    ElMessage.warning('评论内容不能为空哦')
    return
  }

  try {
    const response = await fetch('http://localhost:8080/api/create-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id: postId,
        username: currentUser.value.username,
        nickname: currentUser.value.nickname || currentUser.value.username,
        avatar: currentUser.value.avatar,
        content: content
      })
    })
    const data = await response.json()
    if (data.error) { ElMessage.error(data.error) } 
    else {
      ElMessage.success('评论成功！')
      commentInputs.value[postId] = '' // 清空输入框
      loadPosts() // 刷新列表，带出最新评论
    }
  } catch (error) { ElMessage.error('评论发送失败') }
}

// 切换收藏状态逻辑
const toggleFavorite = async (post) => {
  if (!currentUser.value.uid) {
    ElMessage.warning('请先登录再执行收藏操作')
    return
  }
  try {
    const response = await fetch('http://localhost:8080/api/toggle-favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.value.uid, post_id: post.id })
    })
    const data = await response.json()
    ElMessage.success(data.message)
    
    // 纯前端丝滑刷新状态，无需重新请求整张表，提升交互体验
    post.is_favorited = data.is_favorited
    if (data.is_favorited) { post.favorite_count++ } 
    else { post.favorite_count-- }
  } catch (error) { ElMessage.error('收藏失败') }
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
      const response = await fetch('http://localhost:8080/api/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          username: currentUser.value.username // 把当前登录的名字发过去核对
        })
      })
      const data = await response.json()
      if (data.error) {
        ElMessage.error(data.error)
      } else {
        ElMessage.success(data.message)
        loadPosts() // 瞬间重新拉取数据，让被删除的帖子从屏幕上消失
      }
    } catch (error) {
      ElMessage.error('网络通讯中断，删除指令未送达')
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
    
    <el-card class="publish-card" shadow="never">
      <div class="publish-area">
        <el-avatar :size="45" :src="currentUser.avatar" />
        <el-input
          v-model="newPostContent"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          maxlength="20000"
          show-word-limit
          placeholder="有什么新鲜事想和大家分享？（支持回车换行）"
          class="publish-input"
        />
      </div>

      <div class="publish-action">
        <el-button 
          type="primary" 
          :loading="isSubmitting" 
          @click="submitPost" 
          round
          size="large"
          color="#38bdf8"
        >
          🚀 立即发布
        </el-button>
      </div>
    </el-card>

    <el-skeleton :rows="5" animated v-if="loading" />

    <div v-else class="post-list">
      <el-card v-for="post in posts" :key="post.id" class="post-card" shadow="hover">
        
        <div class="post-header">
          <el-avatar :size="40" :src="post.avatar" />
          <div class="user-info">
            <span class="username">{{ post.nickname || post.username }}</span>
            <span class="time">{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
        
        <div class="post-content">
          {{ post.content }}
        </div>
        
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

            <div class="right-actions" v-if="post.username === currentUser.username || currentUser.username === '最高指挥官'">
              <el-button type="danger" link icon="Delete" @click="deletePost(post.id)">
                删除
              </el-button>
            </div>
          </div>

          <el-collapse-transition>
            <div v-show="post.showComments" class="comment-box">
              
              <div class="comment-input-area">
                <el-input 
                  v-model="commentInputs[post.id]" 
                  placeholder="善语结善缘，恶言伤人心..." 
                  size="small"
                  @keyup.enter="submitComment(post.id)"
                >
                  <template #append>
                    <el-button @click="submitComment(post.id)">发送</el-button>
                  </template>
                </el-input>
              </div>
              
              <div v-if="post.comments && post.comments.length > 0" class="comment-list">
                <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
                  <el-avatar :size="28" :src="comment.avatar" />
                  <div class="comment-body">
                    <div class="comment-user">
                      <span class="comment-name">{{ comment.nickname || comment.username }}</span>
                      <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
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

.publish-card {
  margin-bottom: 25px;
  border-radius: 12px;
}

.publish-area {
  display: flex;
  gap: 15px;
}

.publish-input {
  flex-grow: 1;
}

.publish-action {
  display: flex;
  justify-content: flex-end; /* 按钮靠右 */
  width: 100%;              
  margin-top: 15px;
}

/* ==================== 
   2. 帖子卡片主体 
==================== */
.post-card {
  margin-bottom: 20px;
  border-radius: 8px;
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

.time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.post-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 15px;
  white-space: pre-wrap;
}

/* ==================== 
   3. 底部互动大区与操作栏 
==================== */
.post-footer {
  border-top: 1px solid #ebeef5; 
  padding-top: 12px;
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