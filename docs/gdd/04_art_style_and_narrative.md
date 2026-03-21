# 第 4 章：遊戲風格與故事設計

[← 返回目錄](00_index.md) | [← 上一章](03_technical_foundation.md)

---

## 4.1 美術風格定義

**核心風格**：Cyberpunk / Neon 3D Polyhedra Arcade  
**視覺語言**：霓虹燈光 × 3D 立體多面體 × 深太空背景

### 設計關鍵詞

- 深色背景（near-black `#0a0a0f`）
- 高飽和度霓虹配色（青色、洋紅、螢光綠、橙色）
- **3D 半透明玻璃質感多面體**（MeshPhysicalMaterial + transmission）
- 發光效果（Emissive Glow）與後處理泛光（UnrealBloomPass）
- 3D 立體地板格線（GridHelper + 自訂 Shader）
- 格線光流（Grid Flow）3D 粒子——能量在格線上流動
- **稜線光暈**（EdgesGeometry + 霓虹色 LineBasicMaterial）

### 風格參考

- **Tron**：3D 霓虹格線、發光邊緣
- **Geometry Wars**：霓虹幾何體在深色空間中的視覺風格
- **蒸汽波（Vaporwave）**：高飽和度漸層色盤
- **Arcade 復古**：Orbitron 等寬科技字型、大寫標題
- **Polyhedra Art**：數學之美——正多面體的對稱與規律

---

## 4.2 配色系統

### 環境配色

| 元素 | 顏色 | HEX | 用途 |
|------|------|-----|------|
| Scene 背景 | 深藍黑 | `#0a0a0f` | `scene.background = new THREE.Color(0x0a0a0f)` |
| 環境霧氣 | 深藍黑 | `#0a0a0f` | `scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02)` |
| 容器邊框 | 青色 | `#00FFFF` (emissive) | 牆壁霓虹發光線條 |
| 底部光 | 青色 | `#00FFFF` (PointLight) | 底部格線照射 |
| Game Over 平面 | 紅色 | `#FF3131` (alpha=0.35) | 半透明判定面 |
| 地板格線 | 青色 | `#00FFFF` | GridHelper 線條 |

### 形狀配色

從小到大，顏色由冷色調漸進至暖中色再回歸白色：

| 等級 | 3D 形狀 | 顏色 | HEX | 色溫趨勢 |
|------|---------|------|-----|---------|
| Lv.0 | Tetrahedron | 青色 | `#00FFFF` | 冷 ❄️ |
| Lv.1 | Small Sphere | 黃色 | `#FFFF00` | 偏暖 |
| Lv.2 | Cube | 珊瑚紅 | `#FF6B6B` | 暖 🔥 |
| Lv.3 | Dodecahedron | 螢光綠 | `#39FF14` | 中性 |
| Lv.4 | Icosahedron | 橙色 | `#FF8C00` | 暖 🔥 |
| Lv.5 | Sphere | 洋紅 | `#FF00FF` | 暖 |
| Lv.6 | Octahedron | 紫色 | `#BF00FF` | 冷暖交界 |
| Lv.7 | Truncated Icosahedron | 青綠 | `#00FF88` | 冷 |
| Lv.8 | Large Sphere | 白色 | `#FFFFFF` | 終極 ✨ |

---

## 4.3 形狀視覺設計（3D Material 系統）

每個 3D 形狀由 `createNeonMesh()` 函數動態生成，包含 **3 層視覺結構**：

### 三層 3D 視覺架構

```
Layer 3 (外): Bloom Glow     ── UnrealBloomPass 全場景泛光（emissive 材質自動發光）
Layer 2 (中): Edge Wireframe  ── EdgesGeometry + LineSegments（霓虹色稜線）
Layer 1 (內): Main Mesh       ── MeshPhysicalMaterial（半透明玻璃體 + emissive 發光）
```

### Layer 1：Main Mesh（主形狀）

```typescript
const material = new THREE.MeshPhysicalMaterial({
  color: shapeColor,           // 形狀基礎色
  emissive: shapeColor,        // 自發光色（被 Bloom 放大）
  emissiveIntensity: 0.3,      // 自發光強度
  transparent: true,
  opacity: 0.25,               // 半透明（看得到內部結構）
  transmission: 0.6,           // 光線穿透（玻璃質感）
  roughness: 0.1,              // 低粗糙度（光滑表面）
  metalness: 0.0,              // 非金屬
  clearcoat: 1.0,              // 清漆層（表面反光）
  clearcoatRoughness: 0.1,     // 清漆粗糙度
  side: THREE.DoubleSide,      // 雙面渲染
});
```

**視覺效果**：半透明玻璃質感的 3D 多面體，內部可見結構，表面帶有清漆反光，整體散發霓虹色光暈。

### Layer 2：Edge Wireframe（稜線光暈）

