<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// 引入我们需要用到的 Element Plus 图标
import { ChatDotRound, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute() // 用来获取当前页面在哪个路由，让菜单高亮对应项

// 核心开关：true 代表收起状态，false 代表展开状态
const isCollapse = ref(true)

const currentUser = ref({ username: '', avatar: '' })

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    currentUser.value = JSON.parse(userStr)
  }
})

// 下拉菜单的点击事件监听（点击个人中心或退出登录）
const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/main/profile')
  } else if (command === 'logout') {
    localStorage.removeItem('user')
    router.push('/login')
  }
}
</script>

<template>
    <el-container class="main-layout">
      
      <el-aside 
        :width="isCollapse ? '64px' : '200px'" 
        class="aside-bar"
        @mouseenter="isCollapse = false"
        @mouseleave="isCollapse = true"
      >
        <el-menu
          :default-active="route.path"
          class="el-menu-vertical"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
        >
          <div class="logo-zone">
            <span v-if="!isCollapse">DEVELOPER</span>
            <span v-else>D</span>
          </div>
  
          <el-menu-item index="/main/community">
            <el-icon><ChatDotRound /></el-icon>
            <template #title>社区广场</template>
          </el-menu-item>
  
          <el-menu-item index="/main/profile">
            <el-icon><Setting /></el-icon>
            <template #title>个人设置</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
  
      <el-container>
        <el-header class="top-header">
          <div class="header-title">
            <h3>{{ route.path.includes('community') ? '💬 社区广场' : '⚙️ 个人设置' }}</h3>
          </div>
          
          <div class="header-user">
            <el-dropdown @command="handleCommand" trigger="click">
              <div class="avatar-wrapper">
                <el-avatar :size="35" :src="currentUser.avatar" />
                <span class="user-name">{{ currentUser.username }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
  
        <el-main class="page-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
</template>


<style scoped>
.main-layout {
  height: 100vh;
  width: 100vw;
  background-color: #f0f2f5;
}

/* 侧边栏外壳：加入 transition 让宽度变化时产生动画 */
.aside-bar {
  background-color: #ffffff;
  border-right: 1px solid #e6e6e6;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow-x: hidden;
}

.el-menu-vertical {
  border-right: none;
  height: 100%;
}

.logo-zone {
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #409EFF;
  border-bottom: 1px solid #f0f2f5;
  letter-spacing: 1px;
}

/* 顶部栏样式：利用 flex 布局让标题和头像各占两头 */
.top-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-title h3 {
  margin: 0;
  color: #303133;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-name {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}

.page-content {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>