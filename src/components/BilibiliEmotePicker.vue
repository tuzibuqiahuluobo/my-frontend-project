<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DEFAULT_BILIEMOJI_PACK,
  STORAGE_ACTIVE_KEY,
  buildPackFromFiles,
  emoteNameFromFile,
  loadCustomBiliEmojiPacks,
  loadDefaultBiliEmojiPack,
  saveCustomBiliEmojiPacks
} from '../utils/biliEmojiPacks'

const emit = defineEmits(['select'])
defineProps({
  size: {
    type: String,
    default: 'normal'
  }
})

const packs = ref([DEFAULT_BILIEMOJI_PACK])
const activePackId = ref(DEFAULT_BILIEMOJI_PACK.id)
const folderInputRef = ref(null)
const loadingDefaultPack = ref(false)

const activePack = computed(() => {
  return packs.value.find(pack => pack.id === activePackId.value) || packs.value[0] || DEFAULT_BILIEMOJI_PACK
})

const setPackList = (builtinPack, customPacks = []) => {
  packs.value = [builtinPack, ...customPacks]
  if (!packs.value.some(pack => pack.id === activePackId.value)) {
    activePackId.value = builtinPack.id
  }
}

const loadStoredPacks = async () => {
  const customPacks = loadCustomBiliEmojiPacks()
  activePackId.value = localStorage.getItem(STORAGE_ACTIVE_KEY) || DEFAULT_BILIEMOJI_PACK.id
  setPackList(DEFAULT_BILIEMOJI_PACK, customPacks)

  try {
    loadingDefaultPack.value = true
    // 默认表情包来自 lrhtony/BiliEmoji 的“小黄脸”，每个用户打开页面时都会自动加载，不需要自己手动导入。
    const defaultPack = await loadDefaultBiliEmojiPack()
    setPackList(defaultPack, customPacks)
  } catch (error) {
    ElMessage.warning('默认小黄脸表情包加载失败，请检查网络后刷新页面')
  } finally {
    loadingDefaultPack.value = false
  }
}

const saveCustomPacks = () => {
  saveCustomBiliEmojiPacks(packs.value, activePackId.value)
}

const readFileAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => resolve(event.target.result)
    reader.onerror = () => reject(new Error('表情图片读取失败'))
    reader.readAsDataURL(file)
  })
}

const packNameFromPath = (relativePath) => {
  const parts = String(relativePath || '').split('/').filter(Boolean)
  // 选择整个仓库时通常是“仓库名/表情包名/图片”，选择单个表情包时通常是“表情包名/图片”。
  return parts.length >= 3 ? parts[1] : (parts[0] || '我的表情包')
}

const importPackFolder = async (event) => {
  const files = Array.from(event.target.files || [])
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  event.target.value = ''
  if (imageFiles.length === 0) {
    ElMessage.warning('请选择包含图片的表情包文件夹')
    return
  }

  const packMap = new Map()
  for (const file of imageFiles) {
    const packName = packNameFromPath(file.webkitRelativePath)
    if (!packMap.has(packName)) {
      packMap.set(packName, [])
    }
    const name = emoteNameFromFile(file.name)
    packMap.get(packName).push({
      name,
      code: `[${name}]`,
      fileName: file.name,
      src: await readFileAsDataUrl(file)
    })
  }

  const importedPacks = Array.from(packMap.entries()).map(([name, emotes]) => ({
    ...buildPackFromFiles(name, []),
    emotes: emotes.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }))

  try {
    const existingCustomPacks = packs.value.filter(pack => !pack.builtin)
    packs.value = [packs.value[0] || DEFAULT_BILIEMOJI_PACK, ...existingCustomPacks, ...importedPacks]
    activePackId.value = importedPacks[0]?.id || activePackId.value
    saveCustomPacks()
    ElMessage.success(`已导入 ${importedPacks.length} 套表情包`)
  } catch (error) {
    ElMessage.error('表情包太大，浏览器本地存储放不下。请只导入常用的一套或精简图片数量。')
    loadStoredPacks()
  }
}

const selectEmote = (emote) => {
  emit('select', emote.code)
}

const removeActivePack = () => {
  if (activePack.value.builtin) {
    ElMessage.info('默认小黄脸表情包不能删除')
    return
  }
  packs.value = packs.value.filter(pack => pack.id !== activePackId.value)
  activePackId.value = DEFAULT_BILIEMOJI_PACK.id
  saveCustomPacks()
  ElMessage.success('已移除本地表情包')
}

onMounted(loadStoredPacks)
</script>

<template>
  <el-popover placement="bottom-start" trigger="click" width="380">
    <template #reference>
      <button class="emote-trigger" :class="size" type="button" title="添加 B 站表情">
        <span>☺</span>
      </button>
    </template>

    <div class="emote-panel">
      <div class="emote-toolbar">
        <el-select v-model="activePackId" size="small" class="pack-select" @change="saveCustomPacks">
          <el-option v-for="pack in packs" :key="pack.id" :label="pack.name" :value="pack.id" />
        </el-select>
        <el-button size="small" plain @click="folderInputRef?.click()">导入</el-button>
        <el-button size="small" plain type="danger" @click="removeActivePack">移除</el-button>
        <input ref="folderInputRef" type="file" hidden multiple webkitdirectory @change="importPackFolder">
      </div>

      <a v-if="activePack.builtin" class="source-link" :href="activePack.source" target="_blank" rel="noreferrer">
        默认表情来源：BiliEmoji / 小黄脸
      </a>

      <div v-if="loadingDefaultPack && activePack.builtin" class="emote-loading">
        正在加载小黄脸...
      </div>
      <div v-else class="emote-grid">
        <button
          v-for="emote in activePack.emotes"
          :key="emote.code"
          class="emote-item"
          type="button"
          :title="emote.code"
          @click="selectEmote(emote)"
        >
          <img v-if="emote.src" :src="emote.src" :alt="emote.name" loading="lazy">
          <span v-else>{{ emote.name }}</span>
        </button>
      </div>
    </div>
  </el-popover>
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
  gap: 10px;
}

.emote-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pack-select {
  flex: 1;
}

.source-link {
  color: #409eff;
  font-size: 12px;
  text-decoration: none;
}

.emote-loading {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 13px;
}

.emote-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.emote-item {
  min-height: 52px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: #475569;
  font-size: 12px;
  line-height: 1.2;
  transition: background-color 0.15s, transform 0.15s;
}

.emote-item:hover {
  background: #e0f2fe;
  transform: translateY(-1px);
}

.emote-item img {
  max-width: 40px;
  max-height: 40px;
  object-fit: contain;
}
</style>

