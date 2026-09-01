# 第 6 章：遊戲流程設計

[← 返回目錄](00_index.md) | [← 上一章](05_ui_ux_design.md)

---

## 6.1 完整遊戲流程圖

```
啟動應用程式
  │
  ▼
WASM 初始化
  │  • 載入 Rapier3D WASM（await RAPIER.init()）
  │  • 顯示 Loading 畫面
  │
  ▼
遊戲初始化 (Game.init)
  │  • Three.js Scene / Camera / Renderer 建立
  │  • CSS2DRenderer 建立
  │  • EffectComposer + UnrealBloomPass 初始化
  │  • 光照系統設定（Ambient + 三向 DirectionalLight）
  │  • Geometry / Material 工廠初始化
  │  • 建立所有 System：Physics / Merge / Particle / GridFlow / Audio / CameraOrbit
  │  • 建立瞄準導線 + NEXT 預覽 Renderer（內建於 Game）
  │  • 綁定 DOM HUD / Overlay 事件（index.html）
  │  • 繪製 3D 環境（地板格線、容器線框、Game Over 平面）
  │  • 綁定輸入事件
  │  • 綁定 UI 按鈕事件
  │  • 設定 Viewport resize handler
  │
  ▼
[模糊遮罩] 難度選擇畫面
  │  • 渲染循環停止（無遊戲物理模擬）
  │  • 背景保持 3D 場景靜態渲染（環境光 + 地板格線可見）
  │  • 玩家輸入 ID + 選擇 EASY/NORMAL/HARD
  │
  ▼
選擇難度 (selectDifficulty)
  │  • 設定 shapes[] 與 maxDropLevel
  │  • 記錄 gameStartTime
  │  • 隱藏難度選擇 Overlay
  │
  ▼
遊戲開始 (startGame)
  │  • 清理上局殘留（Rapier3D Bodies + Three.js Meshes + Particles）
  │  • 重設分數 = 0、canDrop = true、isGameOver = false
  │  • 建立 Rapier3D World（設定重力、碰撞回呼）
  │  • 建立容器牆壁 Static Bodies
  │  • 隨機生成 currentLevel / nextLevel
  │  • 更新 HUD（NEXT 3D 預覽 + Evolution Bar）
  │  • 隱藏模糊遮罩
  │  • 啟動渲染循環 → 進入遊戲主循環
  │
  ▼
◀─────────── 遊戲主循環 (gameLoop, requestAnimationFrame) ──────────
│              │
│              │  1. Fixed timestep accumulator（dt 上限 50ms）：
│              │     while (accumulator ≥ 1/60):
│              │       world.step(eventQueue) → processContactEvents()
│              │  2. syncAll() — 物理算完後同步一次 Body → Mesh（position + quaternion）
│              │  3. 檢查 Game Over 條件
│              │  4. 更新 3D 粒子系統 + 格線光流
│              │  5. CameraOrbit.update() → 攝影機震動偏移疊加其上
│              │  6. postProcessing.render() — 含 Bloom 的場景渲染
│              │  7. css2DRenderer.render() — UI 覆蓋層渲染
│              │  （NEXT 預覽為 on-demand，不在每幀渲染）
│              │
│   玩家點擊/觸控
│       │
│       ▼
│  handleDrop(screenX, screenY)
│    ├── 若 !canDrop || isGameOver || 拖曳攝影機中 → 忽略
│    ├── canDrop = false
│    ├── Raycaster 投射到 Z=0 垂直平面 → 取得 3D worldX
│    ├── Clamp X 到牆壁安全範圍內（半徑 + 0.08）
│    ├── 於 (clampedX, DROP_SPAWN_Y=14.5, 0) 建立 Rapier3D Dynamic Body + Three.js Mesh
│    ├── 播放投落音效
│    ├── currentLevel = nextLevel
│    ├── nextLevel = 隨機新等級
│    ├── 更新 NEXT 預覽（on-demand 重繪）
│    └── setTimeout(250ms) → canDrop = true
│       │
│       ▼
│  [Rapier3D World 自動模擬 60Hz]
│       │
│       ▼
│  碰撞事件 (contactPair / EventQueue)
│    │
│    ▼
│  MergeSystem.handleCollision
│    ├── 過濾：非遊戲形狀 → 跳過
│    ├── 過濾：不同等級 → 跳過
│    ├── 過濾：已在 mergeCooldown → 跳過
│    │
│    ├── 移除兩個舊 Body + Mesh（含 dispose Geometry/Material）
│    ├── 生成新等級 Body + Mesh（3D 中點位置）
│    ├── 新 Body 隨機向上噴出速度 + 隨機旋轉
│    │
│    ├── 計分：score += shapes[newLevel].score
│    ├── COMBO 計數 +1
│    ├── 產生浮動分數文字（CSS2DObject）
│    ├── 若 COMBO ≥ 2 → 產生 COMBO 提示
│    ├── 產生 3D 合成粒子（Ring + Shard + Dot）
│    ├── 播放合成音效
│    └── 觸發攝影機震動
│       │
└───────┘
  │
  ▼ (Game Over 觸發)
  │
遊戲結束 (triggerGameOver)
  │  • isPlaying = false、canDrop = false、隱藏瞄準導線
  │  • 播放 gameover 音效
  │  • 物理模擬繼續（結算畫面背景形狀持續沉降）
  │  • 更新本機最高分（localStorage）
  │  • 顯示 Game Over Overlay
  │  • 提交分數（本地排行榜 + 後端 API）
  │  （殘留 Body/Mesh 於下一局 startGame 時清理）
  │
  ▼
玩家點擊「再來一局」
  │  • 隱藏 Game Over Overlay
  │  • 顯示難度選擇畫面
  │
  ▼
（回到難度選擇畫面，循環）
```

