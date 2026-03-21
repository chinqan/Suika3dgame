# 第 8 章：遊戲其他規格與設定

[← 返回目錄](00_index.md) | [← 上一章](07_audio_design.md)

---

## 8.1 視覺特效規格（3D 版本）

### 8.1.1 合成粒子效果（Merge Particles）

每次成功合成觸發 3 種 3D 粒子同時噴出，以合成 3D 中點為原點：

| 粒子類型 | 數量公式 | 速度 | 衰減率 | 行為 |
|---------|---------|------|--------|------|
| **Ring** | 固定 1 | 擴張動畫 | 0.04/幀 | 3D 環形從中心擴散至 `radius × 3.5` |
| **Shard** | `8 + level × 2` | 0.06~0.18 units/幀 | 0.012~0.027/幀 | 3D 四方飛散、旋轉、縮小消失 |
| **Dot** | `16 + level × 3` | 0.04~0.18 units/幀 | 0.015~0.035/幀 | 3D 四方飛散、受微重力影響 |

#### Ring（3D 擴散環）

| 屬性 | 值 |
|------|-----|
| Geometry | `RingGeometry(innerR, outerR, 32)` — 動態更新 |
| Material | `MeshBasicMaterial`, color=形狀色, transparent, side=DoubleSide |
| 起始半徑 | 0.1 units |
| 最大半徑 | `shape.collisionRadius × 3.5` |
| 擴張速率 | `(maxRadius - radius) × 0.15` / 幀 |
| 透明度 | `life × 0.7` |
| 朝向 | 始終面向攝影機（billboarding）或水平放置 |

> **實作方式**：可用 Shader 動畫的圓環 Plane，或每幀更新 scale 的預建 RingGeometry。

#### Shard（3D 碎片）

| 屬性 | 值 |
|------|-----|
| Geometry | 對應等級的小型 3D 多面體（縮小版） |
| 技術 | `InstancedMesh`（單一 DrawCall 渲染所有碎片） |
| 縮放 | 0.15 ~ 0.35（隨機，逐幀 × life 衰減） |
| 旋轉 | ±0.3 rad/幀（隨機 3D 軸） |
| 重力 | vy -= 0.002 / 幀 |
| Material | 與對應形狀同色，emissive 發光 |

#### Dot（3D 光點）

| 屬性 | 值 |
|------|-----|
| 技術 | `THREE.Points` + `PointsMaterial`（GPU 點粒子） |
| 大小 | 0.04~0.10 units |
| 重力 | vy -= 0.002 / 幀 |
| BlendMode | `THREE.AdditiveBlending`（加法混合發光） |
| 顏色 | 與合成目標形狀同色 |
| sizeAttenuation | true（隨距離縮小） |

#### 粒子 Material 規格

| Material 類型 | 建立方式 | 快取 Key |
|--------------|---------|---------|
| **Shard Material** | `MeshBasicMaterial({ color, emissive, transparent })` | `colorHex` string |
| **Dot Material** | `PointsMaterial({ color, size, blending: AdditiveBlending })` | `colorHex` string |
| **Ring Material** | `MeshBasicMaterial({ color, transparent, side: DoubleSide })` | `colorHex` string |

### 8.1.2 格線光流效果（Grid Flow）— 3D 版本

#### 基本參數

| 參數 | 值 | 說明 |
|------|-----|------|
| 最大同時數量 | 20（GRID_FLOW_CONFIG.maxCount） | 限制 GPU 負擔 |
| 生成機率 | 0.06/幀（6%） | 每幀 6% 機率產生新光點 |
| 方向分布 | 60% 水平（X/Z） / 40% 垂直（Y） | 優先沿水平格線流動 |
| 大小 | 0.15~0.35 units（隨機） | Sprite scale |
| 亮度 | 0.7~1.0（隨機） | |
| 移動速度 | 0.001~0.003 t/幀 | t 從 0 到 1 代表路徑進度 |
| 技術 | `THREE.Sprite` + `SpriteMaterial`（始終面向攝影機） | |
| BlendMode | `AdditiveBlending` | 發光效果 |

#### 3D 光流 Sprite 繪製

光流 Sprite 使用程式生成的 Canvas Texture（圓形漸層光點）：

| 繪製順序 | 半徑比例 | 顏色 | alpha | 說明 |
|---------|--------|------|-------|------|
| 1（最先） | 100% | `#00FFFF` | 0.08 | 最外層極淡光暈 |
| 2 | 70% | `#00FFFF` | 0.18 | 中層擴散 |
| 3 | 45% | `#88FFFF` | 0.45 | 內層亮光（偏白） |
| 4（最後） | 25% | `#FFFFFF` | 1.0 | 核心白色亮點 |

- Canvas 尺寸：64×64px → 生成 `CanvasTexture`
- 核心是**白色**（不是青色）——模擬高溫核心的能量白光
- 生成一次後快取至全域 Texture 變數

#### Game Over 時的行為

| 狀態 | 行為 | 氛圍意圖 |
|------|------|---------|
| 正常遊戲中 | 持續生成新光流 | 能量持續注入 |
| Game Over 後 | **停止生成新光流** | 能量供應中斷 |
| Game Over 後 | 已存在的光流繼續移動至消失 | 殘存能量逐漸耗散 |
| 重新開局 | clearAll() 清除所有光流 | 系統重啟 |

### 8.1.3 VFX 效能預算（3D 版本）

