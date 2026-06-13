<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { clearStoredUser, getStoredUser } from '../api'

const router = useRouter()
const currentUser = ref({ uid: null, username: '', avatar: '' })

onMounted(() => {
  const user = getStoredUser()
  if (!user) {
    router.push('/login')
  } else {
    currentUser.value = user
  }
})

const logout = () => {
  clearStoredUser()
  ElMessage.info('已安全退出')
  router.push('/login')
}

// 跳转到刚刚新建的资料设置页
const goToProfile = () => {
  router.push('/main/settings/profile')
}
</script>

<template>
  <div style="background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px;">
    <div style="max-width: 900px; margin: 0 auto;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #303133;">个人中心</h1>
        <el-button type="danger" plain @click="logout">退出登录</el-button>
      </div>

      <el-card shadow="never" style="border-radius: 12px; margin-bottom: 30px;">
        <div style="display: flex; align-items: center;">
          <el-avatar :src="currentUser.avatar" :size="80" style="border: 2px solid #eee; margin-right: 30px;" />
          <div style="flex-grow: 1;">
            <h2 style="margin: 0 0 10px 0; color: #303133;">{{ currentUser.username }}</h2>
            <p style="margin: 0 0 15px 0; color: #909399; font-size: 14px;">UID: {{ String(currentUser.uid).padStart(5, '0') }}</p>
            <div>
              <el-button size="small" round type="primary" plain @click="goToProfile">
                <el-icon style="margin-right: 5px;"><Setting /></el-icon> 
                编辑个人资料
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <h3 style="color: #303133; margin-bottom: 20px;">🛠️ 我的创意空间</h3>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="border-radius: 12px; height: 100%;">
            <h3 style="margin-top: 0; color: #409EFF;">Roguelike 路线算法</h3>
            <p style="color: #606266; font-size: 14px; line-height: 1.6;">基于有向无环图 (DAG) 的地图生成引擎。完美复刻《杀戮尖塔》的核心分层与节点防交叉算法。</p>
            <div style="margin-top: 20px;">
              <el-button type="primary" plain size="small">在线演示</el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="border-radius: 12px; height: 100%;">
            <h3 style="margin-top: 0; color: #67C23A;">HD-2D 战棋引擎</h3>
            <p style="color: #606266; font-size: 14px; line-height: 1.6;">使用 Godot 4.6.1 打造的 SRPG 核心框架。包含网格寻路、战斗结算特效与渲染管线。</p>
            <div style="margin-top: 20px;">
              <el-button type="success" plain size="small">技术文档</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

    </div>
  </div>
</template>
