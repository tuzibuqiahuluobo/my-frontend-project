import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Profile from './views/Profile.vue'

// 【新增】引入进度条和它的样式
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 隐藏右上角那个一直转圈的小圆环，只保留顶部横条
NProgress.configure({ showSpinner: false })

const routes = [
    { path: '/', redirect: '/login' }, // 默认跳转到登录
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard },
    { path: '/profile', component: Profile } // 2. 注册新路线
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 【新增】路由守卫：每次准备跳转前，进度条开始
router.beforeEach((to, from, next) => {
    NProgress.start()
    next()
})

// 【新增】每次跳转完成后，进度条跑满并消失
router.afterEach(() => {
    NProgress.done()
})

export default router