<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Star, StarFilled, Delete } from '@element-plus/icons-vue'
import { apiRequest, getStoredUser, isAdmin } from '../api'
import TwemojiIcon from '../components/TwemojiIcon.vue'
import { buildTwemojiCatalog, findTwemojiByCodePoint } from '../utils/twemojiCatalog'

const router = useRouter()
const posts = ref([])
const loading = ref(true)

// 【新增】发帖相关的变量
const currentUser = ref({ uid: null, username: '匿名', nickname: '', avatar: '', role: 0, token: '' })
const newPostContent = ref('')
const isSubmitting = ref(false)
const emojiPageSize = 40
const emojiPage = ref(1)
// 表情数据由 Twemoji 解析器筛选生成，不在页面代码里手动维护一长串 emoji。
const emojiList = buildTwemojiCatalog()
const emojiButtonIcon = findTwemojiByCodePoint(0x1F642)
const emojiPageCount = computed(() => Math.ceil(emojiList.length / emojiPageSize))
const pagedEmojiList = computed(() => {
  const start = (emojiPage.value - 1) * emojiPageSize
  return emojiList.slice(start, start + emojiPageSize)
})

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
    // 如果用户已登录，apiRequest 会自动带上 token，后端会据此判断哪些帖子已收藏
    const data = await apiRequest('/api/posts')
    // 刷新后：去字典里核对，之前是展开的就保持展开，如果是新帖子就默认折叠(false)
    posts.value = data.map(post => ({ 
      ...post, 
      showComments: stateMap[post.id] || false 
    }))
  } catch (error) {
    console.error("获取帖子失败", error)
    ElMessage.error(error.message || '获取帖子失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 1. 页面加载时，先看看是谁在登录
  const user = getStoredUser()
  if (user) {
    currentUser.value = user
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
    const data = await apiRequest('/api/create-post', {
      method: 'POST',
      body: JSON.stringify({
        content: newPostContent.value
      })
    })

    ElMessage.success(data.message)
    newPostContent.value = '' // 清空输入框
    loadPosts() // 加载新帖子
  } catch (error) {
    ElMessage.error(error.message || '网络错误，发送失败')
  } finally {
    isSubmitting.value = false
  }
}

const addEmojiToPost = (emoji) => {
  // 点击表情时直接追加到输入框末尾，初学阶段这样最直观，也不会打断已有输入内容。
  newPostContent.value += emoji
}

const goToPostDetail = (postId) => {
  // 详情页使用帖子 id 做路由参数，这样刷新页面也能重新向后端读取同一条帖子。
  router.push(`/main/community/post/${postId}`)
}

// 发表评论逻辑
const submitComment = async (postId) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) {
    ElMessage.warning('评论内容不能为空哦')
    return
  }

  try {
    const data = await apiRequest('/api/create-comment', {
      method: 'POST',
      body: JSON.stringify({
        post_id: postId,
        content: content
      })
    })
    ElMessage.success(data.message)
    commentInputs.value[postId] = '' // 清空输入框
    loadPosts() // 刷新列表，带出最新评论
  } catch (error) { ElMessage.error(error.message || '评论发送失败') }
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
    
    <el-card class="publish-card" shadow="never">
      <div class="publish-area">
        <el-avatar :size="45" :src="currentUser.avatar" />
        <div class="publish-main">
          <el-input
            v-model="newPostContent"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            maxlength="20000"
            show-word-limit
            placeholder="有什么新鲜事想和大家分享？（支持回车换行）"
            class="publish-input"
          />

          <div class="publish-action">
            <el-popover placement="bottom-start" trigger="click" width="340">
              <template #reference>
                <button class="emoji-trigger" type="button" title="添加表情">
                  <TwemojiIcon :emoji="emojiButtonIcon" />
                </button>
              </template>
              <div class="emoji-panel">
                <button
                  v-for="emoji in pagedEmojiList"
                  :key="emoji"
                  class="emoji-item"
                  type="button"
                  @click="addEmojiToPost(emoji)"
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
            <el-button 
              type="primary" 
              :loading="isSubmitting" 
              @click="submitPost" 
              round
              size="large"
              color="#38bdf8"
              class="publish-button"
            >
              立即发布
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-skeleton :rows="5" animated v-if="loading" />

    <div v-else class="post-list">
      <el-card v-for="post in posts" :key="post.id" class="post-card" shadow="hover">
        
        <div class="post-header">
          <el-avatar :size="40" :src="post.avatar" />
          <div class="user-info">
            <span class="username">{{ post.nickname || post.username }}</span>
            <span v-if="post.signature" class="signature">{{ post.signature }}</span>
            <span class="time">{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
        
        <div class="post-content" @click="goToPostDetail(post.id)">
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

            <div class="right-actions" v-if="post.username === currentUser.username || isAdmin(currentUser)">
              <el-button type="danger" link :icon="Delete" @click="deletePost(post.id)">
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
                      <div style="display: flex; gap: 10px; align-items: baseline;">
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
  align-items: flex-start;
}

.publish-main {
  flex: 1;
  min-width: 0;
}

.publish-input {
  flex-grow: 1;
}

.publish-action {
  display: flex;
  justify-content: space-between; /* 表情在输入框左侧，发布按钮保持在右侧 */
  align-items: center;
  gap: 10px;
  width: 100%;              
  margin-top: 15px;
}

.emoji-trigger {
  width: 42px;
  height: 42px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.emoji-trigger:hover {
  border-color: #38bdf8;
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.22);
  transform: translateY(-1px);
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

.signature {
  font-size: 12px;
  color: #6b7280;
  margin-top: 3px;
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 15px;
  white-space: pre-wrap;
  cursor: pointer;
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
