<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const currentUser = ref({ uid: null, username: '', avatar: '' })

// 控制高级弹窗的状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogType = ref('') // 'username' 或 'avatar'
const modalInput = ref('')
const saving = ref(false)

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (!userStr) {
    router.push('/login')
  } else {
    currentUser.value = JSON.parse(userStr)
    if (!currentUser.value.avatar) {
      currentUser.value.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + currentUser.value.username
    }
  }
})

const openDialog = (type) => {
  dialogType.value = type
  dialogTitle.value = type === 'username' ? '修改用户名' : '修改头像链接'
  modalInput.value = type === 'username' ? currentUser.value.username : currentUser.value.avatar
  dialogVisible.value = true
}

const confirmUpdate = async () => {
  if (!modalInput.value) return
  
  saving.value = true
  const newUsername = dialogType.value === 'username' ? modalInput.value : ''
  const newAvatar = dialogType.value === 'avatar' ? modalInput.value : ''

  try {
    const response = await fetch('http://localhost:8080/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUser.value.uid, username: newUsername, avatar: newAvatar })
    })
    
    const data = await response.json()
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success('资料更新成功！')
      if (newUsername) currentUser.value.username = newUsername
      if (newAvatar) currentUser.value.avatar = newAvatar
      localStorage.setItem('user', JSON.stringify(currentUser.value))
      dialogVisible.value = false // 关闭弹窗
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后再试')
  } finally {
    saving.value = false
  }
}

const logout = () => {
  localStorage.removeItem('user')
  ElMessage.info('已安全退出')
  router.push('/login')
}
</script>

<template>
  <div style="background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px;">
    
    <div style="max-width: 900px; margin: 0 auto;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #303133;">开发者中心</h1>
        <el-button type="danger" plain @click="logout">退出登录</el-button>
      </div>

      <el-card shadow="never" style="border-radius: 12px; margin-bottom: 30px;">
        <div style="display: flex; align-items: center;">
          <el-avatar :src="currentUser.avatar" :size="80" style="border: 2px solid #eee; margin-right: 30px;" />
          <div style="flex-grow: 1;">
            <h2 style="margin: 0 0 10px 0; color: #303133;">{{ currentUser.username }}</h2>
            <p style="margin: 0 0 15px 0; color: #909399; font-size: 14px;">开发者 ID: {{ currentUser.uid }}</p>
            <div>
              <el-button size="small" round @click="openDialog('avatar')">更换头像</el-button>
              <el-button size="small" round @click="openDialog('username')">修改名字</el-button>
            </div>
          </div>
        </div>
      </el-card>

      <h3 style="color: #303133; margin-bottom: 20px;">🛠️ 我的创意空间</h3>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="border-radius: 12px; height: 100%;">
            <h3 style="margin-top: 0; color: #409EFF;">Roguelike 路线算法</h3>
            <p style="color: #606266; font-size: 14px; line-height: 1.6;">
              基于有向无环图 (DAG) 的地图生成引擎。完美复刻《杀戮尖塔》的核心分层与节点防交叉算法。
            </p>
            <div style="margin-top: 20px;">
              <el-button type="primary" plain size="small">在线演示</el-button>
              <el-button text size="small">查看源码</el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="12" style="margin-bottom: 20px;">
          <el-card shadow="hover" style="border-radius: 12px; height: 100%;">
            <h3 style="margin-top: 0; color: #67C23A;">HD-2D 战棋引擎</h3>
            <p style="color: #606266; font-size: 14px; line-height: 1.6;">
              使用 Godot 4.6.1 打造的 SRPG 核心框架。包含网格寻路、战斗结算特效与类《歧路旅人》的美术渲染管线。
            </p>
            <div style="margin-top: 20px;">
              <el-button type="success" plain size="small">技术文档</el-button>
              <el-button text size="small">运行截图</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="400px"
      align-center
    >
      <el-input 
        v-model="modalInput" 
        :placeholder="'请输入新的' + (dialogType === 'username' ? '用户名' : '链接')" 
        clearable
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="confirmUpdate">
            确认保存
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>