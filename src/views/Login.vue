<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus' // 引入顶部消息提示插件
// 【新增】引入我们用到的三个输入框前缀图标
import { User, Lock, Message } from '@element-plus/icons-vue'
import { apiRequest, saveStoredUser } from '../api'
import { INPUT_LIMITS, normalizeEmail, validateEmailInput, validatePasswordInput, validateUsernameInput } from '../utils/inputRules'
const router = useRouter()
const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false) // 增加一个加载状态，点击时按钮会转圈

// 控制是否进入管理员模式
const isAdminMode = ref(false)

// 连点触发器逻辑
const clickCount = ref(0)
let clickTimer = null

// 新增注册专用的变量
const email = ref('')
const code = ref('')

// 倒计时核心逻辑
const countdown = ref(0)
let timer = null // 用来装定时器的盒子

// 找回账号/密码弹窗相关状态，单独放在一个对象里，避免和注册表单混在一起。
const recoverDialogVisible = ref(false)
const recoverMode = ref('account')
const recoverEmail = ref('')
const recoverCode = ref('')
const recoverNewPassword = ref('')
const recoverResult = ref('')
const recoverLoading = ref(false)
const recoverCountdown = ref(0)
let recoverTimer = null

// 发送验证码的函数
const sendCode = async () => {
  const emailMessage = validateEmailInput(email.value)
  if (emailMessage) {
    ElMessage.warning(emailMessage)
    return
  }
  email.value = normalizeEmail(email.value)

  // 2. 触发 60 秒倒计时机制
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer) // 倒计时结束，清空定时器
    }
  }, 1000)

  // 3. 向后端发送请求
  try {
    const data = await apiRequest('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ email: email.value })
    })
    ElMessage.success(data.message)
  } catch (error) {
    ElMessage.error(error.message || '网络错误，请检查后端是否启动')
    countdown.value = 0
    clearInterval(timer)
  }
}

const openRecoverDialog = (mode) => {
  recoverMode.value = mode
  recoverDialogVisible.value = true
  recoverEmail.value = ''
  recoverCode.value = ''
  recoverNewPassword.value = ''
  recoverResult.value = ''
}

const sendRecoverCode = async () => {
  const emailMessage = validateEmailInput(recoverEmail.value)
  if (emailMessage) {
    ElMessage.warning(emailMessage)
    return
  }
  recoverEmail.value = normalizeEmail(recoverEmail.value)

  // 找回流程也使用倒计时，避免用户频繁点击发送验证码。
  recoverCountdown.value = 60
  recoverTimer = setInterval(() => {
    recoverCountdown.value--
    if (recoverCountdown.value <= 0) {
      clearInterval(recoverTimer)
    }
  }, 1000)

  try {
    const data = await apiRequest('/api/send-code', {
      method: 'POST',
      body: JSON.stringify({ email: recoverEmail.value })
    })
    ElMessage.success(data.message)
  } catch (error) {
    ElMessage.error(error.message || '验证码发送失败')
    recoverCountdown.value = 0
    clearInterval(recoverTimer)
  }
}

const submitRecover = async () => {
  if (!recoverEmail.value || !recoverCode.value) {
    ElMessage.warning('邮箱和验证码不能为空')
    return
  }
  const emailMessage = validateEmailInput(recoverEmail.value)
  if (emailMessage) {
    ElMessage.warning(emailMessage)
    return
  }
  recoverEmail.value = normalizeEmail(recoverEmail.value)
  if (recoverMode.value === 'password') {
    const passwordMessage = validatePasswordInput(recoverNewPassword.value)
    if (passwordMessage) {
      ElMessage.warning(passwordMessage)
      return
    }
  }

  recoverLoading.value = true
  try {
    const url = recoverMode.value === 'account' ? '/api/recover-account' : '/api/reset-password'
    const data = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        email: recoverEmail.value,
        code: recoverCode.value,
        new_password: recoverNewPassword.value
      })
    })

    if (recoverMode.value === 'account') {
      recoverResult.value = `你的登录账号是：${data.username}`
      username.value = data.username
    } else {
      recoverResult.value = data.message
      recoverDialogVisible.value = false
      isLoginMode.value = true
    }
    ElMessage.success(data.message)
  } catch (error) {
    ElMessage.error(error.message || '找回失败，请稍后再试')
  } finally {
    recoverLoading.value = false
  }
}