---

## 6.2 Game Over 判定機制

### 三重條件

| # | 條件 | 說明 |
|---|------|------|
| 1 | `body.translation().y > GAME_OVER_LINE_Y (12)` | 形狀超出判定線（= 容器頂端） |
| 2 | Body userData 為遊戲形狀 | 非牆壁 |
| 3 | `body.linvel().length() < 0.3` | 形狀已趨於靜止（3D 速度向量長度） |

### 延遲機制

| 參數 | 值 | 說明 |
|------|-----|------|
| GAME_OVER_DELAY_MS | 1500ms | 持續越線 1.5 秒後觸發 |

### 狀態機

```
正常遊戲 ──(越線 + 靜止)──→ 倒計時中 ──(1500ms 未解除)──→ Game Over
           ↑                    │
           └──(形狀離開/合成)──←─┘（取消倒計時）
```

- **設計意圖**：給玩家 1.5 秒緩衝「救場」時間
- **取消條件**：所有形狀都在判定線以下 → clearTimeout

---

## 6.3 連擊（COMBO）系統

| 規則 | 說明 |
|------|------|
| 連擊窗口 | COMBO_WINDOW_MS = 1200ms |
| 計數觸發 | 每次合成 comboCount++ |
| 重置條件 | 1200ms 內無新合成 → comboCount = 0 |
| 顯示條件 | comboCount ≥ 2 |

### COMBO 對遊戲的影響

| 影響 | 公式 |
|------|------|
| COMBO 提示字型大小 | `28 + comboCount × 4` px |
| COMBO 提示動畫速度 | CSS animation-duration 隨 combo 加快 |
| 攝影機震動增量 | `+comboCount × 0.01`（世界單位） |

> **注意**：COMBO 不影響實際得分，僅影響視覺回饋強度。

---

## 6.4 投放機制

### 投放座標（3D 版本）

```typescript
// Raycaster 投射到 Z=0 垂直平面（與視線近乎垂直，游標對應線性）
const dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const worldPoint = new THREE.Vector3();
raycaster.ray.intersectPlane(dropPlane, worldPoint);

// X 軸 Clamp
const halfWidth = 5; // 容器半寬
const r = shape.collisionRadius;
const clampedX = clamp(worldPoint.x, -halfWidth + r + 0.08, halfWidth - r - 0.08);

// Z 軸固定（v1.0 僅控制 X 軸）
const dropZ = 0;
```

### 投放 Y 起始位置

- 所有形狀從 `DROP_SPAWN_Y = 14.5`（容器頂端 + 2.5）生成，自然落進容器
- 幽靈預覽形狀懸浮在 `DROP_Y = 12.5`

### 形狀輪替流程

```
投放 currentLevel 形狀
  ↓
currentLevel = nextLevel
  ↓
nextLevel = random(0 ~ maxDropLevel)
  ↓
更新 NEXT 3D 預覽顯示
```

---

[下一章：遊戲音樂音效設計 →](07_audio_design.md)
