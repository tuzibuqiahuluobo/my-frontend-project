<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import {
  ChatDotRound,
  Collection,
  Grid,
  Lock,
  Message,
  SwitchButton,
  User,
  UserFilled
} from '@element-plus/icons-vue'
import { apiRequest, clearStoredUser, getStoredUser, saveStoredUser } from '../api'
import { AVATAR_MAX_BYTES, IMAGE_ACCEPT, assertImageFile, isGifFile, readFileAsDataUrl } from '../utils/imageTools'
import { INPUT_LIMITS, normalizeEmail, validateEmailInput, validatePasswordInput, validateUsernameInput } from '../utils/inputRules'

const router = useRouter()
const activeTab = ref('overview')
const loading = ref(false)

const currentAdmin = ref({ uid: null, username: '', nickname: '', avatar: '', email: '', role: 2, token: '' })
const userList = ref([])
const postList = ref([])
const topicList = ref([])
const topicSearch = ref('')
const topicDialogVisible = ref(false)
const savingTopic = ref(false)
const topicForm = ref({
  topic_id: null,
  name: '',
  description: '',
  sort_order: 100,
  status: 'approved'
})
const topicStatusText = {
  pending: '待审核',
  approved: '已通过',
  disabled: '已停用',
  rejected: '已拒绝'
}
const topicStatusType = {
  pending: 'warning',
  approved: 'success',
  disabled: 'info',
  rejected: 'danger'
}
const activeTitle = computed(() => ({
  overview: '后台概览',
  profile: '管理员资料',
  users: '用户管理',
  posts: '动态管理',
  topics: '话题管理'
}[activeTab.value] || '后台概览'))
const filteredTopics = computed(() => {
  const keyword = topicSearch.value.trim().toLowerCase()
  if (!keyword) return topicList.value
  return topicList.value.filter(topic => {
    return `${topic.name} ${topic.description} ${topic.status}`.toLowerCase().includes(keyword)
  })
})

const adminForm = ref({
  username: '',
  email: '',
  avatar: '',
  password: '',
  currentPassword: ''
})
const savingAdmin = ref(false)
const fileInputRef = ref(null)
const cropDialogVisible = ref(false)
const cropperRef = ref(null)
const rawImageUrl = ref('')

const syncAdminForm = (user) => {
  // 表单和 localStorage 分开存，避免输入框未保存时就污染当前登录态。
  adminForm.value.username = user.username || ''
  adminForm.value.email = user.email || ''
  adminForm.value.avatar = user.avatar || ''
  adminForm.value.password = ''
  adminForm.value.currentPassword = ''
}

const loadCurrentAdmin = () => {
  const user = getStoredUser()
  if (!user) {
    router.push('/login')
    return
  }
  currentAdmin.value = user
  syncAdminForm(user)
}

const fetchAllUsers = async () => {
  loading.value = true
  try {
    userList.value = await apiRequest('/api/users')
  } catch (error) {
    ElMessage.error(error.message || '用户数据读取失败')
  } finally {
    loading.value = false
  }
}

const fetchAllPosts = async () => {
  loading.value = true
  try {
    postList.value = await apiRequest('/api/posts?all=1')
  } catch (error) {
    ElMessage.error(error.message || '帖子数据读取失败')
  } finally {
    loading.value = false
  }
}

const fetchAllTopics = async () => {
  loading.value = true
  try {
    topicList.value = await apiRequest('/api/admin/topics')
  } catch (error) {
    ElMessage.error(error.message || '话题数据读取失败')
  } finally {
    loading.value = false
  }
}

const openTopicDialog = (topic = null) => {
  // 新增：新增和编辑共用一个弹窗，初学阶段能少维护一套重复表单。
  topicForm.value = topic
    ? {
        topic_id: topic.id,
        name: topic.name,
        description: topic.description || '',
        sort_order: topic.sort_order || 100,
        status: topic.status || 'approved'
      }
    : {
        topic_id: null,
        name: '',
        description: '',
        sort_order: 100,
        status: 'approved'
      }
  topicDialogVisible.value = true
}

