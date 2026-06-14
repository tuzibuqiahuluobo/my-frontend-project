<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus' // 新增引入 ElMessageBox
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { apiRequest, getStoredUser, saveStoredUser } from '../api'
import { INPUT_LIMITS, validateNicknameInput, validatePasswordInput, validateUsernameInput } from '../utils/inputRules'

const router = useRouter()
// 新增 nickname 字段
const currentUser = ref({ uid: null, username: '', nickname: '', signature: '', avatar: '', role: 0, token: '' })

// 表单绑定的独立变量
const editNickname = ref('') // 新增：昵称输入框
const editSignature = ref('') // 新增：个性签名单独绑定，方便在保存前统一校验 50 字限制
const editUsername = ref('')
const editPassword = ref('')
const saving = ref(false)

// 裁剪器相关状态
const fileInputRef = ref(null)
const cropDialogVisible = ref(false)
const cropperRef = ref(null)
const rawImageUrl = ref('')

onMounted(() => {
  const user = getStoredUser()
  if (!user) {
    router.push('/login')
  } else {
    currentUser.value = user
    editUsername.value = currentUser.value.username
    // 初始化昵称，如果没有设置过，默认先显示用户名兜底
    editNickname.value = currentUser.value.nickname || currentUser.value.username 
    editSignature.value = currentUser.value.signature || ''
  }
})

