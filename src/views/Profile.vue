<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus' // 新增引入 ElMessageBox
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { apiRequest, apiUpload, getStoredUser, saveStoredUser } from '../api'
import { AVATAR_MAX_BYTES, IMAGE_ACCEPT, assertImageFile, compressBackgroundImageFile, isGifFile, readFileAsDataUrl } from '../utils/imageTools'
import { INPUT_LIMITS, validateNicknameInput, validatePasswordInput, validateSignatureInput, validateUsernameInput } from '../utils/inputRules'
import { DEFAULT_PERSONAL_STYLE, personalBackgroundStyle } from '../utils/personalStyle'

const router = useRouter()
const route = useRoute()
// 新增 nickname 字段
const currentUser = ref({ uid: null, username: '', nickname: '', signature: '', avatar: '', role: 0, token: '' })

// 表单绑定的独立变量
const editNickname = ref('') // 新增：昵称输入框
const editSignature = ref('') // 新增：个性签名单独绑定，方便在保存前统一校验 50 字限制
const editUsername = ref('')
const editPassword = ref('')
const saving = ref(false)
const activeSettingsTab = ref('profile')
const backgroundInputRef = ref(null)
const backgroundCropDialogVisible = ref(false)
const backgroundCropperRef = ref(null)
const rawBackgroundUrl = ref('')
const rawBackgroundObjectUrl = ref('')
const backgroundTarget = ref('profile')
const editProfileBackground = ref('')
const editWelcomeBackground = ref('')
const pendingProfileBackgroundBlob = ref(null)
const pendingWelcomeBackgroundBlob = ref(null)
const editThemeColorStart = ref(DEFAULT_PERSONAL_STYLE.themeColorStart)
const editThemeColorEnd = ref(DEFAULT_PERSONAL_STYLE.themeColorEnd)
const editThemeOpacity = ref(DEFAULT_PERSONAL_STYLE.themeOpacity)
const previewStyle = computed(() => personalBackgroundStyle({
  profile_background: editProfileBackground.value,
  welcome_background: editWelcomeBackground.value,
  theme_color_start: editThemeColorStart.value,
  theme_color_end: editThemeColorEnd.value,
  theme_opacity: editThemeOpacity.value
}))
const welcomePreviewStyle = computed(() => personalBackgroundStyle({
  profile_background: editProfileBackground.value,
  welcome_background: editWelcomeBackground.value,
  theme_color_start: editThemeColorStart.value,
  theme_color_end: editThemeColorEnd.value,
  theme_opacity: editThemeOpacity.value
}, { target: 'welcome' }))

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
    editProfileBackground.value = currentUser.value.profile_background || ''
    editWelcomeBackground.value = currentUser.value.welcome_background || ''
    revokeObjectUrl(rawBackgroundObjectUrl.value)
    rawBackgroundObjectUrl.value = ''
    pendingProfileBackgroundBlob.value = null
    pendingWelcomeBackgroundBlob.value = null
    editThemeColorStart.value = currentUser.value.theme_color_start || DEFAULT_PERSONAL_STYLE.themeColorStart
    editThemeColorEnd.value = currentUser.value.theme_color_end || DEFAULT_PERSONAL_STYLE.themeColorEnd
    editThemeOpacity.value = Number.isFinite(Number(currentUser.value.theme_opacity)) ? Number(currentUser.value.theme_opacity) : DEFAULT_PERSONAL_STYLE.themeOpacity
    activeSettingsTab.value = route.query.tab === 'style' ? 'style' : 'profile'
  }
})

