<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus' // 引入大厂常用的顶部消息提示插件

const router = useRouter()
const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false) // 增加一个加载状态，点击时按钮会转圈

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
      body: JSON.stringify({ username: username.value, password: password.value })
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
      />
      
      <el-input 
        v-model="password" 
        type="password" 
        placeholder="请输入密码" 
        show-password 
        size="large"
        style="margin-bottom: 25px;"
      />

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