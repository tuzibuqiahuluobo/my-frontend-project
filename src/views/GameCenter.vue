<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const canvasRef = ref(null)
const assetsReady = ref(false)
const gameStarted = ref(false)
const gameMessage = ref('按开始进入关卡')

const TILE = 40
const WORLD_ROWS = 16
const WORLD_COLS = 220
const VIEW_WIDTH = TILE * 16
const VIEW_HEIGHT = TILE * WORLD_ROWS
const GRAVITY = 0.72
const MOVE_SPEED = 4.2
const JUMP_SPEED = -13.6
const ASSET_BASE = '/games/mushroom-run/'

const stats = reactive({
  coins: 0,
  lives: 3,
  time: 180,
  score: 0,
  best: Number(localStorage.getItem('sunshine-mushroom-run-best') || 0)
})

const keys = reactive({
  left: false,
  right: false,
  jump: false
})

const images = {}
let ctx = null
let rafId = 0
let lastFrameTime = 0
let timerId = 0
let cameraX = 0
let particles = []
let coins = []
let enemies = []
let rewards = []
let platforms = []
let flag = null
let player = null

const assetList = [
  ['tiles', `${ASSET_BASE}tiles.png`],
  ['idle', `${ASSET_BASE}player-idle.png`],
  ['run1', `${ASSET_BASE}player-run-1.png`],
  ['run2', `${ASSET_BASE}player-run-2.png`],
  ['jump', `${ASSET_BASE}player-jump.png`],
  ['monster', `${ASSET_BASE}monster.png`],
  ['reward', `${ASSET_BASE}reward.png`]
]

const sourceNote = '素材来源于网络，仅用于学习交流；音效和背景音乐接口已预留，后续可继续添加。'

const hudText = computed(() => {
  return `金币 ${stats.coins} / 生命 ${stats.lives} / 分数 ${stats.score} / 最佳 ${stats.best}`
})

const rectsOverlap = (a, b) => {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

const playSound = (name) => {
  // 这里先保留音效入口，后续只要把音频文件接进来，就能在跳跃、吃金币、通关等位置播放。
  void name
}

const loadImage = (key, src) => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      images[key] = image
      resolve()
    }
    image.onerror = reject
    image.src = src
  })
}

const loadAssets = async () => {
  await Promise.all(assetList.map(([key, src]) => loadImage(key, src)))
  assetsReady.value = true
}

const resetStats = () => {
  stats.coins = 0
  stats.lives = 3
  stats.time = 180
  stats.score = 0
}

const makePlatform = (x, y, w, h = TILE, type = 'ground') => ({ x, y, w, h, type })
const cell = (value) => value * TILE