const revokeObjectUrl = (url) => {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const setRawBackgroundPreview = (url) => {
  revokeObjectUrl(rawBackgroundObjectUrl.value)
  rawBackgroundObjectUrl.value = url
  rawBackgroundUrl.value = url
}

const setEditableBackgroundPreview = (target, url, blob) => {
  // ObjectURL 只负责本次编辑的快速预览，真正持久化要等保存时把 blob 上传到后端。
  if (target === 'welcome') {
    revokeObjectUrl(editWelcomeBackground.value)
    editWelcomeBackground.value = url
    pendingWelcomeBackgroundBlob.value = blob
    return
  }
  revokeObjectUrl(editProfileBackground.value)
  editProfileBackground.value = url
  pendingProfileBackgroundBlob.value = blob
}

const revokePendingBackgroundPreviews = () => {
  revokeObjectUrl(rawBackgroundObjectUrl.value)
  revokeObjectUrl(editProfileBackground.value)
  revokeObjectUrl(editWelcomeBackground.value)
  rawBackgroundObjectUrl.value = ''
  pendingProfileBackgroundBlob.value = null
  pendingWelcomeBackgroundBlob.value = null
}

onUnmounted(revokePendingBackgroundPreviews)

// 【优化】将参数改为对象形式，方便后续无限扩展，清晰明了
const updateProfile = async ({ newUsername, newAvatar, newPassword, newNickname, newSignature, currentPassword, profileBackground, welcomeBackground, themeColorStart, themeColorEnd, themeOpacity }) => {
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
  if (profileBackground !== undefined) {
    // 背景图允许清空，所以只有明确传入时才提交给后端。
    requestBody.profile_background = profileBackground
  }
  if (welcomeBackground !== undefined) {
    // 欢迎页背景单独保存，方便做更适合开屏的构图。
    requestBody.welcome_background = welcomeBackground
  }
  if (themeColorStart) requestBody.theme_color_start = themeColorStart
  if (themeColorEnd) requestBody.theme_color_end = themeColorEnd
  if (themeOpacity !== undefined) requestBody.theme_opacity = themeOpacity

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
      profile_background: data.profile_background,
      welcome_background: data.welcome_background,
      theme_color_start: data.theme_color_start,
      theme_color_end: data.theme_color_end,
      theme_opacity: data.theme_opacity,
      role: data.role,
      token: data.token
    }
    editUsername.value = currentUser.value.username
    editNickname.value = currentUser.value.nickname || currentUser.value.username
    editSignature.value = currentUser.value.signature || ''
    editProfileBackground.value = currentUser.value.profile_background || ''
    editWelcomeBackground.value = currentUser.value.welcome_background || ''
    editThemeColorStart.value = currentUser.value.theme_color_start || DEFAULT_PERSONAL_STYLE.themeColorStart
    editThemeColorEnd.value = currentUser.value.theme_color_end || DEFAULT_PERSONAL_STYLE.themeColorEnd
    editThemeOpacity.value = Number.isFinite(Number(currentUser.value.theme_opacity)) ? Number(currentUser.value.theme_opacity) : DEFAULT_PERSONAL_STYLE.themeOpacity
    saveStoredUser(currentUser.value)
    // 保存个性化装扮后通知外层 MainLayout，顶部菜单和背景不用刷新页面也能立即同步。
    window.dispatchEvent(new CustomEvent('sunshine-user-updated', { detail: currentUser.value }))
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

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    assertImageFile(file, AVATAR_MAX_BYTES, '头像')
    if (isGifFile(file)) {
      // GIF 动图如果进入裁剪器会变成静态图，所以这里直接保存，保留头像动画效果。
      const dataUrl = await readFileAsDataUrl(file)
      updateProfile({ newAvatar: dataUrl })
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    rawImageUrl.value = dataUrl
    cropDialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '头像读取失败，请重新选择')
  } finally {
    event.target.value = ''
  }
}

const confirmCrop = () => {
  if (!cropperRef.value) return
  cropperRef.value.getCropData((data) => {
    updateProfile({ newAvatar: data }) // 仅更新头像
  })
}

const triggerBackgroundUpload = (target = 'profile') => {
  backgroundTarget.value = target
  backgroundInputRef.value?.click()
}

const onBackgroundSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    assertImageFile(file, 20 * 1024 * 1024, '背景图')
    if (isGifFile(file)) {
      ElMessage.warning('背景图暂不建议使用 GIF，请选择 JPG/PNG/WEBP 图片')
      return
    }
    // 先压缩成 Blob 再生成 ObjectURL，避免 Base64 体积膨胀和大图读取时卡住主线程。
    const compressedBlob = await compressBackgroundImageFile(file)
    setRawBackgroundPreview(URL.createObjectURL(compressedBlob))
    backgroundCropDialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '背景图读取失败，请重新选择')
  } finally {
    event.target.value = ''
  }
}

