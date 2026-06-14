<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import {
  ChatDotRound,
  Grid,
  Lock,
  Message,
  SwitchButton,
  User,
  UserFilled
} from '@element-plus/icons-vue'
import { apiRequest, clearStoredUser, getStoredUser, saveStoredUser } from '../api'
import { INPUT_LIMITS, normalizeEmail, validateEmailInput, validatePasswordInput, validateUsernameInput } from '../utils/inputRules'

const router = useRouter()
const activeTab = ref('overview')
const loading = ref(false)

const currentAdmin = ref({ uid: null, username: '', nickname: '', avatar: '', email: '', role: 2, token: '' })
const userList = ref([])
const postList = ref([])

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
    postList.value = await apiRequest('/api/posts')
  } catch (error) {
    ElMessage.error(error.message || '帖子数据读取失败')
  } finally {
    loading.value = false
  }
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

const onAvatarSelected = (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片太大啦！请上传 2MB 以内的图片。')
    return
  }

  // FileReader 会把本地图片转成浏览器可预览的 base64，裁剪器需要这个格式来显示图片。
  const reader = new FileReader()
  reader.onload = (e) => {
    rawImageUrl.value = e.target.result
    cropDialogVisible.value = true
  }
  reader.readAsDataURL(file)
  event.target.value = ''
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
}

onMounted(() => {
  loadCurrentAdmin()
  fetchAllUsers()
  fetchAllPosts()
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
      </el-menu>

      <el-button class="logout-button" type="danger" plain :icon="SwitchButton" @click="exitCommandCenter">
        退出后台
      </el-button>
    </aside>

    <main class="admin-main">
      <header class="content-header">
        <div>
          <span class="eyebrow">SunShine 管理中心</span>
          <h1>{{ activeTab === 'overview' ? '后台概览' : activeTab === 'profile' ? '管理员资料' : activeTab === 'users' ? '用户管理' : '动态管理' }}</h1>
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
            <input ref="fileInputRef" type="file" accept="image/*" style="display: none;" @change="onAvatarSelected">
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
                <el-input v-model="adminForm.password" :prefix-icon="Lock" type="password" show-password placeholder="不修改请留空，6-32位" :maxlength="INPUT_LIMITS.passwordMax" />
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
      </section>
    </main>

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
