---
name: ui-ux-designer
description: 物理落下益智遊戲的 UI/UX 設計師。負責 HUD 版面、Overlay 彈窗、Design Token 系統、無障礙設計、元件狀態矩陣、響應式縮放。當需要設計/修改介面元素、建立設計系統、處理無障礙合規、或規劃 Loading/Error/Empty 狀態時使用此 Skill。
---

# 物理落下益智遊戲 — UI/UX 設計師

**職能**：設計 HUD、Overlay 彈窗系統、Design Token、無障礙規範、元件狀態矩陣。

---

## When to Use

- 設計/修改 HUD（分數、NEXT 預覽、功能按鈕）
- 新增/調整 Overlay 彈窗（難度選擇、Game Over、排行榜、設定）
- 建立或更新 Design Token 系統（顏色、字型、間距、動畫）
- 無障礙設計審查（WCAG 對比度、觸控目標、reduced-motion）
- 定義元件的完整互動狀態（Default/Hover/Active/Focus/Disabled）
- 設計 Loading / Error / Empty 狀態

---

## 🚨 Critical Rules（不可違反）

- **UI 元素的渲染層級必須明確記錄** — HTML DOM / PixiJS Canvas / 混合（如 NEXT 預覽用 PixiJS 轉 HTML Canvas）
- **Overlay 互動狀態必須完整定義** — 開啟時隱藏誰、關閉時恢復誰、互切時的行為
- **縮放策略必須精確記錄** — 不能只寫「等比縮放」，要寫 scale 公式

---

此類遊戲使用**雙層 UI**：

| 層級 | 技術 | 內容 | 優勢 |
|------|------|------|------|
| **HTML/CSS 層** | DOM | HUD、Overlay 彈窗、設定 | 易佈局、無障礙支援好 |
| **Canvas 層** | PixiJS | 浮動分數、COMBO、瞄準線 | 可隨畫面震動、可用 blend mode |

**規則**：
- HUD 靠 HTML 做（好改、好 debug）
- 遊戲內即時回饋靠 Canvas 做（可跟著物理動）
- z-index 規劃：HUD 按鈕 > 設定/排行榜 > 難度選擇 > Game Over > 遊戲畫面

---

## Design Token 系統

### 顏色 Token

```css
:root {
  /* 背景 */
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #0d0d1a;
  --color-bg-surface: #0f0f23;

  /* 語意色 */
  --color-accent: #00FFFF;       /* 主強調（牆壁、分數、按鈕） */
  --color-danger: #FF3131;       /* 危險（Game Over、Hard） */
  --color-success: #39FF14;      /* 正向（Easy） */
  --color-gold: #FFD700;         /* 獎勵（COMBO、排行榜） */
  --color-settings: #AAAAFF;     /* 設定介面 */

  /* 文字 */
  --color-text-primary: #FFFFFF;
  --color-text-muted: rgba(255,255,255,0.4);
}
```

### 字型 Token

```css
:root {
  --font-display: 'Orbitron', sans-serif;   /* 科技感標題 */
  --font-body: 'Rajdhani', sans-serif;      /* 可讀性內文 */

  --font-size-score: 48px;
  --font-size-title: 36px;
  --font-size-subtitle: 28px;
  --font-size-button: 22px;
  --font-size-label: 16px;
  --font-size-small: 13px;
}
```

### 動畫 Token

```css
:root {
  --transition-fast: 0.25s ease;    /* 按鈕 hover */
  --transition-normal: 0.3s ease;   /* Overlay 出現 */
  --transition-slow: 0.5s ease;     /* 場景轉換 */
}
```

---

## Overlay 設計規範

### 通用規則

- **遮罩**：PixiJS BlurFilter（strength=6）+ 半透明黑色覆蓋（alpha=0.65）
- **佈局**：`position: absolute; inset: 0;` 佔滿 game-wrapper
- **動畫**：使用 `--transition-normal` 淡入

### 必要的 Overlay 清單

| Overlay | z-index | 觸發時機 |
|---------|---------|---------|
| 難度選擇 | 200 | 遊戲啟動 / 重新挑戰 |
| Game Over | 100 | 形狀超過 Game Over 線 |
| 排行榜 | 300 | 點擊 🏆 按鈕 |
| 設定 | 300 | 點擊 ⚙️ 按鈕 |

---

## 無障礙設計（Accessibility）規範

### 色彩對比度

- **WCAG AA 標準**：普通文字 ≥ 4.5:1，大文字 ≥ 3:1
- 霓虹色在深黑背景上通常達標，但需逐一驗證
- **特別注意**：次要標籤文字（alpha=0.4 白色）可能在邊界

### 觸控目標

- **最小 44×44px**（Apple HIG / WCAG 2.5.5）
- HUD 按鈕（排行榜、設定）若太小，加大 `padding` 至 44px

### 其他

| 項目 | 建議 |
|------|------|
| `prefers-reduced-motion` | 尊重系統設定，可關閉粒子/震動 |
| 鍵盤操作 | 方向鍵控制落點 + Space 投放 |
| 色弱模式 | 形狀以「幾何形態」區分，不完全依賴顏色 |

---

## 元件狀態矩陣模板

```markdown
| 元件 | Default | Hover | Active | Focus | Disabled |
|------|---------|-------|--------|-------|----------|
| 按鈕 | 邊框色  | scale + glow + bg% | scale(0.95) | outline | opacity 0.5 |
| 輸入框 | 邊框 40% | - | - | 邊框 100% + glow | - |
| 選單項 | 無背景 | bg 10% | - | - | - |
```

---

## UI 狀態設計

### 必要的 3 種狀態

| 狀態 | 何時出現 | 顯示什麼 |
|------|---------|---------|
| **Loading** | 排行榜資料讀取中 | 載入指示文字/動畫 |
| **Error** | 網路請求失敗 | 錯誤訊息 + 重試選項 |
| **Empty** | 排行榜無資料 | 「尚無記錄」提示 |

---

## 響應式縮放

- **方法**：CSS `transform: scale()` 等比縮放整個 game-wrapper
- **設計尺寸**：固定 546×779，不做流式佈局
- **觸發**：`window.resize` + 初始化

---

## 工作流程

1. **Design Token** — 先定義顏色/字型/動畫變數
2. **HUD 佈局** — 固定元素的位置與規格
3. **Overlay 設計** — 逐一設計每個彈窗的版面
4. **元件狀態** — 定義所有互動狀態
5. **無障礙審查** — 對比度、觸控、動態偏好
6. **三態設計** — Loading / Error / Empty
