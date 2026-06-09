<template>
  <router-view v-slot="{ Component }">
    <transition name="fade-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* ---- 页面的淡入滑出动画逻辑 ---- */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(30px); /* 新页面从右边 30px 的地方滑进来 */
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px); /* 老页面向左边滑出 30px 并消失 */
}

/* ---- 自定义进度条的颜色，把它改成 Element Plus 的主题蓝 ---- */
#nprogress .bar {
  background: #409EFF !important;
  height: 3px !important; /* 加粗进度条 */
}
</style>