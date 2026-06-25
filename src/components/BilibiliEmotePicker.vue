<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DEFAULT_PACK_ID,
  downloadBiliEmojiPack,
  ensureDefaultBiliEmojiPack,
  getActiveBiliEmojiPackId,
  loadInstalledBiliEmojiPacks,
  loadRepoBiliEmojiPacks,
  saveActiveBiliEmojiPack
} from '../utils/biliEmojiPacks'

const emit = defineEmits(['select'])
defineProps({
  size: {
    type: String,
    default: 'normal'
  }
})

const packs = ref([])
const activePackId = ref(DEFAULT_PACK_ID)
const loading = ref(false)
const pickerVisible = ref(false)
const marketVisible = ref(false)
const marketLoading = ref(false)
const downloadingId = ref('')
const marketPacks = ref([])
const marketPage = ref(1)
const pageSize = 25

const activePack = computed(() => {
  return packs.value.find(pack => pack.id === activePackId.value) || packs.value[0] || { name: '小黄脸', emotes: [] }
})

const installedIds = computed(() => new Set(packs.value.map(pack => pack.id)))
const marketTotal = computed(() => marketPacks.value.length)
const pagedMarketPacks = computed(() => {
  const start = (marketPage.value - 1) * pageSize
  return marketPacks.value.slice(start, start + pageSize)
})

const refreshInstalledPacks = async () => {
  const installed = await loadInstalledBiliEmojiPacks()
  packs.value = installed
  const storedActive = getActiveBiliEmojiPackId()
  activePackId.value = installed.some(pack => pack.id === storedActive) ? storedActive : (installed[0]?.id || DEFAULT_PACK_ID)
}

const initPacks = async () => {
  loading.value = true
  try {
    await ensureDefaultBiliEmojiPack()
    await refreshInstalledPacks()
  } catch (error) {
    ElMessage.warning(error.message || '默认小黄脸表情包加载失败')
  } finally {
    loading.value = false
  }
}

const selectPack = (packId) => {
  activePackId.value = packId
  saveActiveBiliEmojiPack(packId)
}

const selectEmote = (emote) => {
  emit('select', emote.code)
}

const openMarket = async () => {
  // 点击“+”时先收起当前表情面板，否则两个浮层会叠在一起，用户会看不清下载弹窗。
  pickerVisible.value = false
  marketVisible.value = true
  if (marketPacks.value.length > 0) return
  marketLoading.value = true
  try {
    marketPacks.value = await loadRepoBiliEmojiPacks()
  } catch (error) {
    ElMessage.error(error.message || '在线表情包列表加载失败')
  } finally {
    marketLoading.value = false
  }
}