const buildLevel = () => {
  platforms = []
  coins = []
  enemies = []
  rewards = []
  particles = []
  cameraX = 0
  flag = { x: cell(205), y: cell(6), w: 28, h: cell(7) }

  // 1-1 总览图标注为 220 x 16：这里用格子坐标搭关卡，便于初学时对照地图理解。
  const groundY = cell(14)
  const addGround = (start, end) => platforms.push(makePlatform(cell(start), groundY, cell(end - start), TILE))
  const addBrick = (start, row, length = 1) => platforms.push(makePlatform(cell(start), cell(row), cell(length), 28, 'brick'))
  const addPipe = (start, row, width = 2, height = 2) => platforms.push(makePlatform(cell(start), cell(row), cell(width), cell(height), 'pipe'))
  const addCoin = (col, row) => coins.push({ x: cell(col) + 9, y: cell(row) + 8, w: 22, h: 22, taken: false })
  const addReward = (col, row) => rewards.push({ x: cell(col) + 4, y: cell(row) + 4, w: 32, h: 32, taken: false })
  const addEnemy = (col, min, max, speed = -1.1) => {
    enemies.push({ x: cell(col), y: groundY - 42, w: 38, h: 42, vx: speed, min: cell(min), max: cell(max), alive: true })
  }

  addGround(0, 69)
  addGround(71, 86)
  addGround(89, 153)
  addGround(158, 220)

  addPipe(28, 12, 2, 2)
  addPipe(48, 11, 2, 3)
  addPipe(64, 10, 2, 4)
  addPipe(118, 12, 2, 2)
  addPipe(161, 12, 2, 2)

  addBrick(14, 10, 4)
  addBrick(31, 9, 1)
  addBrick(39, 10, 3)
  addBrick(77, 9, 4)
  addBrick(94, 8, 5)
  addBrick(130, 10, 4)
  addBrick(156, 10, 4)
  addBrick(187, 6, 8)
  addBrick(203, 10, 2)
  addBrick(213, 10, 4)

  // 阶梯段模拟总览图后半段的大台阶，碰撞依旧用普通矩形平台，渲染时会按砖块铺开。
  for (let step = 0; step < 6; step += 1) {
    platforms.push(makePlatform(cell(146 + step), cell(13 - step), cell(1), cell(step + 1), 'brick'))
    platforms.push(makePlatform(cell(175 + step), cell(13 - step), cell(1), cell(step + 1), 'brick'))
  }

  ;[
    [16, 9], [32, 8], [40, 9], [57, 8], [78, 8], [96, 7], [132, 9],
    [157, 9], [189, 5], [204, 9], [214, 9]
  ].forEach(([col, row]) => addReward(col, row))

  ;[
    [18, 11], [19, 11], [20, 11], [38, 11], [39, 11], [55, 9], [56, 9],
    [80, 8], [81, 8], [101, 9], [102, 9], [135, 9], [136, 9], [166, 11],
    [167, 11], [198, 9], [199, 9], [211, 8]
  ].forEach(([col, row]) => addCoin(col, row))

  addEnemy(22, 18, 27)
  addEnemy(42, 36, 47, -1.25)
  addEnemy(57, 52, 66, -1.2)
  addEnemy(101, 92, 112, -1.35)
  addEnemy(123, 116, 132, -1.2)
  addEnemy(164, 159, 173, -1.35)
  addEnemy(201, 197, 211, -1.3)

  player = {
    x: cell(2),
    y: groundY - 46,
    w: 34,
    h: 46,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    invincible: 0,
    frame: 0
  }
}

const startTimer = () => {
  clearInterval(timerId)
  timerId = window.setInterval(() => {
    if (!gameStarted.value) return
    stats.time -= 1
    if (stats.time <= 0) {
      loseLife('时间用尽，重试这一段')
    }
  }, 1000)
}

const startGame = () => {
  resetStats()
  buildLevel()
  gameStarted.value = true
  gameMessage.value = '向右前进，收集金币，到达旗杆'
  startTimer()
  playSound('start')
}

const restartFromCheckpoint = () => {
  player.x = Math.max(cell(2), cameraX + cell(2))
  player.y = cell(7)
  player.vx = 0
  player.vy = 0
  player.invincible = 90
}

const loseLife = (message) => {
  stats.lives -= 1
  gameMessage.value = message
  playSound('hurt')
  if (stats.lives <= 0) {
    gameStarted.value = false
    gameMessage.value = '挑战结束，点击重开再试一次'
    return
  }
  restartFromCheckpoint()
}

const finishGame = () => {
  gameStarted.value = false
  stats.score += stats.time * 5 + stats.coins * 25
  stats.best = Math.max(stats.best, stats.score)
  localStorage.setItem('sunshine-mushroom-run-best', String(stats.best))
  gameMessage.value = '通关完成，漂亮！'
  playSound('clear')
}

const addParticle = (x, y, text) => {
  particles.push({ x, y, text, life: 42 })
}

const applyHorizontalCollision = () => {
  player.x += player.vx
  for (const platform of platforms) {
    if (!rectsOverlap(player, platform)) continue
    if (player.vx > 0) player.x = platform.x - player.w
    if (player.vx < 0) player.x = platform.x + platform.w
    player.vx = 0
  }
}

const applyVerticalCollision = () => {
  player.y += player.vy
  player.onGround = false
  for (const platform of platforms) {
    if (!rectsOverlap(player, platform)) continue
    if (player.vy > 0) {
      player.y = platform.y - player.h
      player.vy = 0
      player.onGround = true
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h
      player.vy = 0
    }
  }
}