// 【优化】将参数改为对象形式，方便后续无限扩展，清晰明了
const updateProfile = async ({ newUsername, newAvatar, newPassword, newNickname, newSignature, currentPassword }) => {
  saving.value = true
  const requestBody = {
    username: newUsername || '',
    avatar: newAvatar || '',
    password: newPassword || '',
    nickname: newNickname || '',                 // 传给后端的昵称
    current_password: currentPassword || ''      // 传给后端用于修改用户名的验证密码
  }
  if (newSignature !== undefined) {
    // 签名允许清空，所以只有确实修改过时才提交；提交空字符串代表清空签名。
    requestBody.signature = newSignature
  }

  try {
    const data = await apiRequest('/api/update', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    ElMessage.success(data.message || '资料更新成功！')
    currentUser.value = {
      uid: data.uid,
      username: data.username,
      nickname: data.nickname,
      signature: data.signature,
      avatar: data.avatar,
      role: data.role,
      token: data.token
    }
    editUsername.value = currentUser.value.username
    editNickname.value = currentUser.value.nickname || currentUser.value.username
    editSignature.value = currentUser.value.signature || ''
    saveStoredUser(currentUser.value)
    cropDialogVisible.value = false
    
    // 如果改了昵称或头像，轻微延迟刷新让右上角用户信息同步
    if (newNickname || newAvatar || newSignature !== undefined) {
      setTimeout(() => window.location.reload(), 500)
    }
  } catch (error) {
    ElMessage.error(error.message || '网络错误，请稍后再试')
  } finally {
    saving.value = false
  }
}

// ---- 头像裁剪流程 ----
const triggerFileUpload = () => {
  fileInputRef.value.click()
}

const onFileSelected = (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片太大啦！请上传 2MB 以内的图片。')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    rawImageUrl.value = e.target.result
    cropDialogVisible.value = true
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

const confirmCrop = () => {
  if (!cropperRef.value) return
  cropperRef.value.getCropData((data) => {
    updateProfile({ newAvatar: data }) // 仅更新头像
  })
}

const saveAllProfile = () => {
  const newNickname = editNickname.value.trim()
  const newSignature = editSignature.value.trim()
  const newUsername = editUsername.value.trim()
  const newPassword = editPassword.value.trim()

  if (!newNickname) {
    ElMessage.warning('昵称不能为空哦')
    return
  }
  if (!newUsername) {
    ElMessage.warning('用户名不能为空哦')
    return
  }
  const nicknameMessage = validateNicknameInput(newNickname)
  if (nicknameMessage) {
    ElMessage.warning(nicknameMessage)
    return
  }
  const usernameMessage = validateUsernameInput(newUsername)
  if (usernameMessage) {
    ElMessage.warning(usernameMessage)
    return
  }
  const passwordMessage = validatePasswordInput(newPassword, { allowEmpty: true })
  if (passwordMessage) {
    ElMessage.warning(passwordMessage)
    return
  }
  if (newSignature.length > 50) {
    // 前端先拦一次，用户能立刻看到提示；后端也会再校验，避免绕过页面直接请求接口。
    ElMessage.warning('个性签名最多 50 个字')
    return
  }

  const payload = {
    newNickname: newNickname !== currentUser.value.nickname ? newNickname : '',
    newSignature: newSignature !== (currentUser.value.signature || '') ? newSignature : undefined,
    newUsername: newUsername !== currentUser.value.username ? newUsername : '',
    newPassword
  }

  if (!payload.newNickname && payload.newSignature === undefined && !payload.newUsername && !payload.newPassword) {
    ElMessage.info('资料没有修改')
    return
  }

  const doSave = (currentPassword = '') => {
    // 统一保存按钮会把已修改的字段一次性提交；登录账号变更仍然需要当前密码做安全验证。
    updateProfile({ ...payload, currentPassword })
    editPassword.value = ''
  }

  if (!payload.newUsername) {
    doSave()
    return
  }

  ElMessageBox.prompt('修改登录账号属于高危操作，请输入当前密码进行验证：', '安全验证', {
    confirmButtonText: '验证并保存',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPattern: /.+/,
    inputErrorMessage: '密码不能为空',
  }).then(({ value }) => {
    doSave(value)
  }).catch(() => {
    // 取消保存时保持表单原样，方便用户继续编辑。
  })
}
</script>

<template>
  <div class="profile-page">
    <div class="profile-inner">
      
      <el-card shadow="never" class="settings-card">
        <el-page-header @back="router.push('/main/community')" title="返回主页" style="margin-bottom: 30px;">
          <template #content>
            <span class="settings-title">修改个人资料</span>
          </template>
        </el-page-header>

        <div class="avatar-section">
          <el-tooltip content="点击更换头像" placement="right">
            <div @click="triggerFileUpload" style="cursor: pointer; display: inline-block; position: relative;">
              <el-avatar :src="currentUser.avatar" :size="100" class="settings-avatar" />
            </div>
          </el-tooltip>
          <p class="avatar-tip">点击头像即可更换 (支持 JPG/PNG，最大 2MB)</p>

          <input type="file" ref="fileInputRef" style="display: none;" accept="image/*" @change="onFileSelected" />
        </div>

        <el-form label-width="100px" style="max-width: 450px; margin: 0 auto;">
          <el-form-item label="UID">
            <el-input :value="String(currentUser.uid).padStart(5, '0')" disabled />
          </el-form-item>


          <el-form-item label="社区昵称">
            <el-input
              v-model="editNickname"
              placeholder="请输入展示的昵称"
              clearable
              :maxlength="INPUT_LIMITS.nicknameMax"
              show-word-limit
              @keyup.enter="saveAllProfile"
            />
          </el-form-item>

          <el-form-item label="个性签名">
            <el-input
              v-model="editSignature"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 3 }"
              maxlength="50"
              show-word-limit
              placeholder="写一句介绍自己吧"
              clearable
              @keyup.enter="saveAllProfile"
            />
          </el-form-item>
          
          <el-form-item label="登录账号">
            <el-input
              v-model="editUsername"
              placeholder="请输入新的用户名"
              clearable
              :maxlength="INPUT_LIMITS.usernameMax"
              show-word-limit
              @keyup.enter="saveAllProfile"
            />
          </el-form-item>

          <el-form-item label="新密码">
            <el-input
              v-model="editPassword"
              type="password"
              placeholder="若不修改请留空，8-32位且含字母和数字"
              show-password
              clearable
              :maxlength="INPUT_LIMITS.passwordMax"
              @keyup.enter="saveAllProfile"
            />
          </el-form-item>
        </el-form>

        <div class="settings-actions">
          <el-button type="primary" :loading="saving" round @click="saveAllProfile">保存</el-button>
        </div>

      </el-card>

    </div>

    <el-dialog v-model="cropDialogVisible" title="裁剪头像" width="500px" align-center destroy-on-close>
      <div style="height: 300px; width: 100%;">
        <vue-cropper ref="cropperRef" :img="rawImageUrl" :autoCrop="true" :autoCropWidth="200" :autoCropHeight="200" :fixedBox="true" :infoTrue="true" outputType="png" />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cropDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="confirmCrop">确认上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding: 40px 20px;
}

.profile-inner {
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  border-radius: 12px;
  padding: 20px;
}

.settings-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.settings-avatar {
  border: 3px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.avatar-tip {
  color: #909399;
  font-size: 13px;
  margin-top: 10px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  max-width: 450px;
  margin: 18px auto 0;
}

</style>
