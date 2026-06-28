<script setup>
const gameCards = [
  {
    title: '像素跳跃',
    type: '休闲闯关',
    intro: '轻量跳跃玩法，适合后续接入键盘控制和分数记录。',
    theme: 'sky'
  },
  {
    title: '星球消消乐',
    type: '益智消除',
    intro: '用方块和连击做核心反馈，适合做成短局小游戏。',
    theme: 'sunset'
  },
  {
    title: '极速拼图',
    type: '拼图挑战',
    intro: '上传图片后切块拼回原图，后续可以增加计时榜单。',
    theme: 'mint'
  },
  {
    title: '记忆翻牌',
    type: '记忆训练',
    intro: '翻开卡片寻找成对图案，规则简单、适合移动端。',
    theme: 'violet'
  },
  {
    title: '弹球守卫',
    type: '反应类',
    intro: '挡板接球和关卡砖块，后续可加入道具和音效。',
    theme: 'coral'
  },
  {
    title: '贪吃方块',
    type: '经典复刻',
    intro: '经典方向控制玩法，适合练习碰撞检测和状态管理。',
    theme: 'lime'
  },
  {
    title: '节奏点击',
    type: '音乐节奏',
    intro: '跟随节拍点击目标，后续可接入本地音频或谱面。',
    theme: 'blue'
  },
  {
    title: '迷宫寻路',
    type: '策略探索',
    intro: '在网格迷宫中寻找出口，适合加入随机地图生成。',
    theme: 'amber'
  },
  {
    title: '打字冲刺',
    type: '练习工具',
    intro: '输入单词击破目标，兼具小游戏和打字练习。',
    theme: 'rose'
  },
  {
    title: '太空躲避',
    type: '动作闪避',
    intro: '控制飞船躲避陨石，适合做成 Canvas 小游戏。',
    theme: 'night'
  }
]
</script>

<template>
  <div class="game-center-page">
    <section class="game-header">
      <div>
        <h1>游戏中心（暂未开发）</h1>
        <p>这里会集中展示可以直接在网页里运行的小游戏。</p>
      </div>
      <span class="game-count">{{ gameCards.length }} 个占位游戏</span>
    </section>

    <section class="game-grid">
      <article v-for="game in gameCards" :key="game.title" class="game-card">
        <div class="game-cover" :class="`theme-${game.theme}`">
          <span>{{ game.title.slice(0, 2) }}</span>
        </div>
        <div class="game-body">
          <div class="game-meta">{{ game.type }}</div>
          <h2>{{ game.title }}</h2>
          <p>{{ game.intro }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.game-center-page {
  max-width: 1180px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.game-header h1 {
  margin: 0 0 6px;
  color: #303133;
  font-size: 26px;
}

.game-header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.game-count {
  flex: 0 0 auto;
  padding: 7px 12px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0284c7;
  font-size: 13px;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.game-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}

.game-card:hover {
  transform: translateY(-3px);
  border-color: #bae6fd;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
}

.game-cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 10;
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 2px;
}

.game-cover::after {
  content: "";
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 8px;
}

.game-cover span {
  position: relative;
  z-index: 1;
}

.theme-sky { background: linear-gradient(135deg, #38bdf8, #2563eb); }
.theme-sunset { background: linear-gradient(135deg, #fb7185, #f59e0b); }
.theme-mint { background: linear-gradient(135deg, #34d399, #0f766e); }
.theme-violet { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
.theme-coral { background: linear-gradient(135deg, #fb7185, #ef4444); }
.theme-lime { background: linear-gradient(135deg, #84cc16, #16a34a); }
.theme-blue { background: linear-gradient(135deg, #60a5fa, #4f46e5); }
.theme-amber { background: linear-gradient(135deg, #fbbf24, #d97706); }
.theme-rose { background: linear-gradient(135deg, #f472b6, #be185d); }
.theme-night { background: linear-gradient(135deg, #475569, #111827); }

.game-body {
  padding: 12px;
}

.game-meta {
  margin-bottom: 6px;
  color: #38bdf8;
  font-size: 12px;
  font-weight: 700;
}

.game-body h2 {
  margin: 0 0 6px;
  color: #303133;
  font-size: 15px;
  line-height: 1.35;
}

.game-body p {
  display: -webkit-box;
  min-height: 40px;
  margin: 0;
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 1180px) {
  .game-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .game-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .game-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .game-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
