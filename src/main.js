import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 1. 引入我们刚写的“交通规则”

// 【新增】引入 Element Plus 及其 CSS 样式文件
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App) // 2. 创建 Vue 实例
app.use(router)            // 3. 【最关键的一步】把路由工具安装到 Vue 实例上
app.use(ElementPlus)       // 4. 把 Element Plus 安装到 Vue 实例上
app.mount('#app')          // 5. 最后再把完整的页面挂载显示出来