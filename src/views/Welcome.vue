<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('开发者')

onMounted(() => {
  // 从本地记忆里读取用户名，用来打招呼
  const userStr = localStorage.getItem('user')
  if (userStr) {
    username.value = JSON.parse(userStr).username
  }
})

// 核心触发：点击屏幕任何地方，传送至主社区画框
const enterSystem = () => {
  router.push('/main')
}
</script>

<template>
  <div class="welcome-container" @click="enterSystem">
    
    <div class="content">
      <h1 class="title">SYSTEM ONLINE</h1>
      <h2 class="subtitle">欢迎回来，{{ username }}</h2>
      
      <p class="blink-text">[ 点击屏幕任意位置进入 ]</p>
    </div>

    <div class="bottom-line"></div>
  </div>
</template>

<style scoped>
/* ---- 布局样式 ---- */
.welcome-container {
  width: 100vw;
  height: 100vh;
  background: #0f172a; /* 深邃的暗夜蓝背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer; /* 鼠标移上去变成小手，暗示可以点击 */
  user-select: none; /* 防止用户误双击选中文字 */
  overflow: hidden;
  position: relative;
}

.content {
  text-align: center;
}

.title {
  font-size: 3.5rem;
  letter-spacing: 8px;
  margin: 0;
  /* 炫酷的渐变文字特效 */
  background: linear-gradient(to right, #38bdf8, #818cf8);
  -webkit-background-clip: text; /* 原有的：WebKit内核浏览器专属 */
  background-clip: text;         /* 【新增这行】标准属性，用来消除警告并兼容未来 */
  color: transparent;
  animation: slideUp 1s ease-out forwards;
}

.subtitle {
  font-size: 1.5rem;
  font-weight: 300;
  color: #94a3b8;
  margin-top: 10px;
  margin-bottom: 80px;
  opacity: 0; /* 初始隐藏，靠动画显示 */
  animation: slideUp 1s ease-out 0.3s forwards; /* 延迟 0.3 秒出场 */
}

.blink-text {
  font-size: 1rem;
  color: #38bdf8;
  letter-spacing: 3px;
  opacity: 0;
  animation: blink 2.5s infinite, fadeIn 1s ease-out 1s forwards; /* 叠加呼吸灯和延迟淡入动画 */
}

.bottom-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, transparent, #38bdf8, transparent);
  opacity: 0.5;
}

/* ---- 魔法动画库 ---- */

/* 从下往上浮现动画 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 简单的淡入动画 */
@keyframes fadeIn {
  to { opacity: 1; }
}

/* 呼吸灯特效：明暗交替，并附带一点点发光阴影 */
@keyframes blink {
  0%, 100% { 
    opacity: 0.3; 
    text-shadow: none;
  }
  50% { 
    opacity: 1; 
    text-shadow: 0 0 15px rgba(56, 189, 248, 0.6); 
  }
}
</style>