const confirmDownload = async (pack) => {
  if (installedIds.value.has(pack.id)) {
    selectPack(pack.id)
    marketVisible.value = false
    return
  }

  try {
    await ElMessageBox.confirm(`确定下载「${pack.name}」表情包吗？下载后会缓存在当前浏览器里。`, '下载表情包', {
      confirmButtonText: '下载',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch (error) {
    return
  }

  downloadingId.value = pack.id
  try {
    await downloadBiliEmojiPack(pack.id)
    await refreshInstalledPacks()
    selectPack(pack.id)
    marketVisible.value = false
    ElMessage.success(`「${pack.name}」已下载`)
  } catch (error) {
    ElMessage.error(error.message || '表情包下载失败，请稍后再试')
  } finally {
    downloadingId.value = ''
  }
}

onMounted(initPacks)
</script>

<template>
  <el-popover v-model:visible="pickerVisible" placement="bottom-start" trigger="click" width="360">
    <template #reference>
      <button class="emote-trigger" :class="size" type="button" title="添加 B 站表情">
        <span>☺</span>
      </button>
    </template>

    <div class="emote-panel">
      <div class="pack-title">{{ activePack.name }}</div>

      <div v-if="loading" class="emote-loading">正在加载表情包...</div>
      <div v-else class="emote-grid">
        <button
          v-for="emote in activePack.emotes"
          :key="emote.code"
          class="emote-item"
          type="button"
          :title="emote.code"
          @click="selectEmote(emote)"
        >
          <img :src="emote.src" :alt="emote.name" loading="lazy">
        </button>
      </div>

      <div class="pack-switcher">
        <button
          v-for="pack in packs"
          :key="pack.id"
          type="button"
          class="pack-tab"
          :class="{ active: pack.id === activePackId }"
          :title="pack.name"
          @click="selectPack(pack.id)"
        >
          <img :src="pack.icon" :alt="pack.name" loading="lazy">
        </button>
        <button class="pack-tab add-tab" type="button" title="下载更多表情包" @click="openMarket">+</button>
      </div>
    </div>
  </el-popover>

  <el-dialog
    v-model="marketVisible"
    width="640px"
    align-center
    class="emote-market-dialog"
  >
    <template #header>
      <div class="market-header">
        <div>
          <h3>下载表情包</h3>
          <p>选择喜欢的系列，下载后会保存在当前浏览器里。</p>
        </div>
        <span class="market-count">共 {{ marketTotal }} 套</span>
      </div>
    </template>

    <el-skeleton v-if="marketLoading" :rows="6" animated />
    <template v-else>
      <div class="market-grid" v-if="pagedMarketPacks.length">
        <button
          v-for="pack in pagedMarketPacks"
          :key="pack.id"
          type="button"
          class="market-card"
          :class="{ installed: installedIds.has(pack.id) }"
          :disabled="downloadingId === pack.id"
          @click="confirmDownload(pack)"
        >
          <img :src="pack.icon" :alt="pack.name" loading="lazy">
          <span>{{ pack.name }}</span>
          <small>{{ installedIds.has(pack.id) ? '已下载' : (downloadingId === pack.id ? '下载中...' : '点击下载') }}</small>
        </button>
      </div>
      <div v-else class="market-empty">暂时没有可下载的表情包</div>
      <div class="market-pagination">
        <el-pagination
          v-model:current-page="marketPage"
          layout="prev, pager, next"
          :page-size="pageSize"
          :total="marketTotal"
          small
        />
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.emote-trigger {
  width: 42px;
  height: 42px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(31, 41, 55, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.emote-trigger:hover {
  border-color: #38bdf8;
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.22);
  transform: translateY(-1px);
}

.emote-trigger.small {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 18px;
  box-shadow: none;
}

.emote-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pack-title {
  font-size: 13px;
  color: #64748b;
  padding: 2px 2px 0;
}

.emote-loading {
  min-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 13px;
}

.emote-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 7px;
  max-height: 230px;
  overflow-y: auto;
  padding: 4px 2px;
}

.emote-item {
  width: 38px;
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  transition: background-color 0.15s, transform 0.15s;
}

.emote-item:hover {
  background: #eef6ff;
  transform: translateY(-1px);
}

.emote-item img {
  max-width: 32px;
  max-height: 32px;
  object-fit: contain;
}

.pack-switcher {
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow-x: auto;
  box-sizing: border-box;
}

.pack-tab {
  width: 40px;
  min-width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  transition: border-color 0.18s, background-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.pack-tab:hover {
  border-color: #7dd3fc;
  background: #f0f9ff;
  box-shadow: 0 6px 16px rgba(56, 189, 248, 0.16);
  transform: translateY(-1px);
}

.pack-tab.active {
  background: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.14), 0 6px 16px rgba(56, 189, 248, 0.18);
}

.pack-tab img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
}

.add-tab {
  color: #38bdf8;
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
}

.market-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 28px;
}

.market-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.market-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.market-count {
  flex: 0 0 auto;
  padding: 6px 10px;
  color: #0284c7;
  font-size: 12px;
  font-weight: 600;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 999px;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.market-card {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 14px;
  padding: 9px 7px;
  cursor: pointer;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.market-card:hover {
  border-color: #38bdf8;
  background: #f8fdff;
  box-shadow: 0 10px 24px rgba(56, 189, 248, 0.16);
  transform: translateY(-2px);
}

.market-card:disabled {
  cursor: wait;
  opacity: 0.72;
  transform: none;
}

.market-card.installed {
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
  border-color: #7dd3fc;
}

.market-card img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 13px;
  box-sizing: border-box;
}

.market-card span {
  width: 100%;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-card small {
  padding: 3px 8px;
  color: #64748b;
  font-size: 11px;
  background: #f1f5f9;
  border-radius: 999px;
}

.market-pagination {
  display: flex;
  justify-content: center;
  margin-top: 18px;
  padding-top: 4px;
}

.market-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
}

:deep(.emote-market-dialog) {
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
  max-width: calc(100vw - 32px);
}

:deep(.emote-market-dialog .el-dialog__header) {
  margin: 0;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #eef2f7;
}

:deep(.emote-market-dialog .el-dialog__body) {
  max-height: calc(100vh - 180px);
  padding: 14px 18px 18px;
  overflow-y: auto;
}

@media (max-width: 640px) {
  :deep(.emote-market-dialog) {
    width: calc(100vw - 24px) !important;
  }

  .market-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-height: auto;
  }

  .market-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
