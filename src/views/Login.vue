<script setup>
import { computed, ref } from 'vue'
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
const confirmPassword = ref('')
const loading = ref(false) // 增加一个加载状态，点击时按钮会转圈
const focusedField = ref('')
const LOGIN_LIMITS = {
  usernameMax: 254,
  passwordMax: 512
}

// 控制是否进入管理员模式
const isAdminMode = ref(false)

// 连点触发器逻辑
const clickCount = ref(0)
let clickTimer = null

// 新增注册专用的变量
const email = ref('')
const code = ref('')

const fieldRules = {
  username: [
    `账号长度 ${INPUT_LIMITS.usernameMin}-${INPUT_LIMITS.usernameMax} 个字`,
    '必须以英文字母开头',
    '不能包含管理员、官方、脏话等敏感词'
  ],
  password: [
    `密码长度 ${INPUT_LIMITS.passwordMin}-${INPUT_LIMITS.passwordMax} 个字`,
    '必须同时包含大写字母、小写字母和数字',
    '特殊字符只能使用：！ @ # ￥ % * & .'
  ],
  confirmPassword: [
    '请再次输入同一个密码',
    '两次密码完全一致后才能注册'
  ],
  email: [
    '只支持 QQ 邮箱或 Gmail 邮箱',
    '邮箱用于接收验证码和找回账号/密码'
  ],
  code: [
    '请输入邮箱收到的 6 位验证码',
    '验证码有有效期，过期后需要重新获取'
  ]
}

const loginFieldRules = {
  username: [
    '请输入注册时使用的账号',
    '登录时只检查账号是否存在，不再套用注册时的格式规则'
  ],
  password: [
    '请输入账号对应的密码',
    '登录时不重新限制密码格式，避免旧密码或管理员密码被前端拦截'
  ]
}

const adminLoginFieldRules = {
  username: [
    '请输入后端 .env 中配置的 SUPER_ADMIN_USERNAME',
    '超级管理员登录不套用普通用户注册规则'
  ],
  password: [
    '请输入后端 .env 中配置的 SUPER_ADMIN_PASSWORD',
    '如果修改了 .env，需要重启后端服务才会重新读取'
  ]
}

const visibleUsernameRules = computed(() => {
  // 新增：登录和注册的校验目的不同；注册要限制格式，登录只要把已有账号交给后端验证。
  if (isAdminMode.value) return adminLoginFieldRules.username
  return isLoginMode.value ? loginFieldRules.username : fieldRules.username
})

const visiblePasswordRules = computed(() => {
  // 新增：管理员密码来自 .env，不能被普通用户的密码规则提前拦住。
  if (isAdminMode.value) return adminLoginFieldRules.password
  return isLoginMode.value ? loginFieldRules.password : fieldRules.password
})

const showRules = (field) => {
  // 只记录当前聚焦的输入框名称，模板根据它决定显示哪一组规则；点击空白处触发 blur 后会自动收起。
  focusedField.value = field
}

const hideRules = () => {
  focusedField.value = ''
}

const switchLoginMode = () => {
  // 登录/注册切换时清空注册专用字段，避免旧的确认密码或验证码影响下一次提交。
  isLoginMode.value = !isLoginMode.value
  confirmPassword.value = ''
  code.value = ''
  focusedField.value = ''
}

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
  focusedField.value = ''
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
  confirmPassword.value = ''
  focusedField.value = ''
}