const updatePlayer = () => {
  const left = keys.left
  const right = keys.right
  player.vx = 0
  if (left) {
    player.vx = -MOVE_SPEED
    player.facing = -1
  }
  if (right) {
    player.vx = MOVE_SPEED
    player.facing = 1
  }
  if (keys.jump && player.onGround) {
    player.vy = JUMP_SPEED
    player.onGround = false
    playSound('jump')
  }

  player.vy += GRAVITY
  player.vy = Math.min(player.vy, 14)
  applyHorizontalCollision()
  applyVerticalCollision()
  player.x = Math.max(0, Math.min(player.x, WORLD_COLS * TILE - player.w))
  player.frame += Math.abs(player.vx) > 0 ? 0.18 : 0.05
  if (player.invincible > 0) player.invincible -= 1
  if (player.y > VIEW_HEIGHT + 160) loseLife('掉下去了，重新来')
}

const updateEnemies = () => {
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    enemy.x += enemy.vx
    if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.vx *= -1

    if (!rectsOverlap(player, enemy) || player.invincible > 0) continue
    const stomp = player.vy > 0 && player.y + player.h - enemy.y < 18
    if (stomp) {
      enemy.alive = false
      player.vy = -8
      stats.score += 100
      addParticle(enemy.x, enemy.y, '+100')
      playSound('stomp')
    } else {
      loseLife('碰到巡逻怪物了')
    }
  }
}

const updateCollectibles = () => {
  for (const coin of coins) {
    if (coin.taken || !rectsOverlap(player, coin)) continue
    coin.taken = true
    stats.coins += 1
    stats.score += 20
    addParticle(coin.x, coin.y, '+20')
    playSound('coin')
  }

  for (const reward of rewards) {
    if (reward.taken || !rectsOverlap(player, reward)) continue
    reward.taken = true
    stats.score += 150
    addParticle(reward.x, reward.y, '+150')
    playSound('reward')
  }

  if (rectsOverlap(player, flag)) finishGame()
}

const updateCamera = () => {
  const target = player.x - VIEW_WIDTH * 0.38
  cameraX += (target - cameraX) * 0.12
  cameraX = Math.max(0, Math.min(cameraX, WORLD_COLS * TILE - VIEW_WIDTH))
}

const updateParticles = () => {
  particles = particles
    .map(item => ({ ...item, y: item.y - 0.8, life: item.life - 1 }))
    .filter(item => item.life > 0)
}

const updateGame = () => {
  if (!gameStarted.value || !player) return
  updatePlayer()
  updateEnemies()
  updateCollectibles()
  updateCamera()
  updateParticles()
}

const drawTile = (sx, sy, dx, dy, dw = TILE, dh = TILE) => {
  ctx.drawImage(images.tiles, sx, sy, TILE, TILE, Math.round(dx - cameraX), Math.round(dy), dw, dh)
}

const drawBackground = () => {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT)
  gradient.addColorStop(0, '#69c8ff')
  gradient.addColorStop(0.6, '#c9f2ff')
  gradient.addColorStop(1, '#f6fffb')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)

  ctx.globalAlpha = 0.22
  const cloudOffset = -(cameraX * 0.18) % VIEW_WIDTH
  drawTile(0, 680, cloudOffset + 70, 70, 160, 70)
  drawTile(120, 680, cloudOffset + 360, 120, 160, 70)
  drawTile(0, 560, -(cameraX * 0.32) % VIEW_WIDTH + 80, 330, 160, 120)
  drawTile(120, 560, -(cameraX * 0.28) % VIEW_WIDTH + 420, 315, 210, 140)
  ctx.globalAlpha = 1
}

const drawPlatforms = () => {
  for (const platform of platforms) {
    const cols = Math.ceil(platform.w / TILE)
    const rows = Math.ceil(platform.h / TILE)
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = platform.x + col * TILE
        const y = platform.y + row * TILE
        if (x + TILE < cameraX || x > cameraX + VIEW_WIDTH) continue
        if (platform.type === 'brick') {
          drawTile(0, 0, x, y, TILE, Math.min(TILE, platform.h - row * TILE))
        } else if (platform.type === 'pipe') {
          drawTile(480, 120, x, y, TILE, TILE)
        } else {
          drawTile(0, 360, x, y, TILE, TILE)
        }
      }
    }
  }
}