const confirmBackgroundCrop = () => {
  if (!backgroundCropperRef.value) return
  backgroundCropperRef.value.getCropBlob(async (blob) => {
    try {
      // 裁剪后的 Blob 再压缩一次，确保最终上传的是 1080p 级别的小体积图片。
      const croppedFile = new File([blob], 'background.webp', { type: blob.type || 'image/png' })
      const compressedBlob = await compressBackgroundImageFile(croppedFile)
      setEditableBackgroundPreview(backgroundTarget.value, URL.createObjectURL(compressedBlob), compressedBlob)
      backgroundCropDialogVisible.value = false
    } catch (error) {
      ElMessage.error(error.message || '背景图处理失败，请换一张图片试试')
    }
  })
}

const clearBackground = (target = 'profile') => {
  if (target === 'welcome') {
    revokeObjectUrl(editWelcomeBackground.value)
    editWelcomeBackground.value = ''
    pendingWelcomeBackgroundBlob.value = null
    return
  }
  revokeObjectUrl(editProfileBackground.value)
  editProfileBackground.value = ''
  pendingProfileBackgroundBlob.value = null
}

const uploadBackgroundBlob = async (blob, target) => {
  const formData = new FormData()
  formData.append('image', blob, `${target}-background.webp`)
  const data = await apiUpload('/api/upload-background', formData)
  return data.url
}

const fillBackgroundUploadPayload = async (payload, styleChanged) => {
  if (!styleChanged) return

  if (pendingProfileBackgroundBlob.value) {
    // 保存时才上传 Blob，用户只是预览但没点保存时不会产生无用文件。
    payload.profileBackground = await uploadBackgroundBlob(pendingProfileBackgroundBlob.value, 'profile')
  } else {
    payload.profileBackground = editProfileBackground.value
  }

  if (pendingWelcomeBackgroundBlob.value) {
    payload.welcomeBackground = await uploadBackgroundBlob(pendingWelcomeBackgroundBlob.value, 'welcome')
  } else {
    payload.welcomeBackground = editWelcomeBackground.value
  }
}

