<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'

const router = useRouter()
const currentUser = ref({ uid: null, username: '', avatar: '' })

// 表单里的用户名（独立出来，避免还没点保存就改变了标题）
const editUsername = ref('')
const saving = ref(false)
const editPassword = ref('')

// 裁剪器相关状态
const fileInputRef = ref(null)
const cropDialogVisible = ref(false)
const cropperRef = ref(null)
const rawImageUrl = ref('')

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (!userStr) {
    router.push('/login')
  } else {
    currentUser.value = JSON.parse(userStr)
    editUsername.value = currentUser.value.username // 初始化输入框的值
  }
})

// 核心的向后端发送数据的函数
const updateProfile = async (newUsername, newAvatar, newPassword) => {
  saving.value = true
  try {
    const response = await fetch('http://localhost:8080/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        uid: currentUser.value.uid, 
        username: newUsername || '', 
        avatar: newAvatar || '' 
      })
    })
    
    const data = await response.json()
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success('资料更新成功！')
      if (newUsername) currentUser.value.username = newUsername
      if (newAvatar) currentUser.value.avatar = newAvatar
      // 同步到本地记忆本
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      cropDialogVisible.value = false
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后再试')
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
    updateProfile(null, data) // 发送 Base64 文本给后端
  })
}

// ---- 修改用户名流程 ----
const saveUsername = () => {
  if (!editUsername.value) {
    ElMessage.warning('用户名不能为空哦')
    return
  }
  if (editUsername.value === currentUser.value.username) {
    ElMessage.info('用户名没有修改')
    return
  }
  updateProfile(editUsername.value, null)
}

const savePassword = () => {
    if (!editPassword.value) {
        ElMessage.warning('密码不能为空哦')
        return
    }
    if(editPassword.value.length < 6){
        ElMessage.warning('密码太短啦，至少6位哦')
        return
    }
    // 向后端发送新密码:名字不改传null，头像不改传null，密码传新的
    updateProfile(null, null, editPassword.value)

    // 顺手把输入框清空，体验更好
    editPassword.value = ''
}
</script>

<template>
  <div style="background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px;">
    <div style="max-width: 800px; margin: 0 auto;">
      
      <el-card shadow="never" style="border-radius: 12px; padding: 20px;">
        <el-page-header @back="router.push('/dashboard')" title="返回主页" style="margin-bottom: 30px;">
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

        <el-form label-width="100px" style="max-width: 400px; margin: 0 auto;">
          <el-form-item label="UID">
            <el-input :value="String(currentUser.uid).padStart(5, '0')" disabled />
          </el-form-item>
          
          <el-form-item label="用户名">
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