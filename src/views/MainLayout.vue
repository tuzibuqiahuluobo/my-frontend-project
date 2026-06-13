<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { clearStoredUser, getStoredUser } from '../api'
import DynamicMenuItem from '../components/DynamicMenuItem.vue'

const router = useRouter()
const route = useRoute() // 用来获取当前页面在哪个路由，让菜单高亮对应项

// 核心开关：true 代表收起状态，false 代表展开状态
const isCollapse = ref(true)

const currentUser = ref({ username: '', avatar: '' })

const joinRoutePath = (parentPath, childPath) => {
  // 子路由如果以 / 开头，说明它本来就是完整路径，不需要再拼父路径。
  if (childPath.startsWith('/')) {
    return childPath
  }

  const cleanParent = parentPath.replace(/\/$/, '')
  return `${cleanParent}/${childPath}`
}

const buildMenuTree = (routeList, parentPath = '') => {
  // 菜单直接从路由配置生成：以后新增页面时，只要给路由 meta.menu = true 即可出现在侧边栏。
  return routeList
    .filter(menuRoute => menuRoute.meta?.menu)
    .map(menuRoute => {
      const fullPath = joinRoutePath(parentPath, menuRoute.path)
      const children = menuRoute.children ? buildMenuTree(menuRoute.children, fullPath) : []

      return {
        index: fullPath,
        title: menuRoute.meta.title,
        icon: menuRoute.meta.icon,
        children
      }
    })
}

const mainMenuItems = computed(() => {
  // 从当前 router 实例里找到 /main 这条父路由，再把它的 children 转成侧边栏菜单。
  const mainRoute = router.options.routes.find(item => item.path === '/main')
  return buildMenuTree(mainRoute?.children || [], '/main')
})

onMounted(() => {
  const user = getStoredUser()
  if (user) {
    currentUser.value = user
  }
})

// 下拉菜单的点击事件监听（点击个人中心或退出登录）
const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/main/settings/profile')
  } else if (command === 'logout') {
    clearStoredUser()
    router.push('/login')
  }
}

const pageTitle = () => {
  // 优先读取路由里配置的标题，这样以后新增菜单页面时，顶部标题也会自动同步。
  return route.meta.title || 'SunShine'
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
            <span v-if="!isCollapse">SunShine</span>
            <span v-else>S</span>
          </div>

          <DynamicMenuItem
            v-for="item in mainMenuItems"
            :key="item.index"
            :item="item"
          />
        </el-menu>
      </el-aside>
  
      <el-container>
        <el-header class="top-header">
          <div class="header-title">
            <h3>{{ pageTitle() }}</h3>
          </div>
          
          <div class="header-user">
            <el-dropdown @command="handleCommand" trigger="click">
              <div class="avatar-wrapper">
                <el-avatar :size="35" :src="currentUser.avatar" />
                <span class="user-name">{{ currentUser.nickname || currentUser.username }}</span>
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