const saveTopic = async () => {
  if (!topicForm.value.name.trim()) {
    ElMessage.warning('请填写话题名称')
    return
  }
  savingTopic.value = true
  try {
    const isEditing = Boolean(topicForm.value.topic_id)
    const data = await apiRequest(isEditing ? '/api/admin/topics/update' : '/api/admin/topics/create', {
      method: 'POST',
      body: JSON.stringify({
        topic_id: topicForm.value.topic_id,
        name: topicForm.value.name.trim(),
        description: topicForm.value.description.trim(),
        sort_order: Number(topicForm.value.sort_order) || 100,
        status: topicForm.value.status
      })
    })
    ElMessage.success(data.message)
    topicDialogVisible.value = false
    fetchAllTopics()
  } catch (error) {
    ElMessage.error(error.message || '话题保存失败')
  } finally {
    savingTopic.value = false
  }
}

const reviewTopic = async (topic, status) => {
  try {
    const data = await apiRequest('/api/admin/topics/review', {
      method: 'POST',
      body: JSON.stringify({ topic_id: topic.id, status })
    })
    ElMessage.success(data.message)
    fetchAllTopics()
  } catch (error) {
    ElMessage.error(error.message || '话题状态更新失败')
  }
}

const deleteTopic = (topic) => {
  ElMessageBox.confirm(
    `确定删除话题「${topic.name}」吗？如果里面有帖子，会先迁移到综合社区。`,
    '删除话题',
    { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/admin/topics/delete', {
        method: 'POST',
        body: JSON.stringify({ topic_id: topic.id })
      })
      ElMessage.success(data.message)
      fetchAllTopics()
      fetchAllPosts()
    } catch (error) {
      ElMessage.error(error.message || '话题删除失败')
    }
  })
}

const saveAdminProfile = async () => {
  if (!adminForm.value.currentPassword) {
    ElMessage.warning('请输入当前密码后再保存')
    return
  }
  const usernameMessage = validateUsernameInput(adminForm.value.username)
  if (usernameMessage) {
    ElMessage.warning(usernameMessage)
    return
  }
  const emailMessage = validateEmailInput(adminForm.value.email)
  if (emailMessage) {
    ElMessage.warning(emailMessage)
    return
  }
  const passwordMessage = validatePasswordInput(adminForm.value.password, { allowEmpty: true })
  if (passwordMessage) {
    ElMessage.warning(passwordMessage)
    return
  }
  const currentPasswordMessage = validatePasswordInput(adminForm.value.currentPassword)
  if (currentPasswordMessage) {
    ElMessage.warning(currentPasswordMessage)
    return
  }
  adminForm.value.email = normalizeEmail(adminForm.value.email)

  savingAdmin.value = true
  try {
    const data = await apiRequest('/api/update-admin-profile', {
      method: 'POST',
      body: JSON.stringify({
        username: adminForm.value.username.trim(),
        email: adminForm.value.email,
        avatar: adminForm.value.avatar,
        password: adminForm.value.password.trim(),
        current_password: adminForm.value.currentPassword.trim()
      })
    })

    const nextAdmin = {
      uid: data.uid,
      username: data.username,
      nickname: data.nickname,
      avatar: data.avatar,
      email: data.email,
      role: data.role,
      token: data.token
    }
    currentAdmin.value = nextAdmin
    saveStoredUser(nextAdmin)
    syncAdminForm(nextAdmin)
    ElMessage.success(data.message)
    fetchAllUsers()
  } catch (error) {
    ElMessage.error(error.message || '管理员资料保存失败')
  } finally {
    savingAdmin.value = false
  }
}

const triggerAvatarUpload = () => {
  fileInputRef.value.click()
}

const onAvatarSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    assertImageFile(file, AVATAR_MAX_BYTES, '头像')
    if (isGifFile(file)) {
      // GIF 动图进入裁剪器会丢失动画，所以管理员头像也直接保存原始动图。
      adminForm.value.avatar = await readFileAsDataUrl(file)
      ElMessage.success('GIF 头像已选择，保存资料后生效')
      return
    }

    // FileReader 会把本地图片转成浏览器可预览的 base64，裁剪器需要这个格式来显示图片。
    rawImageUrl.value = await readFileAsDataUrl(file)
    cropDialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '头像读取失败，请重新选择')
  } finally {
    event.target.value = ''
  }
}

const confirmAvatarCrop = () => {
  if (!cropperRef.value) return
  cropperRef.value.getCropData((data) => {
    adminForm.value.avatar = data
    cropDialogVisible.value = false
  })
}

const terminateUser = (uid, username) => {
  ElMessageBox.confirm(
    `确定要永久删除用户 [${username}] 吗？`,
    '删除用户',
    { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/delete-user', {
        method: 'POST',
        body: JSON.stringify({ target_uid: uid })
      })
      ElMessage.success(data.message)
      fetchAllUsers()
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  })
}

