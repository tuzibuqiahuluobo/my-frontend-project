<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { clearStoredUser, getStoredUser } from '../api'
import DynamicMenuItem from '../components/DynamicMenuItem.vue'
import { personalBackgroundStyle } from '../utils/personalStyle'

const router = useRouter()
const route = useRoute() // 用来获取当前页面在哪个路由，让菜单高亮对应项

// 核心开关：true 代表收起状态，false 代表展开状态
const isCollapse = ref(true)
// 白天/夜间模式只影响主布局的颜色，不改变各个页面本身的业务逻辑。
const isDarkMode = ref(false)

const currentUser = ref({ username: '', avatar: '' })
const layoutStyle = computed(() => personalBackgroundStyle(currentUser.value))

const applyBodyThemeClass = () => {
  // Element Plus 的弹窗、下拉框会挂到 body 下，把夜间状态同步过去才能统一变暗。
  document.body.classList.toggle('sunshine-dark', isDarkMode.value)
}

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

  // 主题偏好存在 localStorage 里，刷新页面后也能记住白天/夜间模式。
  isDarkMode.value = localStorage.getItem('theme-mode') === 'dark'
  applyBodyThemeClass()
  window.addEventListener('sunshine-user-updated', handleUserUpdated)
})

onUnmounted(() => {
  document.body.classList.remove('sunshine-dark')
  window.removeEventListener('sunshine-user-updated', handleUserUpdated)
})

const handleUserUpdated = (event) => {
  // 个人设置页保存后会发出这个事件，主布局收到后更新头像、昵称、背景和主题色。
  currentUser.value = event.detail || getStoredUser() || currentUser.value
}

// 下拉菜单的点击事件监听（点击个人中心或退出登录）
const handleCommand = (command) => {
  if (command === 'profile') {
    router.push('/main/dashboard')
  } else if (command === 'logout') {
    clearStoredUser()
    router.push('/login')
  }
}

const pageTitle = () => {
  // 优先读取路由里配置的标题，这样以后新增菜单页面时，顶部标题也会自动同步。
  return route.meta.title || 'SunShine'
}

const saveThemeMode = () => {
  // 每次切换后写入 localStorage，下一次打开页面时就能恢复用户选择。
  localStorage.setItem('theme-mode', isDarkMode.value ? 'dark' : 'light')
}

watch(isDarkMode, applyBodyThemeClass)
</script>

<template>
    <el-container class="main-layout" :class="{ 'dark-mode': isDarkMode }" :style="layoutStyle">
      
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
            <el-switch
              v-model="isDarkMode"
              inline-prompt
              active-text="夜"
              inactive-text="昼"
              class="theme-switch"
              @change="saveThemeMode"
            />
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
  background-color: #ffffff;
  background-image: var(--sunshine-page-bg);
  /* 背景图使用 cover + 居中，保证不拉伸变形，并让视觉中心始终对准屏幕中心。 */
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  transition: background-image 0.3s ease;
  position: relative;
  isolation: isolate;
}

.main-layout.dark-mode {
  background-color: #111827;
}

.main-layout::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--sunshine-page-bg);
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  filter: blur(var(--sunshine-bg-blur));
  opacity: var(--sunshine-bg-opacity);
  transform: scale(1.03);
}

.main-layout > * {
  position: relative;
  z-index: 1;
}

/* 侧边栏外壳：加入 transition 让宽度变化时产生动画 */
.aside-bar {
  /* 半透明背景配合 backdrop-filter，可以让侧栏像苹果系统的玻璃面板一样透出原图。 */
  background-color: rgba(255, 255, 255, 0.46);
  border-right: 1px solid rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow-x: hidden;
}

.dark-mode .aside-bar {
  background-color: rgba(17, 24, 39, 0.58);
  border-right-color: rgba(148, 163, 184, 0.18);
}

.el-menu-vertical {
  background-color: transparent;
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
  color: var(--sunshine-theme-start, #409EFF);
  border-bottom: 1px solid #f0f2f5;
  letter-spacing: 1px;
}

.dark-mode .logo-zone {
  color: #93c5fd;
  border-bottom-color: #374151;
}

/* 顶部栏样式：利用 flex 布局让标题和头像各占两头 */
.top-header {
  /* 顶部栏也改成玻璃效果，红框区域会透出背景但文字仍然清楚。 */
  background-color: rgba(255, 255, 255, 0.5);
  border-bottom: 2px solid color-mix(in srgb, var(--sunshine-theme-start, #409EFF) 30%, #e6e6e6);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.dark-mode .top-header {
  background-color: rgba(17, 24, 39, 0.62);
  border-bottom-color: rgba(148, 163, 184, 0.18);
}

.header-title h3 {
  margin: 0;
  color: #303133;
}

.dark-mode .header-title h3,
.dark-mode .user-name {
  color: #e5e7eb;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.theme-switch {
  margin-left: 16px;
}

.user-name {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}

.page-content {
  padding: 20px;
  background-color: transparent;
  background-image: var(--sunshine-page-bg);
  background-size: cover;
  background-position: center center;
  transition: background-image 0.3s ease;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.dark-mode .page-content {
  background-color: transparent;
}

.dark-mode :deep(.el-menu) {
  background-color: transparent;
}

:deep(.el-menu) {
  background-color: transparent;
}

.dark-mode :deep(.el-menu-item),
.dark-mode :deep(.el-sub-menu__title) {
  color: #d1d5db;
}

.dark-mode :deep(.el-menu-item:hover),
.dark-mode :deep(.el-sub-menu__title:hover) {
  color: #f8fafc;
  background-color: #2f3d52;
}

.dark-mode :deep(.el-menu-item:hover .el-icon),
.dark-mode :deep(.el-sub-menu__title:hover .el-icon) {
  color: #7dd3fc;
}

.dark-mode :deep(.el-menu-item.is-active) {
  color: var(--sunshine-theme-start, #93c5fd);
  background-color: #111827;
}

:deep(.el-menu-item.is-active) {
  color: var(--sunshine-theme-start, #409EFF);
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  color: var(--sunshine-theme-start, #409EFF);
}
</style>