```typescript
const edges = new THREE.EdgesGeometry(geometry, 15); // 15° 角度門檻
const lineMaterial = new THREE.LineBasicMaterial({
  color: shapeColor,
  transparent: true,
  opacity: 0.9,                // 接近全亮
  linewidth: 1,                // 注意：WebGL 限制 linewidth 僅部分生效
});
const wireframe = new THREE.LineSegments(edges, lineMaterial);
mesh.add(wireframe); // 作為 Mesh 子物件
```

**視覺效果**：3D 多面體的每條稜線都發出霓虹色光，配合 Bloom 效果產生明亮的邊框光暈，類似 Tron 風格。

### Layer 3：Bloom Glow（後處理泛光）

- 由 `UnrealBloomPass` 全場景統一處理
- `emissive` 材質中超過 `threshold=0.6` 亮度的部分會被 Bloom 放大
- **不需額外的 Glow 繪製**——3D 版本用後處理替代 2D 版本的多圈外環

### 多面體 Geometry 細節

| 等級 | Geometry | 參數 | 視覺特點 |
|------|----------|------|---------|
| Lv.0 | TetrahedronGeometry(r) | detail=0 | 4 面，尖銳稜角，最簡約 |
| Lv.1 | SphereGeometry(r, 16, 12) | 16 段 ×12 環 | 光滑球體，柔和 |
| Lv.2 | BoxGeometry(s, s, s) | s=r×1.4 | 6 面立方，工業感 |
| Lv.3 | DodecahedronGeometry(r) | detail=0 | 12 面，五邊形面，神秘感 |
| Lv.4 | IcosahedronGeometry(r) | detail=0 | 20 面，三角形面，精密 |
| Lv.5 | SphereGeometry(r, 24, 16) | 24 段 ×16 環 | 更細膩球體 |
| Lv.6 | OctahedronGeometry(r) | detail=0 | 8 面，菱形結構，晶體感 |
| Lv.7 | 自訂 BufferGeometry | 32 面 | 截角二十面體，足球形 |
| Lv.8 | SphereGeometry(r, 32, 24) | 32 段 ×24 環 | 完美球體，終極形態 |

### 形狀旋轉動畫

3D 版本中，每個形狀 Mesh 帶有緩慢的**自轉動畫**，增加視覺豐富度：

| 屬性 | 值 | 說明 |
|------|-----|------|
| 自轉速度（靜止時） | 0.002 ~ 0.008 rad/幀 | 等級越低旋轉越快 |
| 自轉軸 | 隨機軸 | 每個形狀生成時隨機分配 |
| 物理旋轉 | Rapier3D quaternion | 碰撞中由物理接管 |

> **設計意圖**：靜止的形狀帶有微妙自轉，暗示它們是「活的」能量晶體。碰撞時由物理引擎接管旋轉，產生自然的翻滾效果。

---

## 4.4 環境場景設計

### 3D 地板

| 參數 | 數值 | 說明 |
|------|------|------|
| 類型 | PlaneGeometry(30, 30) | 大型水平平面 |
| 位置 | Y=-0.01 | 略低於物理地板，避免 Z-fighting |
| Material | MeshBasicMaterial, color=#0a0a0f | 幾乎純黑 |

### 3D 地板格線

```typescript
const gridHelper = new THREE.GridHelper(
  30,     // size：格線總大小
  30,     // divisions：分割數
  0x00FFFF, // centerLineColor：中心線顏色
  0x00FFFF  // gridColor：格線顏色
);
gridHelper.material.opacity = 0.15;
gridHelper.material.transparent = true;
gridHelper.position.y = 0.01;
```

| 屬性 | 值 | 說明 |
|------|-----|------|
| 格線顏色 | `#00FFFF` | 青色霓虹 |
| 透明度 | 0.15 | 淡雅可見 |
| 範圍 | 30×30 units | 延伸超出容器範圍 |

> **氛圍意圖**：格線延伸至容器之外，暗示這是無限數位空間中的一小塊座標系。從俯視角觀看，透視效果自然產生「近大遠小」的消失點，不需 2D 版本的手動 power curve 計算。

### 容器壁面視覺

| 元素 | Material | 說明 |
|------|----------|------|
| 容器框架 | `LineBasicMaterial`, color=`#00FFFF`, opacity=0.6 | 12 條邊的線框立方體 |
| 前牆面 | `MeshBasicMaterial`, transparent, opacity=0.03 | 幾乎全透明（讓攝影機看穿） |
| 側/後牆面 | `MeshBasicMaterial`, transparent, opacity=0.06 | 略有存在感 |

> **設計說明**：容器牆壁僅以霓虹線框呈現，不用實體面遮擋視線。前面牆特別透明，確保攝影機視角下形狀清楚可見。

### Game Over 判定面

- 半透明紅色平面，Y=13
- `MeshBasicMaterial`, color=`#FF3131`, opacity=0.15, side=DoubleSide
- 帶有微弱的 emissive 讓 Bloom 產生淡紅光暈

### 背景微格線

3D 版本中，背景微格線由遠處的大型 GridHelper 實現，透明度極低（0.02），在潛意識層面強化「數位空間」氛圍。

---

## 4.5 隱性世界觀

