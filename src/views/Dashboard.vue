<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MagicStick, Setting, StarFilled } from '@element-plus/icons-vue'
import { apiRequest, clearStoredUser, getStoredUser, saveStoredUser } from '../api'
import PostImageGrid from '../components/PostImageGrid.vue'
import { personalBackgroundStyle } from '../utils/personalStyle'

const route = useRoute()
const router = useRouter()
const currentUser = ref({ uid: null, username: '', nickname: '', signature: '', avatar: '' })
const profileUser = ref({ uid: null, username: '', nickname: '', signature: '', avatar: '' })
const userPosts = ref([])
const favoritePosts = ref([])
const profileLoading = ref(false)
const postsLoading = ref(false)
const favoritesLoading = ref(false)

const viewedUid = computed(() => Number(route.params.uid || currentUser.value.uid || 0))
const isSelfProfile = computed(() => Number(profileUser.value.uid) === Number(currentUser.value.uid))
const pageTitle = computed(() => (isSelfProfile.value ? '个人中心' : `${profileUser.value.nickname || profileUser.value.username || '用户'}的主页`))
const pageStyle = computed(() => personalBackgroundStyle(profileUser.value))

const loadStoredUser = () => {
  const user = getStoredUser()
  if (!user) {
    router.push('/login')
    return false
  }
  currentUser.value = user
  return true
}

const refreshCurrentUser = async () => {
  try {
    const freshUser = await apiRequest('/api/me')
    // token 只存在本地登录信息里，后端 /api/me 不需要重复返回 token。
    currentUser.value = { ...currentUser.value, ...freshUser, token: currentUser.value.token }
    saveStoredUser(currentUser.value)
  } catch (error) {
    console.warn('刷新当前用户资料失败', error)
  }
}

const loadProfileUser = async () => {
  if (!viewedUid.value) return
  profileLoading.value = true
  try {
    if (Number(viewedUid.value) === Number(currentUser.value.uid)) {
      await refreshCurrentUser()
      profileUser.value = { ...currentUser.value }
    } else {
      profileUser.value = await apiRequest(`/api/user-profile?uid=${viewedUid.value}`)
    }
  } catch (error) {
    ElMessage.error(error.message || '用户主页读取失败')
  } finally {
    profileLoading.value = false
  }
}

const loadUserPosts = async () => {
  if (!viewedUid.value) return
  postsLoading.value = true
  try {
    // “我的帖子”按 uid 读取，别人主页也能复用这一套列表。
    userPosts.value = await apiRequest(`/api/user-posts?uid=${viewedUid.value}`)
  } catch (error) {
    ElMessage.error(error.message || '帖子列表读取失败')
  } finally {
    postsLoading.value = false
  }
}

const loadFavoritePosts = async () => {
  if (!isSelfProfile.value) return
  favoritesLoading.value = true
  try {
    favoritePosts.value = await apiRequest('/api/my-favorites')
  } catch (error) {
    ElMessage.error(error.message || '收藏列表读取失败')
  } finally {
    favoritesLoading.value = false
  }
}

const loadPageData = async () => {
  if (!loadStoredUser()) return
  await loadProfileUser()
  await loadUserPosts()
  await loadFavoritePosts()
}

const logout = () => {
  clearStoredUser()
  ElMessage.info('已安全退出')
  router.push('/login')
}

const goToProfile = () => {
  router.push('/main/settings/profile')
}

const goToDressUp = () => {
  router.push('/main/settings/profile?tab=style')
}

const goToUserProfile = (uid) => {
  if (!uid) return
  router.push(Number(uid) === Number(currentUser.value.uid) ? '/main/dashboard' : `/main/user/${uid}`)
}