const saveAllProfile = async () => {
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
  const signatureMessage = validateSignatureInput(newSignature)
  if (signatureMessage) {
    ElMessage.warning(signatureMessage)
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
    // 个性化装扮和基础资料共用一个保存按钮，所以下面还要继续检查背景和主题色是否变化。
  }

  const styleChanged =
    editProfileBackground.value !== (currentUser.value.profile_background || '') ||
    editWelcomeBackground.value !== (currentUser.value.welcome_background || '') ||
    editThemeColorStart.value !== (currentUser.value.theme_color_start || DEFAULT_PERSONAL_STYLE.themeColorStart) ||
    editThemeColorEnd.value !== (currentUser.value.theme_color_end || DEFAULT_PERSONAL_STYLE.themeColorEnd) ||
    Number(editThemeOpacity.value) !== Number(currentUser.value.theme_opacity ?? DEFAULT_PERSONAL_STYLE.themeOpacity)

  if (!payload.newNickname && payload.newSignature === undefined && !payload.newUsername && !payload.newPassword && !styleChanged) {
    ElMessage.info('资料没有修改')
    return
  }

  if (styleChanged) {
    payload.themeColorStart = editThemeColorStart.value
    payload.themeColorEnd = editThemeColorEnd.value
    payload.themeOpacity = Number(editThemeOpacity.value)
  }

  const doSave = async (currentPassword = '') => {
    // 统一保存按钮会把已修改的字段一次性提交；登录账号变更仍然需要当前密码做安全验证。
    try {
      saving.value = true
      await fillBackgroundUploadPayload(payload, styleChanged)
      updateProfile({ ...payload, currentPassword })
      editPassword.value = ''
    } catch (error) {
      saving.value = false
      ElMessage.error(error.message || '背景图上传失败，请稍后再试')
    }
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

        <el-tabs v-model="activeSettingsTab" class="settings-tabs">
          <el-tab-pane label="基础资料" name="profile">
            <div class="avatar-section">
              <el-tooltip content="点击更换头像" placement="right">
                <div @click="triggerFileUpload" style="cursor: pointer; display: inline-block; position: relative;">
                  <el-avatar :src="currentUser.avatar" :size="100" class="settings-avatar" />
                </div>
              </el-tooltip>
              <p class="avatar-tip">点击头像即可更换 (支持 JPG/PNG/WEBP/GIF，最大 2MB)</p>

              <input type="file" ref="fileInputRef" style="display: none;" :accept="IMAGE_ACCEPT" @change="onFileSelected" />
            </div>

            <el-form label-width="100px" class="settings-form">
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
                  placeholder="若不修改请留空，8-32位且含大小写字母和数字"
                  show-password
                  clearable
                  :maxlength="INPUT_LIMITS.passwordMax"
                  @keyup.enter="saveAllProfile"
                />
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="个性装扮" name="style">
            <div class="style-preview personalized-page" :style="previewStyle">
              <div class="style-preview-content">
                <strong>{{ editNickname || currentUser.nickname || currentUser.username }}</strong>
                <span>{{ editSignature || '预览你的个人主页背景和主题色' }}</span>
              </div>
            </div>

            <input ref="backgroundInputRef" type="file" style="display: none;" accept="image/png,image/jpeg,image/webp" @change="onBackgroundSelected" />
            <div class="background-actions">
              <el-button type="primary" plain @click="triggerBackgroundUpload('profile')">上传主站背景</el-button>
              <el-button plain @click="clearBackground('profile')">恢复主站默认</el-button>
            </div>

            <div class="style-preview welcome-preview personalized-page" :style="welcomePreviewStyle">
              <div class="style-preview-content">
                <strong>SunShine</strong>
                <span>预览欢迎页面背景</span>
              </div>
            </div>

            <div class="background-actions">
              <el-button type="primary" plain @click="triggerBackgroundUpload('welcome')">上传欢迎页背景</el-button>
              <el-button plain @click="clearBackground('welcome')">恢复欢迎页默认</el-button>
            </div>

            <el-form label-width="110px" class="settings-form style-form">
              <el-form-item label="背景模糊强度">
                <el-slider v-model="editThemeOpacity" :min="0" :max="0.85" :step="0.05" show-input />
              </el-form-item>
              <el-form-item label="渐变色一">
                <el-color-picker v-model="editThemeColorStart" />
              </el-form-item>
              <el-form-item label="渐变色二">
                <el-color-picker v-model="editThemeColorEnd" />
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

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

    <el-dialog v-model="backgroundCropDialogVisible" title="裁剪个性化背景" width="760px" align-center destroy-on-close>
      <div style="height: 360px; width: 100%;">
        <vue-cropper
          ref="backgroundCropperRef"
          :img="rawBackgroundUrl"
          :autoCrop="true"
          :autoCropWidth="520"
          :autoCropHeight="300"
          :fixed="false"
          :fixedBox="false"
          :infoTrue="true"
          :enlarge="2"
          :outputSize="1"
          outputType="png"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="backgroundCropDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="confirmBackgroundCrop">确认裁剪</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-page {
  background-color: transparent;
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

.settings-tabs {
  max-width: 620px;
  margin: 0 auto;
}

.settings-form {
  max-width: 480px;
  margin: 0 auto;
}

.style-preview {
  min-height: 220px;
  border-radius: 14px;
  margin-bottom: 18px;
  padding: 22px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  background-color: #ffffff;
  background-image: var(--sunshine-page-bg), linear-gradient(135deg, var(--sunshine-theme-start), var(--sunshine-theme-end));
  background-size: cover, cover;
  background-position: center center, center;
  background-repeat: no-repeat;
  transition: background-image 0.3s ease;
}

.style-preview::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* 这里用同一张背景图做模糊层，而不是盖黑色透明层，预览会更接近苹果系统的玻璃质感。 */
  background-image: var(--sunshine-page-bg);
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  filter: blur(var(--sunshine-bg-blur));
  opacity: var(--sunshine-bg-opacity);
  transform: scale(1.04);
}

.style-preview-content {
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 12px rgba(15, 23, 42, 0.45);
}

.style-preview-content strong {
  font-size: 22px;
}

.welcome-preview {
  min-height: 260px;
}

.background-actions {
  display: flex;
  gap: 10px;
  margin: 12px 0 20px;
}

.style-form :deep(.el-color-picker__trigger) {
  border-radius: 10px;
}

:deep(.el-button--primary) {
  --el-button-bg-color: var(--sunshine-theme-start, #38bdf8);
  --el-button-border-color: var(--sunshine-theme-start, #38bdf8);
  --el-button-hover-bg-color: var(--sunshine-theme-end, #818cf8);
  --el-button-hover-border-color: var(--sunshine-theme-end, #818cf8);
}

</style>