> **設計備注**：本遊戲為無敘事益智遊戲，採用「隱性世界觀」——透過 3D 視覺環境暗示主題，無文字故事。

### 環境敘事設定

| 元素 | 隱性含義 |
|------|---------|
| 霓虹 3D 多面體 | 數位能量晶體，不同頻率/維度的結晶體 |
| 合成升級 | 同頻共鳴，融合為更高維度形態 |
| 3D 格線地板 | 數位空間座標系——無限延伸的虛空座標 |
| 格線光流 | 數位空間中流動的能量脈衝 |
| 遊戲結束 = 堆出容器 | 能量容器溢出，系統崩潰 |
| 深黑背景 + 霧氣 | 虛空中的數位微宇宙 |
| 多面體稜線光暈 | 能量在結晶體的稜邊流動 |

### 形狀能量隱喻（3D 版本）

每個形狀等級對應不同的「能量維度」，透過 3D 幾何形態與顏色傳達：

| 等級 | 3D 形態 | 能量隱喻 | 色彩敘事 |
|------|---------|---------|--------|
| Lv.0 Tetrahedron | 最簡多面體（4 面） | 基礎能量種子——最不穩定的結晶 | 青色 = 初始冷電流 |
| Lv.1 Small Sphere | 首次球化 | 能量凝聚，開始形成穩定場 | 黃色 = 暖化啟動 |
| Lv.2 Cube | 立方穩定 | 結構化能量——可疊加的基礎單元 | 珊瑚紅 = 能量升溫 |
| Lv.3 Dodecahedron | 十二面體 | 複雜共振開始——超越基礎幾何 | 螢光綠 = 生命脈動 |
| Lv.4 Icosahedron | 二十面體 | 高效能量排列——接近球形的多面體 | 橙色 = 熱力釋放 |
| Lv.5 Sphere | 完美球形 | 能量球體——維度跳躍的臨界點 | 洋紅 = 高維輻射 |
| Lv.6 Octahedron | 八面體 | 能量矩陣——菱形對稱的力場 | 紫色 = 暗能量 |
| Lv.7 Truncated Icosahedron | 截角二十面體 | 宇宙級結構——自然界碳 60（C₆₀）形態 | 青綠 = 冷卻回歸 |
| Lv.8 Large Sphere | 終極球體 | 圓滿——不可再分裂的統一場 | 白色 = 所有光的合一 |

### 格線光流的方向敘事

- 60% 水平流動（沿 X/Z 軸格線） → 暗示能量在同一維度內傳導
- 40% 垂直流動（沿 Y 軸） → 暗示能量試圖跨維度躍遷
- Light flow 在近攝影機端較亮、遠端漸滅 → 暗示能量從外部源源注入容器

### 命名哲學

遊戲名 **"Neon Shape Merge"** 直白表達核心玩法（霓虹 + 形狀 + 合成），3D 立體視覺語言即是敘事，不需額外故事包裝。

---

## 4.6 Design Token 系統

將散落各處的顏色、字型、間距統整為語意化 Design Token，方便維護與未來擴展：

### 顏色 Token

| Token 名稱 | 值 | 語意用途 |
|-----------|-----|--------|
| `--color-bg-primary` | `#0a0a0f` | 全域背景 / Scene 背景 |
| `--color-bg-secondary` | `#0d0d1a` | 容器背景 |
| `--color-bg-surface` | `#0f0f23` | UI 面板底色 |
| `--color-accent` | `#00FFFF` | 主要強調色（牆壁、分數、按鈕） |
| `--color-danger` | `#FF3131` | 危險色（Game Over、Hard 按鈕） |
| `--color-success` | `#39FF14` | 正向色（Easy 按鈕） |
| `--color-gold` | `#FFD700` | 獎勵色（COMBO、排行榜） |
| `--color-settings` | `#AAAAFF` | 設定介面色 |
| `--color-text-primary` | `#FFFFFF` | 主要文字 |
| `--color-text-muted` | `rgba(255,255,255,0.4)` | 次要標籤文字 |

### 字型 Token

| Token 名稱 | 值 | 用途 |
|-----------|-----|------|
| `--font-display` | `'Orbitron', sans-serif` | 標題、分數、按鈕（科技感等寬） |
| `--font-body` | `'Rajdhani', sans-serif` | 內文、排行榜名字（可讀性） |
| `--font-size-score` | `48px` | 分數數值 |
| `--font-size-title` | `36px` | Game Over 標題 |
| `--font-size-subtitle` | `28px` | 難度選擇標題 |
| `--font-size-button` | `22px` | 難度按鈕文字 |
| `--font-size-label` | `16px` | HUD 標籤 |
| `--font-size-small` | `13px` | 描述文字 |

### 動畫 Token

| Token 名稱 | 值 | 用途 |
|-----------|-----|------|
| `--transition-fast` | `0.25s ease` | 按鈕 hover |  
| `--transition-normal` | `0.3s ease` | Overlay 出現 |
| `--transition-slow` | `0.5s ease` | 難度選擇淡入 |

---

[下一章：遊戲 UI/UX 設計 →](05_ui_ux_design.md)