const toggleFavorite = async (post) => {
  try {
    await apiRequest('/api/toggle-favorite', {
      method: 'POST',
      body: JSON.stringify({ post_id: post.id })
    })
    favoritePosts.value = favoritePosts.value.filter(item => item.id !== post.id)
    ElMessage.success('已取消收藏')
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

const formatDate = (timeString) => {
  const date = new Date(timeString)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const goToPostDetail = (postId) => {
  router.push(`/main/community/post/${postId}`)
}

const postImages = (post) => {
  if (Array.isArray(post.images) && post.images.length > 0) return post.images
  return post.image ? [post.image] : []
}

const hasPostTitle = (post) => String(post.title || '').trim() !== ''
const getPostTags = (post) => Array.isArray(post.tags) ? post.tags.filter(Boolean) : []
const shouldShowTopic = (post) => post.topic_name && post.topic_name !== '综合社区'

const postPreview = (content, hasImage = false) => {
  const text = String(content || '').trim()
  if (!text && hasImage) return '图片动态'
  return text.length > 100 ? `${text.slice(0, 100)}...` : text
}

onMounted(loadPageData)

watch(() => route.params.uid, loadPageData)
</script>

<template>
  <div class="dashboard-page personalized-page" :style="pageStyle">
    <div class="dashboard-inner">
      <div class="dashboard-header">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-button v-if="isSelfProfile" type="danger" plain @click="logout">退出登录</el-button>
      </div>

      <el-card shadow="never" class="profile-card" v-loading="profileLoading">
        <div class="profile-row">
          <el-avatar :src="profileUser.avatar" :size="84" class="profile-avatar" />
          <div class="profile-info">
            <h2 class="profile-name">{{ profileUser.nickname || profileUser.username }}</h2>
            <p class="profile-signature">{{ profileUser.signature || '这个人还没有写个性签名' }}</p>
            <p class="profile-uid">UID: {{ String(profileUser.uid || '').padStart(5, '0') }} · 帖子 {{ profileUser.post_count || userPosts.length }}</p>
            <div v-if="isSelfProfile" class="profile-actions">
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

      <h3 class="section-title">我的帖子</h3>
      <el-skeleton v-if="postsLoading" :rows="4" animated />
      <el-empty v-else-if="userPosts.length === 0" description="暂无帖子喵~" />
      <div v-else class="post-grid">
        <el-card v-for="post in userPosts" :key="post.id" shadow="hover" class="mini-post-card" @click="goToPostDetail(post.id)">
          <h4 v-if="hasPostTitle(post)" class="mini-post-title">{{ post.title }}</h4>
          <div v-if="shouldShowTopic(post) || getPostTags(post).length" class="pill-row">
            <el-tag v-if="shouldShowTopic(post)" class="topic-tag" size="small" effect="plain">{{ post.topic_name }}</el-tag>
            <span v-for="tag in getPostTags(post)" :key="tag" class="tag-pill">#{{ tag }}</span>
          </div>
          <PostImageGrid :images="postImages(post)" compact />
          <p class="mini-post-preview">{{ postPreview(post.content, postImages(post).length > 0) }}</p>
          <div class="mini-post-meta">
            <span>{{ formatDate(post.created_at) }}</span>
            <span>评论 {{ post.comments ? post.comments.length : 0 }} · 收藏 {{ post.favorite_count }}</span>
          </div>
        </el-card>
      </div>

      <template v-if="isSelfProfile">
        <h3 class="section-title favorite-title">我的收藏</h3>
        <el-skeleton v-if="favoritesLoading" :rows="4" animated />
        <el-empty v-else-if="favoritePosts.length === 0" description="还没有收藏任何帖子喵~" />
        <el-row v-else :gutter="20">
          <el-col v-for="post in favoritePosts" :key="post.id" :xs="24" :sm="12" style="margin-bottom: 20px;">
            <el-card shadow="hover" class="favorite-card" @click="goToPostDetail(post.id)">
              <div class="favorite-author-row">
                <el-avatar :size="34" :src="post.avatar" class="clickable-user" @click.stop="goToUserProfile(post.author_uid)" />
                <div style="margin-left: 10px;">
                  <div class="favorite-author clickable-user" @click.stop="goToUserProfile(post.author_uid)">{{ post.nickname || post.username }}</div>
                  <div class="favorite-time">{{ formatDate(post.created_at) }}</div>
                </div>
              </div>
              <h4 v-if="hasPostTitle(post)" class="favorite-post-title">{{ post.title }}</h4>
              <div v-if="shouldShowTopic(post) || getPostTags(post).length" class="pill-row">
                <el-tag v-if="shouldShowTopic(post)" class="topic-tag" size="small" effect="plain">{{ post.topic_name }}</el-tag>
                <span v-for="tag in getPostTags(post)" :key="tag" class="tag-pill">#{{ tag }}</span>
              </div>
              <PostImageGrid :images="postImages(post)" compact />
              <p class="favorite-preview">{{ postPreview(post.content, postImages(post).length > 0) }}</p>
              <div class="favorite-meta">
                <span>评论 {{ post.comments ? post.comments.length : 0 }} · 收藏 {{ post.favorite_count }}</span>
                <el-button type="warning" plain size="small" :icon="StarFilled" @click.stop="toggleFavorite(post)">
                  取消收藏
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  padding: 40px 20px;
  background-color: #f0f2f5;
  background-image: linear-gradient(rgba(240, 242, 245, var(--sunshine-bg-opacity)), rgba(240, 242, 245, var(--sunshine-bg-opacity))), var(--sunshine-page-bg);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.dashboard-inner {
  max-width: 920px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title,
.profile-name,
.section-title,
.favorite-author {
  color: #303133;
}

.page-title,
.profile-name {
  margin: 0;
}

.profile-card,
.favorite-card,
.mini-post-card {
  border-radius: 12px;
}

.profile-card {
  margin-bottom: 30px;
}

.profile-row,
.favorite-author-row {
  display: flex;
  align-items: center;
}

.profile-avatar {
  border: 3px solid rgba(255, 255, 255, 0.9);
  margin-right: 28px;
}

.profile-info {
  flex-grow: 1;
}

.profile-name {
  margin-bottom: 10px;
}

.profile-uid,
.profile-signature,
.favorite-time,
.favorite-meta,
.mini-post-meta {
  color: #909399;
  font-size: 12px;
}

.profile-uid {
  margin: 0 0 15px 0;
  font-size: 14px;
}

.profile-signature {
  margin: 0 0 6px 0;
  font-size: 13px;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  margin: 28px 0 18px;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.mini-post-card,
.favorite-card {
  height: 100%;
  cursor: pointer;
}

.mini-post-title,
.favorite-post-title {
  margin: 0 0 10px;
  color: #303133;
  font-size: 15px;
  line-height: 1.4;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag-pill {
  border-radius: 999px;
  padding: 5px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 12px;
  line-height: 1;
}

.topic-tag {
  border-radius: 999px;
}

.mini-post-preview,
.favorite-preview {
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.mini-post-meta,
.favorite-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.clickable-user {
  cursor: pointer;
}

.clickable-user:hover {
  color: var(--sunshine-theme-start);
}

:deep(.el-button--primary) {
  --el-button-bg-color: var(--sunshine-theme-start);
  --el-button-border-color: var(--sunshine-theme-start);
  --el-button-hover-bg-color: var(--sunshine-theme-end);
  --el-button-hover-border-color: var(--sunshine-theme-end);
}

@media (max-width: 720px) {
  .profile-row {
    align-items: flex-start;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }
}
</style>