const submitForm = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('账号和密码不能为空哦！')
    return
  }
  if (!isLoginMode.value && !isAdminMode.value) {
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
    if (!confirmPassword.value) {
      ElMessage.warning('请再输入一次密码')
      return
    }
    if (password.value.trim() !== confirmPassword.value.trim()) {
      ElMessage.warning('两次输入的密码不一致')
      return
    }
    const emailMessage = validateEmailInput(email.value)
    if (emailMessage) {
      ElMessage.warning(emailMessage)
      return
    }
    if (!code.value.trim()) {
      ElMessage.warning('验证码不能为空')
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
        code: code.value.trim()
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
        :maxlength="isLoginMode ? LOGIN_LIMITS.usernameMax : INPUT_LIMITS.usernameMax"
        :show-word-limit="!isLoginMode"
        class="auth-input"
        @focus="showRules('username')"
        @blur="hideRules"
        @keyup.enter="submitForm"
      >
        <template #prefix><el-icon><User /></el-icon></template>
      </el-input>
      <div v-if="focusedField === 'username'" class="input-rules" :class="{ 'is-admin': isAdminMode }">
        <p v-for="rule in visibleUsernameRules" :key="rule">{{ rule }}</p>
      </div>
      
      <el-input 
        v-model="password" 
        type="password" 
        :placeholder="isAdminMode ? '请输入管理员密码' : '请输入密码'" 
        show-password 
        size="large"
        :maxlength="isLoginMode ? LOGIN_LIMITS.passwordMax : INPUT_LIMITS.passwordMax"
        class="auth-input"
        @focus="showRules('password')"
        @blur="hideRules"
        @keyup.enter="submitForm"
      >
        <template #prefix><el-icon><Lock /></el-icon></template>
      </el-input>
      <div v-if="focusedField === 'password'" class="input-rules" :class="{ 'is-admin': isAdminMode }">
        <p v-for="rule in visiblePasswordRules" :key="rule">{{ rule }}</p>
      </div>

      <div v-if="!isLoginMode && !isAdminMode">
        <el-input 
          v-model="confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password
          size="large"
          :maxlength="INPUT_LIMITS.passwordMax"
          class="auth-input"
          @focus="showRules('confirmPassword')"
          @blur="hideRules"
          @keyup.enter="submitForm"
        >
          <template #prefix><el-icon><Lock /></el-icon></template>
        </el-input>
        <div v-if="focusedField === 'confirmPassword'" class="input-rules">
          <p v-for="rule in fieldRules.confirmPassword" :key="rule">{{ rule }}</p>
        </div>

        <el-input
          v-model="email"
          placeholder="请输入 QQ 或 Gmail 邮箱"
          clearable
          size="large"
          :maxlength="INPUT_LIMITS.emailMax"
          class="auth-input"
          @focus="showRules('email')"
          @blur="hideRules"
        >
          <template #prefix><el-icon><Message /></el-icon></template>
        </el-input>
        <div v-if="focusedField === 'email'" class="input-rules">
          <p v-for="rule in fieldRules.email" :key="rule">{{ rule }}</p>
        </div>

        <div class="auth-code-row">
          <el-input
            v-model="code"
            placeholder="请输入 6 位验证码"
            size="large"
            class="auth-code-input"
            @focus="showRules('code')"
            @blur="hideRules"
            @keyup.enter="submitForm"
          />
          <el-button size="large" type="primary" plain :disabled="countdown > 0" @click="sendCode" class="auth-code-button">
            {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </el-button>
        </div>
        <div v-if="focusedField === 'code'" class="input-rules">
          <p v-for="rule in fieldRules.code" :key="rule">{{ rule }}</p>
        </div>
      </div>

      <el-button 
        :type="isAdminMode ? 'danger' : 'primary'" 
        size="large" 
        class="auth-submit-button"
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
          @click="switchLoginMode"
        >
          {{ isLoginMode ? '没有账号？点我注册' : '已有账号？返回登录' }}
        </el-button>
        <div v-if="isLoginMode && !isAdminMode" style="margin-top: 8px;">
          <el-button type="info" link @click="openRecoverDialog('account')">忘记账号</el-button>
          <el-button type="info" link @click="openRecoverDialog('password')">忘记密码</el-button>
        </div>
        
        <el-button 
          v-if="isAdminMode"
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
      <el-input
        v-model="recoverEmail"
        placeholder="请输入绑定邮箱"
        clearable
        size="large"
        :maxlength="INPUT_LIMITS.emailMax"
        class="auth-input"
        @focus="showRules('recoverEmail')"
        @blur="hideRules"
      >
        <template #prefix><el-icon><Message /></el-icon></template>
      </el-input>
      <div v-if="focusedField === 'recoverEmail'" class="input-rules">
        <p v-for="rule in fieldRules.email" :key="rule">{{ rule }}</p>
      </div>

      <div class="auth-code-row dialog-code-row">
        <el-input
          v-model="recoverCode"
          placeholder="请输入验证码"
          size="large"
          class="auth-code-input"
          @focus="showRules('recoverCode')"
          @blur="hideRules"
        />
        <el-button size="large" type="primary" plain :disabled="recoverCountdown > 0" @click="sendRecoverCode" class="auth-code-button">
          {{ recoverCountdown > 0 ? `${recoverCountdown}s` : '获取验证码' }}
        </el-button>
      </div>
      <div v-if="focusedField === 'recoverCode'" class="input-rules">
        <p v-for="rule in fieldRules.code" :key="rule">{{ rule }}</p>
      </div>

      <el-input
        v-if="recoverMode === 'password'"
        v-model="recoverNewPassword"
        type="password"
        placeholder="请输入新密码（8-32位，含大小写字母和数字）"
        show-password
        size="large"
        :maxlength="INPUT_LIMITS.passwordMax"
        class="auth-input"
        @focus="showRules('recoverPassword')"
        @blur="hideRules"
      >
        <template #prefix><el-icon><Lock /></el-icon></template>
      </el-input>
      <div v-if="focusedField === 'recoverPassword'" class="input-rules">
        <p v-for="rule in fieldRules.password" :key="rule">{{ rule }}</p>
      </div>

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

<style scoped>
.auth-input {
  margin-bottom: 12px;
}

.auth-code-row {
  display: flex;
  width: 100%;
  gap: 12px;
  align-items: stretch;
  margin-bottom: 16px;
}

.dialog-code-row {
  margin-bottom: 12px;
}

.auth-code-input {
  flex: 1;
  min-width: 0;
}

.auth-code-button {
  width: 128px;
  flex: 0 0 128px;
}

.auth-submit-button {
  width: 100%;
  margin-bottom: 15px;
  font-weight: bold;
}

.input-rules {
  margin: -4px 0 14px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.08);
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.input-rules.is-admin {
  background: rgba(245, 108, 108, 0.12);
  color: #c0c4cc;
}

.input-rules p {
  margin: 0;
}
</style>
