<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MagicStick, Setting, StarFilled } from '@element-plus/icons-vue'
import { apiRequest, clearStoredUser, getStoredUser } from '../api'

const router = useRouter()
const currentUser = ref({ uid: null, username: '', avatar: '' })
// 收藏列表单独放在个人中心里，避免和社区广场的帖子列表互相影响。
const favoritePosts = ref([])
// 加载状态用于显示骨架屏，让用户知道“我的收藏”正在读取数据。
const favoritesLoading = ref(false)

onMounted(() => {
  const user = getStoredUser()
  if (!user) {
    router.push('/login')
  } else {
    currentUser.value = user
    loadFavoritePosts()
  }
})

const logout = () => {
  clearStoredUser()
  ElMessage.info('已安全退出')
  router.push('/login')
}

// 跳转到刚刚新建的资料设置页
const goToProfile = () => {
  router.push('/main/settings/profile')
}

const goToDressUp = () => {
  ElMessage.info('个性装扮功能还在准备中')
}

const loadFavoritePosts = async () => {
  favoritesLoading.value = true
  try {
    // 后端会根据当前登录 token 找到“我的收藏”，前端不需要自己传 uid，安全性更好。
    favoritePosts.value = await apiRequest('/api/my-favorites')
  } catch (error) {
    ElMessage.error(error.message || '收藏列表读取失败')
  } finally {
    favoritesLoading.value = false
  }
}

const toggleFavorite = async (post) => {
  try {
    await apiRequest('/api/toggle-favorite', {
      method: 'POST',
      body: JSON.stringify({ post_id: post.id })
    })
    // 在个人中心点“取消收藏”后，直接从当前列表移除，页面反馈会更及时。
    favoritePosts.value = favoritePosts.value.filter(item => item.id !== post.id)
    ElMessage.success('已取消收藏')
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const formatDate = (timeString) => {
  // 后端返回的是标准时间字符串，这里转换成更短的月日时间，收藏卡片会更清爽。
  const date = new Date(timeString)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const goToPostDetail = (postId) => {
  // 从“我的收藏”进入帖子详情，路由里带 id，详情页就能单独读取这条帖子。
  router.push(`/main/community/post/${postId}`)
}

const postPreview = (content) => {
  // 收藏区只做简洁预览，内容太长时截断，真正阅读全文交给详情页。
  const text = String(content || '').trim()
  return text.length > 80 ? `${text.slice(0, 80)}...` : text
}
</script>

<template>
  <div style="background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px;">
    <div style="max-width: 900px; margin: 0 auto;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #303133;">个人中心</h1>
        <el-button type="danger" plain @click="logout">退出登录</el-button>
      </div>

      <el-card shadow="never" style="border-radius: 12px; margin-bottom: 30px;">
        <div style="display: flex; align-items: center;">
          <el-avatar :src="currentUser.avatar" :size="80" style="border: 2px solid #eee; margin-right: 30px;" />
          <div style="flex-grow: 1;">
            <h2 style="margin: 0 0 10px 0; color: #303133;">{{ currentUser.username }}</h2>
            <p style="margin: 0 0 15px 0; color: #909399; font-size: 14px;">UID: {{ String(currentUser.uid).padStart(5, '0') }}</p>
            <div>
              <el-button size="small" round type="primary" plain @click="goToProfile">
                <el-icon style="margin-right: 5px;"><Setting /></el-icon> 
                编辑个人资料
              </el-button>
              <el-button size="small" round type="warning" plain @click="goToDressUp">
                <el-icon style="margin-right: 5px;"><MagicStick /></el-icon>
                个性装扮
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <h3 style="color: #303133; margin-bottom: 20px;">🛠️ 我的创意空间</h3>
      <el-empty description="暂无作品喵~" />

      <h3 style="color: #303133; margin: 30px 0 20px;">⭐ 我的收藏</h3>
      <el-skeleton v-if="favoritesLoading" :rows="4" animated />
      <el-empty v-else-if="favoritePosts.length === 0" description="还没有收藏任何帖子喵~" />
      <el-row v-else :gutter="20">
        <el-col v-for="post in favoritePosts" :key="post.id" :xs="24" :sm="12" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="border-radius: 12px; height: 100%; cursor: pointer;" @click="goToPostDetail(post.id)">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <el-avatar :size="34" :src="post.avatar" />
              <div style="margin-left: 10px;">
                <div style="font-weight: bold; color: #303133;">{{ post.nickname || post.username }}</div>
                <div style="font-size: 12px; color: #909399;">{{ formatDate(post.created_at) }}</div>
              </div>
            </div>
            <p style="color: #606266; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">{{ postPreview(post.content) }}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #909399; font-size: 12px;">
              <span>评论 {{ post.comments ? post.comments.length : 0 }} · 收藏 {{ post.favorite_count }}</span>
              <el-button type="warning" plain size="small" :icon="StarFilled" @click.stop="toggleFavorite(post)">
                取消收藏
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

    </div>
  </div>
</template>
