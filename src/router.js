import { createRouter, createWebHistory } from 'vue-router'
// 【新增】引入进度条和它的样式
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
// 隐藏右上角那个一直转圈的小圆环，只保留顶部横条
NProgress.configure({ showSpinner: false })

import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Profile from './views/Profile.vue'
import Welcome from './views/Welcome.vue'
import AdminLayout from './views/AdminLayout.vue'
import Community from './views/Community.vue'
import MainLayout from './views/MainLayout.vue'



const routes = [
    { path: '/', redirect: '/login' }, // 默认跳转到登录
    { path: '/login', component: Login },

    // 1. 迎宾页：独立于主画框之外的全屏页面
    { path: '/welcome', component: Welcome },

    // 2. 平民通道：进入主画框
    {
        path: '/main',
        component: MainLayout,
        redirect: '/main/community', // 一进主画框，默认显示社区
        children: [
            // 这些子页面都会被渲染在 MainLayout 的 <router-view> 里面
            { path: 'community', component: Community },
            { path: 'profile', component: Profile },
            { path: 'dashboard', component: Dashboard }
        ]
    },

    // 3. 指挥官通道：进入后台画框
    {
        path: '/admin',
        component: AdminLayout,
        children: [
            // 未来这里会放“用户管理”、“封号系统”等页面，现在先留空
        ]
    }
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