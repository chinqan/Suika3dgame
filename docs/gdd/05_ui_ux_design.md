# 第 5 章：遊戲 UI/UX 設計

[← 返回目錄](00_index.md) | [← 上一章](04_art_style_and_narrative.md)

---

## 5.1 UI 層次架構

UI 由兩個獨立層級組成：

| 層級 | 技術 | 內容 |
|------|------|------|
| **HTML/CSS 層**（DOM） | HTML elements + CSS | HUD 面板、所有 Overlay 彈窗、設定選單 |
| **CSS2DRenderer 層** | Three.js CSS2DRenderer | 3D 場景內的浮動分數文字、COMBO 提示 |

> **3D 改動**：2D 版本使用 PixiJS Text/Sprite 繪製場景內 UI，3D 版本改用 Three.js 的 `CSS2DRenderer`，可將 HTML 元素定錨到 3D 世界座標上，同時保持 CSS 樣式的靈活性。

### 字型系統

| 字型 | 來源 | 用途 |
|------|------|------|
| **Orbitron** | Google Fonts | 標題、分數、按鈕文字、排行榜排名等（科技感等寬） |
| **Rajdhani** | Google Fonts | 內文、排行榜名字、描述文字（可讀性較佳） |

---

## 5.2 HUD 設計

HUD 位於 Three.js Canvas 上方（HTML DOM 層），以 `position: absolute` 覆蓋。

### 版面配置

```
┌──────────────────────────────────────────┐
│  SCORE       🏆  ⚙️          NEXT        │
│  ──────                      ──────      │
│  [數字]                      [3D預覽]     │
│  48px粗體                    WebGL Canvas │
└──────────────────────────────────────────┘
         padding: 18px 20px
```

### 各元素規格

| 元素 | 規格 |
|------|------|
| SCORE 標籤 | Orbitron 16px, Letter-spacing 3px, `rgba(255,255,255,0.4)` |
| 分數數值 | Orbitron **48px** 900 weight, `#00FFFF`, text-shadow glow |
| 🏆 排行榜按鈕 | 22px emoji, 金色邊框, hover glow 效果 |
| ⚙️ 設定按鈕 | 22px emoji, 白色邊框, hover glow 效果 |
| NEXT 標籤 | 同 SCORE 標籤 |
| NEXT 預覽 | 80×80 WebGL Canvas（獨立小型 Three.js Scene 渲染 3D 形狀預覽） |

> **NEXT 預覽 3D 化**：使用獨立的小型 Three.js Renderer 渲染下一個形狀的 3D 旋轉預覽，取代 2D 版本的靜態截圖。

### Evolution Bar（演化條）

- 位於主 Canvas 下方
- 顯示當前難度下所有 3D 形狀的小型預覽圖，從小到大一列排列
- 使用 CSS 渲染小型 Canvas 或預生成的 PNG 快照
- 背景：`rgba(255,255,255,0.03)`，上方 1px 分隔線

---

## 5.3 Overlay 視窗設計

所有 Overlay 使用 `position: absolute; inset: 0` 覆蓋整個 game-wrapper。

### z-index 層級

| z-index | Overlay |
|---------|---------|
| 100 | Game Over |
| 200 | 難度選擇 |
| 300 | 排行榜 / 設定 |
| 350 | HUD 按鈕（排行榜/設定） |

### Overlay 前景狀態保存機制

開啟排行榜或設定時，需要暫時隱藏其他前景 Overlay（難度選擇 / Game Over），關閉後恢復：

| 步驟 | 行為 |
|------|------|
| 開啟 | 記錄當前可見的前景 Overlay ID，然後隱藏它們 |
| 切換 | 排行榜↔設定互切時，不重複儲存（檢查 `savedStates.length > 0`） |
| 關閉 | 恢復所有先前保存的 Overlay 可見性 |

### 5.3.1 難度選擇彈窗

```
┌───────────────────────────────────┐
│       SELECT DIFFICULTY            │  Orbitron 28px 青色 glow
│                                   │
│   PLAYER ID: [_____________]       │  200px 寬文字框, 最多16字
│                                   │
│   ┌─────────────────────────┐     │
│   │         EASY             │     │  綠色 #39FF14 邊框
│   │        7 種形狀           │     │
│   └─────────────────────────┘     │
│   ┌─────────────────────────┐     │
│   │        NORMAL            │     │  青色 #00FFFF 邊框
│   │        8 種形狀           │     │
│   └─────────────────────────┘     │
│   ┌─────────────────────────┐     │
│   │         HARD             │     │  紅色 #FF3131 邊框
│   │        9 種形狀           │     │
│   └─────────────────────────┘     │
└───────────────────────────────────┘
```

- 背景：CSS `backdrop-filter: blur(6px)` + 黑色 alpha=0.65 遮罩
- 按鈕 hover：scale(1.05) + glow 增強
- Player ID 自動從 localStorage 讀取