const triggerSecretChannel = () => {
  clickCount.value++
  // 如果 1 秒内连续点击 10 次
  if (clickCount.value >= 10) {
    isAdminMode.value = true
    isLoginMode.value = true // 强制切回登录状态
    clickCount.value = 0
    ElMessage({
      message: '👁️识别到隐藏指令，超级管理员通道已开启',
      type: 'success',
      duration: 3000
    })
  }
  // 每次点击重置定时器，超过 1 秒没连点就清零
  clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickCount.value = 0
  }, 1000)
}

// 退出管理员模式
const exitAdminMode = () => {
  isAdminMode.value = false
  username.value = ''
  password.value = ''
}

const submitForm = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('账号和密码不能为空哦！')
    return
  }
  const usernameMessage = validateUsernameInput(username.value)
  if (usernameMessage) {
    ElMessage.warning(usernameMessage)
    return
  }
  const passwordMessage = validatePasswordInput(password.value)
  if (passwordMessage) {
    ElMessage.warning(passwordMessage)
    return
  }
  if (!isLoginMode.value && !isAdminMode.value) {
    const emailMessage = validateEmailInput(email.value)
    if (emailMessage) {
      ElMessage.warning(emailMessage)
      return
    }
    email.value = normalizeEmail(email.value)
  }

  loading.value = true // 开启按钮转圈
  const url = isLoginMode.value ? '/api/login' : '/api/register'

  try {
    const data = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ 
        username: username.value.trim(),
        password: password.value.trim(),
        email: email.value,
        code: code.value
       })
    })
    
    if (isLoginMode.value) {
      if (isAdminMode.value && Number(data.role) !== 2) {
        ElMessage.error('这个账号不是超级管理员，不能进入后台')
        return
      }

      saveStoredUser({
        uid: data.uid,
        username: data.username,
        nickname: data.nickname,
        signature: data.signature,
        avatar: data.avatar,
        role: data.role,
        token: data.token
      })

      ElMessage.success(data.message)
      router.push(isAdminMode.value ? '/admin' : '/welcome')
    } else {
      ElMessage.success(data.message)
      isLoginMode.value = true
    }
  } catch (error) {
    ElMessage.error(error.message || '哎呀，网络开小差了，请检查后端。')
  } finally {
    loading.value = false // 关闭转圈
  }
}
</script>

