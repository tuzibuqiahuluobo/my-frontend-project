<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const posts = ref([])
const loading = ref(true)

// 【新增】发帖相关的变量
const currentUser = ref({ username: '匿名', avatar: '' })
const newPostContent = ref('')
const isSubmitting = ref(false)

// 【优化】把获取帖子的逻辑单独抽成一个函数，方便发帖后瞬间刷新
const loadPosts = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/posts')
    const data = await response.json()
    posts.value = data
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

// 【新增】发送帖子的核心函数
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

// 【新增】销毁帖子的函数
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
          :rows="3"
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
            <span class="username">{{ post.username }}</span>
            <span class="time">{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
        <div class="post-content">
          {{ post.content }}
        </div>
        <div class="post-actions">
          <div class="left-actions">
            <el-button type="primary" link icon="ChatDotRound">评论</el-button>
            <el-button type="primary" link icon="Star">收藏</el-button>
          </div>
          
          <div class="right-actions" v-if="post.username === currentUser.username || currentUser.username === '最高指挥官'">
            <el-button 
              type="danger" 
              link 
              icon="Delete" 
              @click="deletePost(post.id)"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>

.publish-card {
  margin-bottom: 25px;
  border-radius: 12px;
  background-color: #ffffff;
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
  justify-content: flex-end; /* 让盒子里的内容全部往右靠 */
  width: 100%;               /* 确保它占满整行宽度 */
  margin-top: 15px;
}

/* 修改和新增以下代码 */
.post-actions {
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
  display: flex;
  justify-content: space-between; /* 让左右两边的按钮各自靠边 */
  align-items: center;
}

.left-actions {
  display: flex;
  gap: 20px;
}

.community-container {
  max-width: 800px;
  margin: 0 auto;
}
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
.post-actions {
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
  display: flex;
  gap: 20px;
}
</style>