const drawCollectibles = () => {
  coins.forEach((coin, index) => {
    if (coin.taken) return
    const wobble = Math.sin(performance.now() / 180 + index) * 3
    ctx.fillStyle = '#ffd34d'
    ctx.strokeStyle = '#b36b00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(coin.x - cameraX + 11, coin.y + 11 + wobble, 10, 13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  rewards.forEach(reward => {
    if (!reward.taken) {
      ctx.drawImage(images.reward, Math.round(reward.x - cameraX), Math.round(reward.y), reward.w, reward.h)
    }
  })
}

const drawEnemies = () => {
  enemies.forEach(enemy => {
    if (!enemy.alive) return
    ctx.save()
    const centerX = enemy.x - cameraX + enemy.w / 2
    if (enemy.vx > 0) {
      ctx.translate(centerX, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(images.monster, -enemy.w / 2, enemy.y, enemy.w, enemy.h)
    } else {
      ctx.drawImage(images.monster, enemy.x - cameraX, enemy.y, enemy.w, enemy.h)
    }
    ctx.restore()
  })
}

const drawFlag = () => {
  ctx.fillStyle = '#374151'
  ctx.fillRect(flag.x - cameraX + 12, flag.y, 6, flag.h)
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(flag.x - cameraX + 18, flag.y + 14)
  ctx.lineTo(flag.x - cameraX + 92, flag.y + 34)
  ctx.lineTo(flag.x - cameraX + 18, flag.y + 56)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#8b5cf6'
  for (let i = 0; i < 4; i += 1) {
    drawTile(0, 360, cell(210 + i), cell(13), TILE, TILE)
    drawTile(0, 360, cell(210 + i), cell(12), TILE, TILE)
  }
}

const drawPlayer = () => {
  const sprite = !player.onGround ? images.jump : (Math.abs(player.vx) > 0.2 ? (Math.floor(player.frame) % 2 ? images.run1 : images.run2) : images.idle)
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return
  ctx.save()
  const drawW = player.w
  const drawH = player.h
  if (player.facing < 0) {
    ctx.translate(player.x - cameraX + drawW / 2, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(sprite, -drawW / 2, player.y, drawW, drawH)
  } else {
    ctx.drawImage(sprite, player.x - cameraX, player.y, drawW, drawH)
  }
  ctx.restore()
}

const drawParticles = () => {
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.textAlign = 'center'
  particles.forEach(item => {
    ctx.globalAlpha = Math.max(0, item.life / 42)
    ctx.fillStyle = '#fff7ed'
    ctx.strokeStyle = '#9a3412'
    ctx.lineWidth = 3
    ctx.strokeText(item.text, item.x - cameraX, item.y)
    ctx.fillText(item.text, item.x - cameraX, item.y)
  })
  ctx.globalAlpha = 1
}

const drawHud = () => {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
  ctx.fillRect(20, 18, 420, 42)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 18px "Trebuchet MS", sans-serif'
  ctx.fillText(`金币 ${stats.coins}`, 38, 45)
  ctx.fillText(`生命 ${stats.lives}`, 138, 45)
  ctx.fillText(`时间 ${stats.time}`, 238, 45)
  ctx.fillText(`分数 ${stats.score}`, 338, 45)
}

const renderGame = () => {
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
  drawBackground()
  drawPlatforms()
  drawFlag()
  drawCollectibles()
  drawEnemies()
  if (player) drawPlayer()
  drawParticles()
  drawHud()
}

const loop = (time) => {
  const delta = time - lastFrameTime
  lastFrameTime = time
  if (delta < 80) updateGame()
  renderGame()
  rafId = requestAnimationFrame(loop)
}

const setKey = (key, value) => {
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') keys.left = value
  if (key === 'ArrowRight' || key === 'd' || key === 'D') keys.right = value
  if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ') keys.jump = value
}

const onKeyDown = (event) => {
  const handled = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'w', 'W'].includes(event.key)
  if (handled) event.preventDefault()
  setKey(event.key, true)
}

const onKeyUp = (event) => {
  setKey(event.key, false)
}

const holdControl = (name, value) => {
  keys[name] = value
}

onMounted(async () => {
  ctx = canvasRef.value?.getContext('2d')
  await loadAssets()
  buildLevel()
  renderGame()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearInterval(timerId)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="game-center-page">
    <section class="game-hero">
      <div class="game-copy">
        <span class="game-kicker">SunShine 游戏中心</span>
        <h1>蘑菇跳跃冒险</h1>
        <p>一款轻量浏览器横版跳跃小游戏，按 1-1 总览图的 220 x 16 格尺寸搭建，单屏显示 16 格。当前版本先完成移动、跳跃、金币、怪物、通关和失败判断。</p>
      </div>
      <div class="game-panel">
        <div class="game-panel-title">当前游戏</div>
        <strong>像素平台跳跃</strong>
        <span>{{ hudText }}</span>
      </div>
    </section>

    <section class="play-shell">
      <div class="game-toolbar">
        <div>
          <span class="status-dot" :class="{ active: gameStarted }"></span>
          <strong>{{ gameMessage }}</strong>
        </div>
        <div class="game-actions">
          <button type="button" @click="startGame" :disabled="!assetsReady">{{ gameStarted ? '重新开始' : '开始游戏' }}</button>
        </div>
      </div>

      <div class="canvas-frame">
        <canvas ref="canvasRef" :width="VIEW_WIDTH" :height="VIEW_HEIGHT" aria-label="蘑菇跳跃冒险游戏画面"></canvas>
      </div>

      <div class="mobile-controls" aria-label="移动端控制按钮">
        <button type="button" @pointerdown="holdControl('left', true)" @pointerup="holdControl('left', false)" @pointerleave="holdControl('left', false)">左</button>
        <button type="button" @pointerdown="holdControl('jump', true)" @pointerup="holdControl('jump', false)" @pointerleave="holdControl('jump', false)">跳</button>
        <button type="button" @pointerdown="holdControl('right', true)" @pointerup="holdControl('right', false)" @pointerleave="holdControl('right', false)">右</button>
      </div>
    </section>

    <section class="game-info">
      <article>
        <h2>玩法</h2>
        <p>方向键或 A/D 移动，空格、W 或上方向键跳跃。踩到怪物可以获得分数，碰到怪物或掉下平台会损失生命。</p>
      </article>
      <article>
        <h2>地图规则</h2>
        <p>地图按 220 x 16 格理解，一块砖为一格，玩家视口宽度为 16 格；当前先复刻 1-1 的主要地面、管道、砖块、阶梯、怪物和终点节奏。</p>
      </article>
      <article>
        <h2>素材说明</h2>
        <p>{{ sourceNote }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.game-center-page {
  max-width: 1180px;
  margin: 0 auto;
  color: #1f2937;
}

.game-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  gap: 18px;
  margin-bottom: 18px;
}

.game-copy,
.game-panel,
.play-shell,
.game-info article {
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

.game-copy {
  padding: 22px;
  background:
    linear-gradient(135deg, rgba(224, 242, 254, 0.96), rgba(255, 255, 255, 0.94)),
    repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0 12px, transparent 12px 24px);
}

.game-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: #0284c7;
  font-size: 13px;
  font-weight: 800;
}

.game-copy h1 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.2;
}

.game-copy p,
.game-panel span,
.game-info p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.game-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 20px;
}