<template>
  <div style="width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">    
  
    <el-card shadow="hover" :style="{ 
      width: '400px', borderRadius: '15px', border: 'none', transition: 'all 0.5s',
      background: isAdminMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      boxShadow: isAdminMode ? '0 8px 32px rgba(255, 0, 0, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.1)'
    }">
      
      <div style="text-align: center; margin-bottom: 30px; user-select: none;">
        <h2 
          @click="triggerSecretChannel" 
          :style="{ color: isAdminMode ? '#F56C6C' : '#409eff', cursor: 'pointer', transition: 'color 0.3s' }"
        >
          {{ isAdminMode ? '⚠️ 超级管理员通道' : '欢迎回来 👋' }}
        </h2>
        <p :style="{ color: isAdminMode ? '#909399' : '#909399', fontSize: '14px' }">
          {{ isAdminMode ? '进入超级管理员后台' : (isLoginMode ? '欢迎来到 SunShine' : '注册一个新账号') }}
        </p>
      </div>

      <el-input 
        v-model="username" 
        :placeholder="isAdminMode ? '请输入管理员账号' : '请输入用户名'" 
        clearable 
        size="large"
        :maxlength="INPUT_LIMITS.usernameMax"
        show-word-limit
        style="margin-bottom: 20px;"
        @keyup.enter="submitForm"
      >
        <template #prefix><el-icon><User /></el-icon></template>
      </el-input>
      
      <el-input 
        v-model="password" 
        type="password" 
        :placeholder="isAdminMode ? '请输入管理员密码' : '请输入密码'" 
        show-password 
        size="large"
        :maxlength="INPUT_LIMITS.passwordMax"
        style="margin-bottom: 25px;"
        @keyup.enter="submitForm"
      >
        <template #prefix><el-icon><Lock /></el-icon></template>
      </el-input>

      <div v-if="!isLoginMode && !isAdminMode">
        <el-input v-model="email" placeholder="请输入 QQ 或 Gmail 邮箱" clearable size="large" :maxlength="INPUT_LIMITS.emailMax" style="margin-bottom: 20px;">
          <template #prefix><el-icon><Message /></el-icon></template>
        </el-input>
        <div style="display: flex; gap: 10px; margin-bottom: 25px;">
          <el-input v-model="code" placeholder="请输入 6 位验证码" size="large" style="flex-grow: 1;" />
          <el-button size="large" type="primary" plain :disabled="countdown > 0" @click="sendCode" style="width: 120px;">
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </el-button>
        </div>
      </div>

      <el-button 
        :type="isAdminMode ? 'danger' : 'primary'" 
        size="large" 
        style="width: 100%; margin-bottom: 15px; font-weight: bold;" 
        :loading="loading" 
        @click="submitForm"
      >
        {{ isAdminMode ? '管理员登录' : (isLoginMode ? '立即登录' : '确认注册') }}
      </el-button>

      <div style="text-align: center;">
        <el-button 
          v-if="!isAdminMode"
          type="primary" 
          link 
          @click="isLoginMode = !isLoginMode"
        >
          {{ isLoginMode ? '没有账号？点我注册' : '已有账号？返回登录' }}
        </el-button>
        <div v-if="isLoginMode && !isAdminMode" style="margin-top: 8px;">
          <el-button type="info" link @click="openRecoverDialog('account')">忘记账号</el-button>
          <el-button type="info" link @click="openRecoverDialog('password')">忘记密码</el-button>
        </div>
        
        <el-button 
          v-else
          type="info" 
          link 
          @click="exitAdminMode"
        >
          返回普通用户模式
        </el-button>
      </div>

    </el-card>

    <el-dialog
      v-model="recoverDialogVisible"
      :title="recoverMode === 'account' ? '找回账号' : '重置密码'"
      width="420px"
      align-center
    >
      <el-input v-model="recoverEmail" placeholder="请输入绑定邮箱" clearable size="large" :maxlength="INPUT_LIMITS.emailMax" style="margin-bottom: 15px;">
        <template #prefix><el-icon><Message /></el-icon></template>
      </el-input>

      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <el-input v-model="recoverCode" placeholder="请输入验证码" size="large" style="flex-grow: 1;" />
        <el-button size="large" type="primary" plain :disabled="recoverCountdown > 0" @click="sendRecoverCode" style="width: 120px;">
          {{ recoverCountdown > 0 ? `${recoverCountdown}s` : '获取验证码' }}
        </el-button>
      </div>

      <el-input
        v-if="recoverMode === 'password'"
        v-model="recoverNewPassword"
        type="password"
        placeholder="请输入新密码（8-32位，含字母和数字）"
        show-password
        size="large"
        :maxlength="INPUT_LIMITS.passwordMax"
        style="margin-bottom: 15px;"
      >
        <template #prefix><el-icon><Lock /></el-icon></template>
      </el-input>

      <el-alert v-if="recoverResult" :title="recoverResult" type="success" show-icon :closable="false" style="margin-bottom: 15px;" />

      <template #footer>
        <el-button @click="recoverDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="recoverLoading" @click="submitRecover">
          {{ recoverMode === 'account' ? '找回账号' : '确认重置' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