> **3D 改動**：模糊遮罩從 PixiJS BlurFilter 改為 CSS `backdrop-filter`（效能更佳，且不依賴渲染引擎）。

### 5.3.2 Game Over 彈窗

```
┌───────────────────────────────────┐
│            GAME OVER               │  Orbitron 36px 紅色 glow
│       最終分數：[score]              │
│       最高紀錄：[highScore]           │
│          [ 再來一局 ]               │  青色邊框按鈕
└───────────────────────────────────┘
```

### 5.3.3 排行榜彈窗

```
┌───────────────────────────────────┐
│      🏆 金色漸層 Ribbon            │  LEADERBOARD 文字
├───────────────────────────────────┤
│  排名  ★  名字     分數  時間  日期 │  6-column grid
│  1st   ✦  player1  999   3:25  ... │  青色高亮背景
│  2nd   ★  player2  800   2:40  ... │  微亮背景
│  3rd   ★  player3  600   5:10  ... │
│  4th   ☆  guest    300   1:20  ... │
│  ...                               │  最多 50 筆，可捲動
├───────────────────────────────────┤
│          [ 確認 ]                  │  金色邊框按鈕
└───────────────────────────────────┘
```

- 排名顏色：1st 金色 / 2nd-3rd 銀色 / 4th-5th 銅色 / 6th+ 灰藍
- 第一名特殊：青色背景高亮 + 青色邊框 + glow shadow

### 5.3.4 設定彈窗

```
┌───────────────────────────────────┐
│          ⚙️ SETTINGS               │  紫色 #AAAAFF glow
│                                   │
│  🔊 合成音效                       │
│  選擇音效類型，並點擊按鈕試聽       │
│  ┌──────────────────────────┐     │
│  │ 📦 標準音效            ▼  │     │  下拉選單
│  └──────────────────────────┘     │
│                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐        │
│  │  ▲  │ │  ●  │ │  ■  │        │  3×3 試聽格
│  │Lv.0 │ │Lv.1 │ │Lv.2 │        │  (顯示 3D 形狀圖示)
│  └─────┘ └─────┘ └─────┘        │
│  ┌─────┐ ┌─────┐ ┌─────┐        │
│  │  ◆  │ │  ⬡  │ │  ●  │        │
│  └─────┘ └─────┘ └─────┘        │
│  ┌─────┐ ┌─────┐ ┌─────┐        │
│  │  ◇  │ │  ⬣  │ │  ⬤  │        │
│  └─────┘ └─────┘ └─────┘        │
│          [ 確認 ]                  │
└───────────────────────────────────┘
```

- 音效立即切換並儲存至 localStorage
- 試聽按鈕點擊播放該等級合成音效 + soundPulse 動畫（brightness 2.2x）

---

## 5.4 瞄準導線（Aim Guide）— 3D 版本

| 元素 | 規格 |
|------|------|
| 瞄準射線 | 垂直半透明柱體 `CylinderGeometry(0.02, 0.02, 15)`，alpha=0.10 |
| 幽靈形狀 | 當前形狀的 3D Mesh（透明度 0.35，無 Bloom），懸浮在容器頂端 |
| 幽靈位置 Y | 容器頂端 Y=14（略低於容器開口） |
| X/Z 座標 | 由 Raycaster 投射到投放平面計算，Clamp 至牆壁安全範圍 |

**隱藏條件**：投放冷卻中 (`!canDrop`) 或遊戲結束 (`isGameOver`)

> **3D 新增**：投放位置限制在容器中央的 XZ 平面（Z 固定為 0），玩家僅控制 X 軸方向（與 2D 版本操作體驗一致）。未來可擴展為 XZ 雙軸投放。

---

## 5.5 即時回饋系統

### 浮動分數文字（CSS2DObject）

| 屬性 | 規格 |
|------|------|
| 技術 | CSS2DObject（HTML div 定錨至 3D 座標） |
| 字型 | Orbitron 22px bold |
| 顏色 | 與合成目標形狀同色 |
| 動畫 | CSS `@keyframes`：scale 0.5→1.2 + translateY -50px + opacity 1→0 |
| 持續 | 0.8s ease-out |
| 消失 | 動畫結束後從 Scene 移除，回收到 Pool |

### COMBO 提示

| 屬性 | 規格 |
|------|------|
| 觸發條件 | 連擊數 ≥ 2（1200ms 窗口內） |
| 文字格式 | `COMBO x2`、`COMBO x3`... |
| 顏色 | 金色 `#FFD700` |
| 字型大小 | `28 + comboCount × 4` px |
| 動畫 | CSS `@keyframes`：上飄 + 放大 + 淡出 |

### 攝影機震動（Camera Shake）

| 屬性 | 規格 |
|------|------|
| 強度公式 | `0.08 + level × 0.03 + comboCount × 0.01`（3D 世界單位） |
| 衰減率 | ×0.85 / 幀 |
| 停止閾值 | < 0.005 → 歸零 |
| 影響 | `camera.position.x/y` 隨機偏移（在 lookAt 附近微搖） |

