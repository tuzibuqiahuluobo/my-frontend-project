import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'

const routes = [
    { path: '/', redirect: '/login' }, // 默认跳转到登录
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router