<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus' // 引入大厂常用的顶部消息提示插件

const router = useRouter()
const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false) // 增加一个加载状态，点击时按钮会转圈

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
        // 跳转到个人后台页面
        router.push('/dashboard')
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
  
    <el-card style="width: 400px; border-radius: 15px;" shadow="hover">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #409EFF; margin: 0;">{{ isLoginMode ? '欢迎回来 👋' : '注册专属账号 🚀' }}</h2>
        <p style="color: #909399; font-size: 14px; margin-top: 10px;">开启你的全栈开发之旅</p>
      </div>

      <el-input 
        v-model="username" 
        placeholder="请输入用户名" 
        clearable 
        size="large"
        style="margin-bottom: 20px;"
        @keyup.enter="submitForm"
      />
      
      <el-input 
        v-model="password" 
        type="password" 
        placeholder="请输入密码" 
        show-password 
        size="large"
        style="margin-bottom: 25px;"
        @keyup.enter="submitForm"
      />

      <el-input 
        v-model="email" 
        placeholder="请输入 QQ 或 Gmail 邮箱" 
        clearable 
        size="large"
        style="margin-bottom: 20px;"
        @keyup.enter="submitForm"
      >
        <template #prefix>
          <el-icon><Message /></el-icon>
        </template>
      </el-input>

      <div style="display: flex; gap: 10px; margin-bottom: 25px;">
        <el-input 
          v-model="code" 
          placeholder="请输入 6 位验证码" 
          size="large"
          style="flex-grow: 1;"
          @keyup.enter="submitForm"
        />
        <el-button 
          size="large" 
          type="primary" 
          plain 
          :disabled="countdown > 0" 
          @click="sendCode"
          style="width: 120px;"
        >
          {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
        </el-button>
      </div>

      <el-button 
        type="primary" 
        size="large" 
        style="width: 100%; font-size: 16px; border-radius: 8px;"
        :loading="loading"
        @click="submitForm"
      >
        {{ isLoginMode ? '立即登录' : '确认注册' }}
      </el-button>

      <div style="text-align: center; margin-top: 20px;">
        <el-button text type="info" @click="isLoginMode = !isLoginMode">
          {{ isLoginMode ? '没有账号？点我注册' : '已有账号？去登录' }}
        </el-button>
      </div>

    </el-card>

  </div>
</template>