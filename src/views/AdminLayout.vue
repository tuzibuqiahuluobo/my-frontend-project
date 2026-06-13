<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiRequest, clearStoredUser } from '../api'

const router = useRouter()
const activeTab = ref('users') // 默认选中的标签页

// 数据存储箱
const userList = ref([])
const postList = ref([])
const loading = ref(false)

// 1. 获取全量用户数据
const fetchAllUsers = async () => {
  loading.value = true
  try {
    userList.value = await apiRequest('/api/users')
  } catch (error) {
    ElMessage.error(error.message || '无法同步全球用户数据')
  } finally {
    loading.value = false
  }
}

// 2. 获取全量帖子数据
const fetchAllPosts = async () => {
  loading.value = true
  try {
    postList.value = await apiRequest('/api/posts')
  } catch (error) {
    ElMessage.error(error.message || '无法同步社区广播数据')
  } finally {
    loading.value = false
  }
}

// 3. 强制注销用户
const terminateUser = (uid, username) => {
  ElMessageBox.confirm(
    `确定要永久抹除用户 [${username}] 吗？该操作将清除其所有数据凭证！`,
    '⚠️ 最高警告',
    { confirmButtonText: '强制执行', cancelButtonText: '暂缓执行', type: 'error' }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/delete-user', {
        method: 'POST',
        body: JSON.stringify({ target_uid: uid })
      })
      ElMessage.success(data.message)
      fetchAllUsers() // 刷新用户仓
    } catch (error) {
      ElMessage.error(error.message || '指令发送失败')
    }
  })
}

// 4. 强制删除任何帖子
const obliteratePost = (postId) => {
  ElMessageBox.confirm(
    '确认要抹除这条社区动态吗？',
    '提示',
    { confirmButtonText: '强制删除任何帖子', cancelButtonText: '保留', type: 'warning' }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/delete-post', {
        method: 'POST',
        body: JSON.stringify({ post_id: postId })
      })
      ElMessage.success(data.message)
      fetchAllPosts() // 刷新帖子仓
    } catch (error) {
      ElMessage.error(error.message || '清除失败')
    }
  })
}

// 退出后台回到普通用户登录界面
const exitCommandCenter = () => {
  clearStoredUser()
  router.push('/login')
}

// 标签页切换时自动加载对应的数据
const handleTabClick = () => {
  if (activeTab.value === 'users') fetchAllUsers()
  if (activeTab.value === 'posts') fetchAllPosts()
}

onMounted(() => {
  fetchAllUsers() // 初始化进来先拉取用户数据
})
</script>

<template>
  <div class="admin-dashboard">
    <header class="admin-header">
      <div class="header-left">
        <span class="pulse-dot"></span>
        <h2>SunShine 管理中心 <span class="version-tag">SYSTEM OVERRIDE v1.0</span></h2>
      </div>
      <el-button type="danger" plain size="small" @click="exitCommandCenter">
        退出控制台
      </el-button>
    </header>

    <main class="admin-main">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick" type="card" class="custom-tabs">
        
        <el-tab-pane label="👤 全局用户矩阵" name="users">
          <el-table :data="userList" v-loading="loading" style="width: 100%" class="dark-table">
            <el-table-column prop="uid" label="UID" width="80" />
            <el-table-column label="头像" width="100">
              <template #default="scope">
                <el-avatar :size="30" :src="scope.row.avatar" />
              </template>
            </el-table-column>
            <el-table-column prop="username" label="管理员/用户代号" />
            <el-table-column prop="email" label="安全邮箱" />
            <el-table-column label="权限安全等级">
              <template #default="scope">
                <el-tag :type="scope.row.role === 2 ? 'danger' : 'info'" effect="dark">
                  {{ scope.row.role === 2 ? 'Level 2 超级管理员' : 'Level 0 普通用户' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="终极操作" width="150">
              <template #default="scope">
                <el-button 
                  v-if="scope.row.username !== '超级管理员'"
                  type="danger" 
                  size="small" 
                  @click="terminateUser(scope.row.uid, scope.row.username)"
                >
                  强制注销
                </el-button>
                <span v-else class="self-text">本人安全锁</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="💬 社区广播广场" name="posts">
          <el-table :data="postList" v-loading="loading" style="width: 100%" class="dark-table">
            <el-table-column prop="id" label="帖子ID" width="90" />
            <el-table-column prop="username" label="发布者" width="150" />
            <el-table-column prop="content" label="广播正文" show-overflow-tooltip />
            <el-table-column label="时间" width="180">
              <template #default="scope">
                {{ new Date(scope.row.created_at).toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="warning" size="small" @click="obliteratePost(scope.row.id)">
                  违规抹除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

      </el-tabs>
    </main>
  </div>
</template>

<style scoped>

.admin-dashboard {
  width: 100vw;
  height: 100vh;
  background-color: #141414; 
  color: #e5e7eb;
  font-family: 'Courier New', Courier, monospace; 
  display: flex;
  flex-direction: column;
}

.admin-header {
  height: 60px;
  background-color: #1f1f1f;
  border-bottom: 2px solid #ff4d4f; /* 标志性的危险红警示线 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  color: #ff4d4f;
  letter-spacing: 2px;
}

.version-tag {
  font-size: 11px;
  color: #8c8c8c;
  margin-left: 10px;
}

/* 呼吸灯特效点缀 */
.pulse-dot {
  width: 10px;
  height: 10px;
  background-color: #52c41a;
  border-radius: 50%;
  box-shadow: 0 0 10px #52c41a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 15px #52c41a; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.admin-main {
  flex-grow: 1;
  padding: 25px;
  overflow-y: auto;
}

.self-text {
  font-size: 12px;
  color: #52c41a;
}

/* 强行深度覆写 Element Plus 的样式，让其契合暗黑风 */
:deep(.el-tabs__item) {
  color: #a6a6a6 !important;
}
:deep(.el-tabs__item.is-active) {
  color: #ff4d4f !important;
  background-color: #1f1f1f !important;
  border-bottom-color: #141414 !important;
}
:deep(.el-table) {
  background-color: #1f1f1f !important;
  color: #e5e7eb !important;
}
:deep(.el-table th.el-table__cell) {
  background-color: #262626 !important;
  color: #ff4d4f !important;
  border-bottom: 1px solid #434343 !important;
}
:deep(.el-table td.el-table__cell) {
  background-color: #1f1f1f !important;
  border-bottom: 1px solid #262626 !important;
}
:deep(.el-table--enable-row-hover .el-table__body tr:hover>td.el-table__cell) {
  background-color: #262626 !important;
}
</style>
