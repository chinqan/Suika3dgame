---
name: technical-artist
description: 物理落下益智遊戲的技術美術師。負責 PixiJS 渲染管線、Texture 快取策略、粒子系統效能、Object Pool 管理、物理引擎整合、跨平台效能優化。當需要優化渲染效能、設計粒子效果規格、管理 Texture 快取、或解決行動裝置相容性問題時使用此 Skill。
---

# 物理落下益智遊戲 — 技術美術師

**職能**：橋接美術需求與引擎效能——管理 PixiJS 渲染管線、Texture 快取、粒子預算、Object Pool。

---

## When to Use

- 新增/優化粒子特效（合成爆炸、格線光流）
- 管理 Texture 記憶體與快取策略
- 設計 Object Pool 規格
- 優化行動裝置渲染效能
- 整合或調整 Matter.js 物理引擎參數
- 排查 GPU/CPU 效能瓶頸

---

## 🚨 Critical Rules（不可違反）

### Texture 繪製規格必須文件化

- **程式生成的 Texture 必須定義每一層的半徑、alpha、顏色** — 確保任何人都能從規格還原完全相同的 Texture
- **Texture 基底尺寸必須明確記錄** — 因為 Sprite scale 依賴此尺寸（例如 `scale = size / baseSize`）
- **Texture 快取 key 格式必須定義** — 不能只說「有快取」，要說清 key 的命名規則

### 數據結構必須定義

- **粒子、光流等動態物件的數據結構（interface）必須完整定義** — 不能只寫「有速度和位置」
- **每個欄位的取值範圍和生成規則必須記錄** — 例如 `speed: 0.001~0.003`、`lineIdx: 1~hLines`

### 狀態轉變時的行為必須定義

- **Game Over、暫停、重開等狀態下，每個視覺系統的行為必須明確** — 停止生成？繼續更新？立即清除？
- **clearAll() 的行為必須分類記錄** — 哪些立即銷毀、哪些釋放回 Pool

---

## 技術架構概覽

```
PixiJS 8 (WebGPU preferred → WebGL fallback)
  ├── Application (546×779 設計解析度)
  ├── Container 層級 (7 層 z-order)
  ├── Graphics (形狀繪製 + Texture 快取)
  └── Sprite (粒子效果)

Matter.js (物理引擎)
  ├── Engine (60Hz fixedUpdate)
  ├── Bodies (圓形碰撞體)
  ├── Walls (靜態邊界)
  └── Events.on('collisionStart') → 合成判定
```

---

## Texture 快取策略

### 規範

```typescript
const textureKey = `shape_${level}_${difficulty}`;

// 快取流程
if (textureCache.has(textureKey)) {
  return textureCache.get(textureKey);
}
// 繪製 Graphics → generateTexture → 快取
const texture = app.renderer.generateTexture(graphics);
textureCache.set(textureKey, texture);
```

### 規則

- **每個等級×難度** 生成一次 Texture，後續用 Sprite 複製
- Graphics 繪製僅在首次需要時執行
- Texture 生命週期 = 整個 session
- 難度切換時清除舊快取、重新生成

---

## 粒子效果效能預算

### 合成粒子（Merge Particles）

每次合成噴出 3 種粒子：

| 類型 | 數量/次 | 生命週期 | Blend Mode |
|------|---------|---------|-----------|
| Ring | 1 | ~0.3s | Normal |
| Shard（碎片） | 12-18 | ~0.5s | Additive |
| Dot（光點） | 8-12 | ~0.4s | Additive |

### 平台預算

| 指標 | 桌機 | 行動裝置 |
|------|------|---------|
| 最大同時粒子數 | 500 | 200 |
| 最大格線光流 | 20 | 20 |
| Overdraw 層數 | 不限 | ≤ 3 |
| 粒子 GPU 預算 | < 2ms/幀 | < 1ms/幀 |

### 效能保護機制

- Object Pool 回收（不 new/destroy）
- `life` 屬性遞減 → 自動回收
- 硬上限：`maxCount` 限制同時存在數量
- 離開視口的粒子立即回收

---

## Object Pool 設計

### Pool 規範模板

```markdown
## Pool: [名稱]

**物件類型**：Sprite / Graphics / ...
**預熱數量**：N 個
**最大數量**：M 個
**acquire()** 行為：visible=true, alpha=1, position 重置
**release()** 行為：visible=false, 移出視口
**永不在遊戲中 destroy()**
```

### 本專案的 Pool

| Pool | 對象 | 預熱 | 上限 |
|------|------|------|------|
| shapePool | Shape Graphics | 20 | 50 |
| particlePool | Shard/Dot Sprite | 50 | 200 |
| floatingTextPool | PixiJS Text | 10 | 20 |
| gridFlowPool | Flow Sprite | 20 | 20 |

---

## 物理引擎整合

### Matter.js 關鍵參數

#### 引擎全域參數（`PHYSICS_CONFIG`）

| 參數 | 值 | 影響 |
|------|-----|------|
| gravity.y | **2.2** | 較強垂直重力——快速沈降、節奏感 |
| positionIterations | 12 | 位置修正精確度（高） |
| velocityIterations | 10 | 速度修正精確度 |
| constraintIterations | 4 | 約束修正次數 |
| runnerDelta | 1000/120 | 120Hz 物理更新 |

#### 形狀 Body 參數（`SHAPE_BODY_CONFIG`）

| 參數 | 值 | 影響 |
|------|-----|------|
| restitution | **0.15** | 低彈性——穩定堆疊 |
| friction | **0.6** | 高摩擦——不容易滑動 |
| frictionStatic | **0.8** | 靜摩擦——堆疊穩定 |
| baseDensity | **0.0015** | 基礎密度（小形狀輕） |
| densityPerLevel | **0.0004** | 每升一級密度增加（大形狀沉重） |
| slop | **0.005** | 碰撞容差——避免靜止態抖動 |

#### 牆壁 Body 參數（`WALL_BODY_CONFIG`）

| 參數 | 值 |
|------|-----|
| isStatic | true |
| friction | 1.0 |
| restitution | 0.1 |
| frictionStatic | 1.0 |

> ⚠️ **規範**：所有數值必須與 `src/data/config.ts` 中的常數完全一致。

### 碰撞事件處理

```
Events.on(engine, 'collisionStart', callback)
  → 檢查兩個 body 的 level 是否相同
  → 相同且都非 wall → 觸發合成
  → 合成時立即移除兩個 body（deferred destroy pattern）
```

---

## 行動裝置相容性

| 問題 | 解法 |
|------|------|
| WebGPU 不支援 | 自動 fallback 到 WebGL |
| Canvas 過大 | `devicePixelRatio` 限制最大 2x |
| 觸控延遲 | `touchstart` 替代 `click` |
| iOS Safari 黑屏 | Canvas resolution 限制 4096² |
| 記憶體壓力 | Texture 快取控制 + Pool 上限 |

---

## 工作流程

1. **效能預算** — 定義各平台的粒子/Texture/GPU 上限
2. **Texture 快取** — 設計快取 key 與生命週期
3. **Object Pool** — 規劃各類 Pool 的預熱與上限
4. **粒子規格** — 每種特效的數量/生命/Blend Mode
5. **物理參數** — gravity/restitution/friction 調校
6. **跨平台測試** — 最低硬體基準測試
