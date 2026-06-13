import { createRouter, createWebHistory } from 'vue-router'
// 引入进度条和它的样式
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
import { getStoredUser, isAdmin } from './api'



const routes = [
    { path: '/', redirect: '/login' }, // 默认跳转到登录
    { path: '/login', component: Login },

    // 1. 欢迎页：独立于主画框之外的全屏页面
    { path: '/welcome', component: Welcome, meta: { requiresAuth: true } },

    // 2. 普通用户：进入主画框
    {
        path: '/main',
        component: MainLayout,
        meta: { requiresAuth: true },
        redirect: '/main/community', // 一进主画框，默认显示社区
        children: [
            // 这些子页面都会被渲染在 MainLayout 的 <router-view> 里面
            {
                path: 'community',
                component: Community,
                meta: {
                    title: '社区广场',
                    icon: 'ChatDotRound',
                    menu: true
                }
            },
            {
                path: 'dashboard',
                component: Dashboard,
                meta: {
                    title: '个人中心',
                    icon: 'User',
                    menu: true
                }
            },
            {
                path: 'settings',
                redirect: '/main/settings/profile',
                meta: {
                    title: '设置中心',
                    icon: 'Setting',
                    menu: true
                },
                children: [
                    {
                        path: 'profile',
                        component: Profile,
                        meta: {
                            title: '个人设置',
                            icon: 'Setting',
                            menu: true
                        }
                    }
                ]
            },
            { path: 'profile', redirect: '/main/settings/profile' }
        ]
    },

    // 3. 超级管理员：进入后台画框
    {
        path: '/admin',
        component: AdminLayout,
        meta: { requiresAuth: true, requiresAdmin: true },
        children: [
            // 未来这里会放“用户管理”、“封号系统”等页面，现在先留空
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫：每次准备跳转前，进度条开始
router.beforeEach((to, from) => {
    NProgress.start()

    const user = getStoredUser()
    const isLoggedIn = Boolean(user?.token)

    if (to.path === '/login' && isLoggedIn) {
        return isAdmin(user) ? '/admin' : '/main/community'
    }

    if (to.meta.requiresAuth && !isLoggedIn) {
        return '/login'
    }

    if (to.meta.requiresAdmin && !isAdmin(user)) {
        return '/main/community'
    }

    return true
})

// 每次跳转完成后，进度条跑满并消失
router.afterEach(() => {
    NProgress.done()
})

export default router