const obliteratePost = (postId) => {
  ElMessageBox.confirm(
    '确认删除这条社区动态吗？',
    '删除帖子',
    { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const data = await apiRequest('/api/delete-post', {
        method: 'POST',
        body: JSON.stringify({ post_id: postId })
      })
      ElMessage.success(data.message)
      fetchAllPosts()
    } catch (error) {
      ElMessage.error(error.message || '删除失败')
    }
  })
}

const exitCommandCenter = () => {
  clearStoredUser()
  router.push('/login')
}

const handleTabClick = () => {
  if (activeTab.value === 'users') fetchAllUsers()
  if (activeTab.value === 'posts') fetchAllPosts()
  if (activeTab.value === 'topics') fetchAllTopics()
}

onMounted(() => {
  loadCurrentAdmin()
  fetchAllUsers()
  fetchAllPosts()
  fetchAllTopics()
})
</script>

<template>
  <div class="admin-dashboard">
    <aside class="admin-sidebar">
      <div class="brand-block">
        <img src="/sunshine-icon.jpg" alt="SunShine" class="brand-logo">
        <div>
          <h2>SunShine</h2>
          <p>Admin Console</p>
        </div>
      </div>

      <div class="admin-profile-card">
        <el-avatar :size="64" :src="currentAdmin.avatar" />
        <strong>{{ currentAdmin.username }}</strong>
        <span>{{ currentAdmin.email || '未绑定邮箱' }}</span>
      </div>

      <el-menu v-model:default-active="activeTab" class="admin-menu" @select="activeTab = $event; handleTabClick()">
        <el-menu-item index="overview">
          <el-icon><Grid /></el-icon>
          <template #title>概览</template>
        </el-menu-item>
        <el-menu-item index="profile">
          <el-icon><User /></el-icon>
          <template #title>管理员资料</template>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><UserFilled /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="posts">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>动态管理</template>
        </el-menu-item>
        <el-menu-item index="topics">
          <el-icon><Collection /></el-icon>
          <template #title>话题管理</template>
        </el-menu-item>
      </el-menu>

      <el-button class="logout-button" type="danger" plain :icon="SwitchButton" @click="exitCommandCenter">
        退出后台
      </el-button>
    </aside>

    <main class="admin-main">
      <header class="content-header">
        <div>
          <span class="eyebrow">SunShine 管理中心</span>
          <h1>{{ activeTitle }}</h1>
        </div>
      </header>

      <section class="summary-grid">
        <div class="summary-card primary">
          <div class="summary-icon"><el-icon><UserFilled /></el-icon></div>
          <div>
            <span>用户总数</span>
            <strong>{{ userList.length }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon"><el-icon><ChatDotRound /></el-icon></div>
          <div>
            <span>动态总数</span>
            <strong>{{ postList.length }}</strong>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon"><el-icon><Message /></el-icon></div>
          <div>
            <span>管理员邮箱</span>
            <strong>{{ currentAdmin.email || '未记录' }}</strong>
          </div>
        </div>
      </section>

      <section class="workspace">
        <div v-if="activeTab === 'overview'" class="panel overview-panel">
          <div class="overview-copy">
            <h3>站点运行概览</h3>
            <p>这里集中展示用户、社区动态和管理员资料状态。左侧导航用于快速切换后台模块。</p>
          </div>
          <div class="overview-list">
            <div>
              <span>当前管理员</span>
              <strong>{{ currentAdmin.username }}</strong>
            </div>
            <div>
              <span>权限等级</span>
              <strong>超级管理员</strong>
            </div>
            <div>
              <span>可执行操作</span>
              <strong>用户管理 / 动态管理 / 资料维护</strong>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'profile'" class="panel profile-panel">
          <div class="profile-preview">
            <el-tooltip content="点击更换头像" placement="top">
              <div class="avatar-edit-trigger" @click="triggerAvatarUpload">
                <el-avatar :size="88" :src="adminForm.avatar" />
                <span>更换头像</span>
              </div>
            </el-tooltip>
            <h3>{{ adminForm.username || '超级管理员' }}</h3>
            <p>{{ adminForm.email || '未填写邮箱' }}</p>
            <input ref="fileInputRef" type="file" :accept="IMAGE_ACCEPT" style="display: none;" @change="onAvatarSelected">
          </div>
          <div class="panel">
            <h3>修改超级管理员资料</h3>
            <el-form label-width="100px" class="admin-form">
              <el-form-item label="账号">
                <el-input v-model="adminForm.username" :prefix-icon="User" placeholder="请输入管理员账号" :maxlength="INPUT_LIMITS.usernameMax" show-word-limit />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="adminForm.email" :prefix-icon="Message" placeholder="请输入管理员邮箱" :maxlength="INPUT_LIMITS.emailMax" />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="adminForm.password" :prefix-icon="Lock" type="password" show-password placeholder="不修改请留空，8-32位且含大小写字母和数字" :maxlength="INPUT_LIMITS.passwordMax" />
              </el-form-item>
              <el-form-item label="当前密码">
                <el-input v-model="adminForm.currentPassword" :prefix-icon="Lock" type="password" show-password placeholder="保存前必须输入当前密码" :maxlength="INPUT_LIMITS.passwordMax" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="savingAdmin" @click="saveAdminProfile">保存管理员资料</el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div v-if="activeTab === 'users'" class="panel">
          <div class="section-title">
            <h3>用户列表</h3>
            <span>{{ userList.length }} 个账号</span>
          </div>
          <div class="panel">
            <el-table :data="userList" v-loading="loading" style="width: 100%">
              <el-table-column prop="uid" label="UID" width="80" />
              <el-table-column label="头像" width="90">
                <template #default="scope">
                  <el-avatar :size="32" :src="scope.row.avatar" />
                </template>
              </el-table-column>
              <el-table-column prop="username" label="账号" />
              <el-table-column prop="email" label="邮箱" />
              <el-table-column label="角色" width="140">
                <template #default="scope">
                  <el-tag :type="scope.row.role === 2 ? 'danger' : 'info'">
                    {{ scope.row.role === 2 ? '超级管理员' : '普通用户' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="130">
                <template #default="scope">
                  <el-button
                    v-if="scope.row.uid !== currentAdmin.uid && scope.row.role !== 2"
                    type="danger"
                    size="small"
                    plain
                    @click="terminateUser(scope.row.uid, scope.row.username)"
                  >
                    删除用户
                  </el-button>
                  <span v-else class="safe-text">受保护</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-if="activeTab === 'posts'" class="panel">
          <div class="section-title">
            <h3>社区动态</h3>
            <span>{{ postList.length }} 条内容</span>
          </div>
          <div class="panel">
            <el-table :data="postList" v-loading="loading" style="width: 100%">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="topic_name" label="话题" width="130" />
              <el-table-column prop="username" label="发布者" width="150" />
              <el-table-column prop="content" label="内容" show-overflow-tooltip />
              <el-table-column label="时间" width="180">
                <template #default="scope">
                  {{ new Date(scope.row.created_at).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button type="warning" size="small" plain @click="obliteratePost(scope.row.id)">
                    删除动态
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <div v-if="activeTab === 'topics'" class="panel">
          <div class="section-title">
            <h3>话题列表</h3>
            <span>{{ topicList.length }} 个话题</span>
          </div>
          <div class="topic-toolbar">
            <el-input v-model="topicSearch" placeholder="搜索话题名称、简介或状态" clearable />
            <el-button type="primary" @click="openTopicDialog()">新增话题</el-button>
          </div>
          <div class="panel">
            <el-table :data="filteredTopics" v-loading="loading" style="width: 100%">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="话题名称" width="150" />
              <el-table-column prop="description" label="简介" show-overflow-tooltip />
              <el-table-column prop="post_count" label="帖子数" width="90" />
              <el-table-column prop="sort_order" label="排序" width="90" />
              <el-table-column label="状态" width="110">
                <template #default="scope">
                  <el-tag :type="topicStatusType[scope.row.status] || 'info'">
                    {{ topicStatusText[scope.row.status] || scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="审核" width="230">
                <template #default="scope">
                  <el-button size="small" plain type="success" @click="reviewTopic(scope.row, 'approved')">通过</el-button>
                  <el-button size="small" plain type="info" @click="reviewTopic(scope.row, 'disabled')">停用</el-button>
                  <el-button size="small" plain type="danger" @click="reviewTopic(scope.row, 'rejected')">拒绝</el-button>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="170">
                <template #default="scope">
                  <el-button size="small" plain @click="openTopicDialog(scope.row)">编辑</el-button>
                  <el-button size="small" plain type="danger" @click="deleteTopic(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </section>
    </main>

    <el-dialog v-model="topicDialogVisible" :title="topicForm.topic_id ? '编辑话题' : '新增话题'" width="520px" align-center>
      <el-form label-width="90px" class="topic-form">
        <el-form-item label="话题名称">
          <el-input v-model="topicForm.name" maxlength="20" show-word-limit placeholder="例如：学习交流" />
        </el-form-item>
        <el-form-item label="话题简介">
          <el-input v-model="topicForm.description" type="textarea" maxlength="120" show-word-limit :rows="3" placeholder="简单说明这个话题适合发布什么内容" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="topicForm.sort_order" :min="1" :max="999" />
        </el-form-item>
        <el-form-item v-if="!topicForm.topic_id" label="初始状态">
          <el-select v-model="topicForm.status">
            <el-option label="已通过" value="approved" />
            <el-option label="待审核" value="pending" />
            <el-option label="已停用" value="disabled" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="topicDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingTopic" @click="saveTopic">保存话题</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="cropDialogVisible" title="裁剪管理员头像" width="500px" align-center destroy-on-close>
      <div style="height: 300px; width: 100%;">
        <vue-cropper
          ref="cropperRef"
          :img="rawImageUrl"
          :autoCrop="true"
          :autoCropWidth="200"
          :autoCropHeight="200"
          :fixedBox="true"
          :infoTrue="true"
          outputType="png"
        />
      </div>
      <template #footer>
        <el-button @click="cropDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAvatarCrop">确认裁剪</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background: #f4f7fb;
  color: #303133;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
}

.admin-sidebar {
  min-height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e5eaf3;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-block h2 {
  margin: 0;
  font-size: 19px;
  color: #1f2d3d;
}

.brand-block p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
}

.admin-profile-card {
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  padding: 18px;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.admin-profile-card strong {
  font-size: 16px;
}

.admin-profile-card span {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.admin-menu {
  border-right: none;
}

.logout-button {
  margin-top: auto;
}

.admin-main {
  padding: 30px;
  overflow: auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 22px;
}

.eyebrow {
  color: #409eff;
  font-size: 13px;
  font-weight: 600;
}

.content-header h1 {
  margin: 6px 0 0;
  font-size: 28px;
  color: #1f2d3d;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.summary-card {
  background: #ffffff;
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 10px 28px rgba(31, 45, 61, 0.05);
}

.summary-card.primary {
  border-color: #b3d8ff;
}

.summary-icon {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409eff;
  display: grid;
  place-items: center;
  font-size: 24px;
}

.summary-card span {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-card strong {
  font-size: 20px;
  color: #303133;
  word-break: break-all;
}

.workspace {
  background: #ffffff;
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 12px 32px rgba(31, 45, 61, 0.06);
}

.overview-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 20px;
}

.overview-copy {
  background: #f8fbff;
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  padding: 22px;
}

.overview-list {
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  overflow: hidden;
}

.overview-list div {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #edf2f7;
}

.overview-list div:last-child {
  border-bottom: none;
}

.overview-list span {
  color: #909399;
  font-size: 13px;
}

.overview-list strong {
  color: #303133;
  font-size: 14px;
  text-align: right;
}

.profile-panel {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 24px;
}

.profile-preview {
  border: 1px solid #e5eaf3;
  border-radius: 8px;
  background: #f8fbff;
  padding: 24px;
  text-align: center;
}

.profile-preview h3 {
  margin: 14px 0 6px;
}

.profile-preview p {
  margin: 0;
  color: #909399;
  font-size: 13px;
  word-break: break-all;
}

.avatar-edit-trigger {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar-edit-trigger span {
  color: #409eff;
  font-size: 13px;
}

.panel h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.panel p {
  margin: 0;
  color: #606266;
  line-height: 1.7;
}

.admin-form {
  max-width: 680px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.section-title h3 {
  margin: 0;
}

.section-title span {
  color: #909399;
  font-size: 13px;
}

.topic-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 12px;
  margin-bottom: 14px;
}

.topic-form {
  padding-right: 10px;
}

.safe-text {
  color: #909399;
  font-size: 13px;
}

@media (max-width: 760px) {
  .admin-dashboard {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    min-height: auto;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .admin-main {
    padding: 16px;
  }

  .overview-panel,
  .profile-panel {
    grid-template-columns: 1fr;
  }
}
</style>