| 指標 | 桌機 | 行動裝置 | 說明 |
|------|------|---------|------|
| 最大同時 3D 粒子數 | 500 | 200 | Ring + Shard + Dot 總計 |
| 最大同時格線光流 | 20 | 20 | GRID_FLOW_CONFIG.maxCount |
| Draw Calls 預算 | < 100 | < 50 | InstancedMesh 可大幅降低 |
| 三角形數量 | < 50K | < 20K | 含所有形狀 + 粒子 + 環境 |
| 粒子 GPU 預算 | < 2ms/幀 | < 1ms/幀 | 含繪製 + 混合 |
| Additive Blend 佔比 | 不限 | < 50% | 光流 + Dot 粒子為 Additive |
| Material 記憶體 | 不限 | < 16MB | 形狀 Material + Texture 總和 |

**效能保護機制**：
- 格線光流最大數量硬限制 20 個
- 粒子有 `life` 壽命衰減，自動回收
- Shard 使用 `InstancedMesh`（單一 DrawCall）
- Dot 使用 `THREE.Points`（GPU 點粒子，極低開銷）
- Object Pool 回收機制防止 GC 壓力
- Geometry/Material dispose 防止記憶體洩漏

---

## 8.2 後端 API 規格

### 服務設定

| 項目 | 值 |
|------|-----|
| 框架 | Express.js |
| 端口 | 7860 |
| 監聽位址 | `0.0.0.0`（支援區網訪問） |
| 資料庫 | SQLite（better-sqlite3），WAL 模式 |
| 靜態檔案 | `dist/` 目錄（需先 `npm run build`） |

### API 端點

#### `POST /api/scores` — 提交分數

**Request Body：**
```json
{
  "player_id": "player1",
  "score": 1250,
  "difficulty": "hard",
  "play_time": 325
}
```

**Response（成功）：**
```json
{ "success": true }
```

**Response（失敗 400）：**
```json
{ "error": "Missing required fields" }
```

**伺服器行為**：
- 自動生成 `created_at` 為 `M/D HH:MM` 格式
- 使用 Prepared Statement 防止 SQL Injection

#### `GET /api/scores` — 取得排行榜

**Response：** Top 50 筆，按分數降序
```json
[
  {
    "player_id": "player1",
    "score": 1250,
    "difficulty": "hard",
    "play_time": 325,
    "created_at": "3/20 11:30"
  }
]
```

---

## 8.3 行動裝置相容性

### Viewport 設定

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### 觸控處理

| 處理 | 說明 |
|------|------|
| `touch-action: none` | CSS 禁用預設觸控手勢 |
| `passive: false` | touchmove/touchstart 可 preventDefault() |
| `-webkit-user-select: none` | 禁用文字選取 |
| DPR 限制 | `renderer.setPixelRatio(min(devicePixelRatio, 2))` 避免過高渲染負擔 |

### WebGL2 相容性

- Three.js 使用 WebGLRenderer（WebGL2 context）
- 絕大部分現代瀏覽器均支援 WebGL2（包括 iOS 15+ Safari）
- 不支援 WebGL2 時顯示降級提示

---

## 8.4 系統邊界條件處理

| 條件 | 處理方式 |
|------|---------|
| 投放超出左牆 | Clamp 至 `-halfWidth + radius + 0.08` |
| 投放超出右牆 | Clamp 至 `+halfWidth - radius - 0.08` |
| 最高等級形狀碰撞 | 得 80 分，不生成新形狀 |
| 投放冷卻中點擊 | 靜默忽略（`canDrop = false`） |
| 遊戲結束中點擊 | 靜默忽略（`isGameOver = true`） |
| 後端提交失敗 | `console.warn`，遊戲正常繼續 |
| 排行榜載入失敗 | 顯示紅色「無法連線伺服器」文字 |
| Player ID 為空 | 預設為 `'guest'` |
| Player ID 過長 | 截斷至 16 字元 |
| 難度切換 | 清除 Material/Geometry 快取並重建 |
| 同一對形狀重複碰撞 | `mergeCooldown Set` 防止同幀重複合成 |
| WASM 載入失敗 | 顯示錯誤提示「物理引擎載入失敗」 |
| Geometry/Material 洩漏 | 移除 Mesh 時必須呼叫 `.dispose()` |

---

## 8.5 關鍵常數速查

```typescript
// 3D 容器規格（世界單位）
CONTAINER_WIDTH      = 10       // X 軸寬度
CONTAINER_DEPTH      = 10       // Z 軸深度
CONTAINER_HEIGHT     = 15       // Y 軸高度
HALF_WIDTH           = 5        // 容器半寬
HALF_DEPTH           = 5        // 容器半深

// 遊戲區域
FLOOR_Y              = 0        // 地板 Y 位置
GAME_OVER_LINE_Y     = 13       // Game Over 判定線 Y
DROP_Y               = 15       // 投放起始高度

// 時間常數
DROP_COOLDOWN_MS     = 450      // 投放冷卻
COMBO_WINDOW_MS      = 1200     // 連擊窗口
GAME_OVER_DELAY_MS   = 1500     // Game Over 確認延遲

// 物理引擎
GRAVITY_Y            = -20.0    // 重力加速度
PHYSICS_TIMESTEP     = 1/60     // 物理步進

// 格線光流
GRID_FLOW_CONFIG.maxCount    = 20
GRID_FLOW_CONFIG.spawnChance = 0.06

// 後處理
BLOOM_STRENGTH       = 0.8
BLOOM_RADIUS         = 0.4
BLOOM_THRESHOLD      = 0.6
```

---

[下一章：遊戲測試 →](09_testing.md)