.game-panel-title {
  color: #38bdf8;
  font-size: 13px;
  font-weight: 800;
}

.game-panel strong {
  color: #0f172a;
  font-size: 22px;
}

.play-shell {
  overflow: hidden;
  padding: 14px;
}

.game-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.game-toolbar > div:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.game-toolbar strong {
  color: #334155;
  font-size: 14px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
}

.game-actions button,
.mobile-controls button {
  border: none;
  background: linear-gradient(135deg, #38bdf8, #0284c7);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(14, 165, 233, 0.26);
}

.game-actions button {
  min-width: 100px;
  height: 36px;
  border-radius: 999px;
}

.game-actions button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.canvas-frame {
  position: relative;
  overflow: hidden;
  border: 4px solid #0f172a;
  border-radius: 8px;
  background: #8bdcff;
}

canvas {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  image-rendering: pixelated;
}

.mobile-controls {
  display: none;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.mobile-controls button {
  height: 44px;
  border-radius: 8px;
  touch-action: none;
}

.game-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.game-info article {
  padding: 16px;
}

.game-info h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 16px;
}

@media (max-width: 900px) {
  .game-hero,
  .game-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .game-copy h1 {
    font-size: 24px;
  }

  .game-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .game-actions button {
    width: 100%;
  }

  .mobile-controls {
    display: grid;
  }
}
</style>
