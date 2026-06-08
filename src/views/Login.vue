<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus' // 引入大厂常用的顶部消息提示插件

const router = useRouter()
const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false) // 增加一个加载状态，点击时按钮会转圈

// 控制是否进入指挥官暗黑模式
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

// 发送验证码的函数
const sendCode = async () => {
  // 1. 简单的邮箱格式安检
  if (!email.value) {
    ElMessage.warning('请先填写邮箱！')
    return
  }
  if (!email.value.endsWith('@qq.com') && !email.value.endsWith('@gmail.com')) {
    ElMessage.warning('目前仅支持 QQ 或 Gmail 邮箱哦')
    return
  }

  // 2. 触发 60 秒倒计时机制
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer) // 倒计时结束，清空定时器
    }
  }, 1000)

  // 3. 向后端发射请求
  try {
    const response = await fetch('http://localhost:8080/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    })
    const data = await response.json()
    if (data.error) {
      ElMessage.error(data.error)
      // 如果发送失败，马上重置倒计时让用户可以重试
      countdown.value = 0
      clearInterval(timer)
    } else {
      ElMessage.success(data.message)
    }
  } catch (error) {
    ElMessage.error('网络错误，请检查后端是否启动')
    countdown.value = 0
    clearInterval(timer)
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

  loading.value = true // 开启按钮转圈
  const url = isLoginMode.value 
    ? 'http://localhost:8080/api/login' 
    : 'http://localhost:8080/api/register'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: username.value, 
        password: password.value,
        email: email.value,
        code: code.value
       })
    })

    const data = await response.json()
    
    if (data.error) {
      ElMessage.error(data.error) // 红色错误弹窗
    } else {
      ElMessage.success(data.message) // 绿色成功弹窗
      
      if (isLoginMode.value) {
        // 【修改】登录成功：把后端带回来的 uid、用户名和头像，一起写进浏览器的本地记忆
        localStorage.setItem('user', JSON.stringify({ 
          uid: data.uid, 
          username: username.value,
          avatar: data.avatar // ← 核心修复：把后端返回的头像也记在小本本上！
        }))
        // 【核心修改】：分流跳转
        if (isAdminMode.value) {
            // 如果是指挥官模式登录，直接传送至后台
            router.push('/admin')
          } else {
            // 如果是普通人登录，传送到迎宾欢迎页
            router.push('/welcome')
          }
          } else {
          // 注册成功，切回登录模式
          isLoginMode.value = true
        }
    }
  } catch (error) {
    ElMessage.error('哎呀，网络开小差了，请检查后端。')
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
          {{ isAdminMode ? '进入超级管理员后台' : (isLoginMode ? '开启你的全栈开发之旅' : '注册一个新账号') }}
        </p>
      </div>

      <el-input 
        v-model="username" 
        :placeholder="isAdminMode ? '请输入管理员账号' : '请输入用户名'" 
        clearable 
        size="large"
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
        style="margin-bottom: 25px;"
        @keyup.enter="submitForm"
      >
        <template #prefix><el-icon><Lock /></el-icon></template>
      </el-input>

      <div v-if="!isLoginMode && !isAdminMode">
        <el-input v-model="email" placeholder="请输入 QQ 或 Gmail 邮箱" clearable size="large" style="margin-bottom: 20px;">
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
  </div>
</template>