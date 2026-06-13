<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus' // 新增引入 ElMessageBox
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { apiRequest, getStoredUser, saveStoredUser } from '../api'

const router = useRouter()
// 新增 nickname 字段
const currentUser = ref({ uid: null, username: '', nickname: '', avatar: '', role: 0, token: '' })

// 表单绑定的独立变量
const editNickname = ref('') // 新增：昵称输入框
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
  }
})

// 【优化】将参数改为对象形式，方便后续无限扩展，清晰明了
const updateProfile = async ({ newUsername, newAvatar, newPassword, newNickname, currentPassword }) => {
  saving.value = true
  try {
    const data = await apiRequest('/api/update', {
      method: 'POST',
      body: JSON.stringify({ 
        username: newUsername || '', 
        avatar: newAvatar || '',
        password: newPassword || '',
        nickname: newNickname || '',                 // 传给后端的昵称
        current_password: currentPassword || ''      // 传给后端用于修改用户名的验证密码
      })
    })

    ElMessage.success(data.message || '资料更新成功！')
    currentUser.value = {
      uid: data.uid,
      username: data.username,
      nickname: data.nickname,
      avatar: data.avatar,
      role: data.role,
      token: data.token
    }
    editUsername.value = currentUser.value.username
    editNickname.value = currentUser.value.nickname || currentUser.value.username
    saveStoredUser(currentUser.value)
    cropDialogVisible.value = false
    
    // 如果改了昵称或头像，轻微延迟刷新让右上角用户信息同步
    if (newNickname || newAvatar) {
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

// ---- 新增：修改社区昵称流程 ----
const saveNickname = () => {
  if (!editNickname.value.trim()) {
    ElMessage.warning('昵称不能为空哦')
    return
  }
  if (editNickname.value === currentUser.value.nickname) {
    ElMessage.info('昵称没有修改')
    return
  }
  updateProfile({ newNickname: editNickname.value })
}

// ---- 修改用户名流程 (加入密码验证安检门) ----
const saveUsername = () => {
  if (!editUsername.value.trim()) {
    ElMessage.warning('用户名不能为空哦')
    return
  }
  if (editUsername.value === currentUser.value.username) {
    ElMessage.info('用户名没有修改')
    return
  }
  
  // 弹出密码验证框
  ElMessageBox.prompt('修改登录账号属于高危操作，请输入当前密码进行验证：', '安全验证', {
    confirmButtonText: '验证并修改',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPattern: /.+/,
    inputErrorMessage: '密码不能为空',
  }).then(({ value }) => {
    // 用户输入了密码并点击确认，将新用户名和当前密码一起发给后端
    updateProfile({ newUsername: editUsername.value, currentPassword: value })
  }).catch(() => {
    // 取消操作
  })
}

// ---- 修改密码流程 ----
const savePassword = () => {
    if (!editPassword.value) {
        ElMessage.warning('密码不能为空哦')
        return
    }
    if(editPassword.value.length < 6){
        ElMessage.warning('密码太短啦，至少6位哦')
        return
    }
    updateProfile({ newPassword: editPassword.value })
    editPassword.value = ''
}
</script>

<template>
  <div style="background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px;">
    <div style="max-width: 800px; margin: 0 auto;">
      
      <el-card shadow="never" style="border-radius: 12px; padding: 20px;">
        <el-page-header @back="router.push('/main/community')" title="返回主页" style="margin-bottom: 30px;">
          <template #content>
            <span style="font-size: 18px; font-weight: bold;">修改个人资料</span>
          </template>
        </el-page-header>

        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 40px;">
          <el-tooltip content="点击更换头像" placement="right">
            <div @click="triggerFileUpload" style="cursor: pointer; display: inline-block; position: relative;">
              <el-avatar :src="currentUser.avatar" :size="100" style="border: 3px solid #e4e7ed; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);" />
            </div>
          </el-tooltip>
          <p style="color: #909399; font-size: 13px; margin-top: 10px;">点击头像即可更换 (支持 JPG/PNG，最大 2MB)</p>

          <input type="file" ref="fileInputRef" style="display: none;" accept="image/*" @change="onFileSelected" />
        </div>

        <el-form label-width="100px" style="max-width: 450px; margin: 0 auto;">
          <el-form-item label="UID">
            <el-input :value="String(currentUser.uid).padStart(5, '0')" disabled />
          </el-form-item>


          <el-form-item label="社区昵称">
            <el-input v-model="editNickname" placeholder="请输入展示的昵称" clearable @keyup.enter="saveNickname">
              <template #append>
                <el-button type="success" :loading="saving" @click="saveNickname">保存昵称</el-button>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="登录账号">
            <el-input v-model="editUsername" placeholder="请输入新的用户名" clearable @keyup.enter="saveUsername">
              <template #append>
                <el-button type="primary" :loading="saving" @click="saveUsername">保存修改</el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="新密码">
            <el-input v-model="editPassword" type="password" placeholder="若不修改请留空" show-password clearable @keyup.enter="savePassword">
                <template #append>
                    <el-button type="danger" :loading="saving" @click="savePassword">修改密码</el-button>
                </template>
            </el-input>
          </el-form-item>
        </el-form>

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