> **3D 改動**：從 `app.stage.x/y` 偏移改為 `camera.position` 微偏移，震動值從像素改為 3D 世界單位（數值縮小約 50 倍）。

---

## 5.6 視窗縮放（Viewport Resize）

- **方法**：Three.js Renderer `setSize()` + Camera `aspect` 更新
- **策略**：保持整個視窗填滿，camera.aspect 動態調整
- 觸發：`window.resize` 事件 + 初始化時呼叫
- CSS2DRenderer 同步更新 size

```typescript
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  css2DRenderer.setSize(w, h);
  composer.setSize(w, h); // 後處理管線
}
```

---

## 5.7 無障礙設計（Accessibility）

### 色彩對比度

| 前景 | 背景 | 用途 | 對比度 | WCAG AA |
|------|------|------|--------|---------|
| `#00FFFF` 青色 | `#0a0a0f` 深黑 | 分數、按鈕 | ≈ 12.7:1 | ✅ Pass |
| `#FF3131` 紅色 | `#0a0a0f` 深黑 | Game Over 標題 | ≈ 4.8:1 | ✅ Pass |
| `#FFD700` 金色 | `#0a0a0f` 深黑 | COMBO、排行榜 | ≈ 11.4:1 | ✅ Pass |
| `rgba(255,255,255,0.4)` | `#0a0a0f` 深黑 | 次要標籤 | ≈ 4.6:1 | ⚠️ 邊界 |

### 觸控目標大小

| 元素 | 目前大小 | 標準（44px） | 狀態 |
|------|---------|-----------|------|
| 難度按鈕 | 48px+ padding | ≥ 44px | ✅ |
| 排行榜按鈕 | 34px (22px + padding) | < 44px | ⚠️ 接近邊界 |
| 設定按鈕 | 34px (22px + padding) | < 44px | ⚠️ 接近邊界 |
| 音效試聽按鈕 | ~60px | ≥ 44px | ✅ |

### 其他無障礙考量

| 項目 | 現況 | 建議 |
|------|------|------|
| `prefers-reduced-motion` | 未實作 | 可關閉 3D 粒子/震動/旋轉動畫 |
| 鍵盤操作 | 未實作 | 可加方向鍵控制落點 + Space 投放 |
| 色弱可辨識性 | 9 種顏色差異大 | 大部分可辨識，黃(Lv.1)與螢光綠(Lv.3)可能需注意 |
| Screen Reader | 不適用 | 純視覺遊戲，非必要 |

---

## 5.8 元件狀態矩陣

### 按鈕互動狀態

| 元件 | Default | Hover | Active | Focus | Disabled |
|------|---------|-------|--------|-------|----------|
| 難度按鈕 (Easy) | 綠色邊框 | scale(1.05) + glow 增強 + bg 18% | - | - | - |
| 難度按鈕 (Normal) | 青色邊框 | scale(1.05) + glow 增強 + bg 18% | - | - | - |
| 難度按鈕 (Hard) | 紅色邊框 | scale(1.05) + glow 增強 + bg 18% | - | - | - |
| 再來一局 | 青色邊框 | bg 22% + glow + scale(1.04) | - | - | - |
| 排行榜按鈕 | 金色邊框 | bg 10% + glow + scale(1.1) | - | - | - |
| 設定按鈕 | 白色邊框 | bg 8% + glow + scale(1.1) | - | - | - |
| 排行榜關閉 | 金色邊框 | bg 22% + glow + scale(1.04) | - | - | - |
| 設定關閉 | 紫色邊框 | bg 22% + glow + scale(1.04) | - | - | - |
| 音效試聽 | 形狀色邊框 | scale(1.06) | scale(0.95) + soundPulse | - | - |

### 輸入框狀態

| 元件 | Default | Focus | Error |
|------|---------|-------|-------|
| Player ID 輸入框 | 青色邊框 40% | 青色 100% + glow shadow | - |

---

## 5.9 UI 狀態設計

### Loading 狀態

| 場景 | 顯示 |
|------|------|
| WASM 初始化 | 全屏 Loading 畫面（Rapier3D WASM 載入中） |
| 排行榜載入中 | Loading 文字（Orbitron 14px, `rgba(255,255,255,0.3)`），居中 padding 24px |

### Error 狀態

| 場景 | 顯示 |
|------|------|
| 排行榜載入失敗 | 紅色文字「無法連線伺服器」 |
| 分數提交失敗 | 靜默忽略（console.warn），不影響 UI |
| WebGL 不支援 | 顯示提示畫面「此瀏覽器不支援 WebGL2」 |

### Empty 狀態

| 場景 | 顯示 |
|------|------|
| 排行榜無資料 | 顯示空白列表（由後端回傳空陣列） |
| 首次遊戲無最高分 | 分數顯示 0 |

---

[下一章：遊戲流程設計 →](06_game_flow.md)
