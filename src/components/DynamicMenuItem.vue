<script setup>
import { computed } from 'vue'
import {
  ChatDotRound,
  Collection,
  House,
  Setting,
  User
} from '@element-plus/icons-vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

// 这里把“字符串名字”和“真实图标组件”对应起来。
// 路由配置里只写 icon: 'ChatDotRound'，菜单组件再来这里取真正的图标。
const iconMap = {
  ChatDotRound,
  Collection,
  House,
  Setting,
  User
}

// 判断当前菜单项有没有子菜单；有 children 就渲染 el-sub-menu，没有就渲染 el-menu-item。
const hasChildren = computed(() => Array.isArray(props.item.children) && props.item.children.length > 0)

// Element Plus 的图标需要组件本体；如果没配置图标，就返回 null，模板里会自动不显示。
const menuIcon = computed(() => iconMap[props.item.icon] || null)
</script>

<template>
  <el-sub-menu v-if="hasChildren" :index="item.index">
    <template #title>
      <el-icon v-if="menuIcon">
        <component :is="menuIcon" />
      </el-icon>
      <span>{{ item.title }}</span>
    </template>

    <DynamicMenuItem
      v-for="child in item.children"
      :key="child.index"
      :item="child"
    />
  </el-sub-menu>

  <el-menu-item v-else :index="item.index">
    <el-icon v-if="menuIcon">
      <component :is="menuIcon" />
    </el-icon>
    <template #title>{{ item.title }}</template>
  </el-menu-item>
</template>
