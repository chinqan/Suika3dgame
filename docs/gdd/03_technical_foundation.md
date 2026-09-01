# 第 3 章：遊戲基礎建設

[← 返回目錄](00_index.md) | [← 上一章](02_scene_and_level_design.md)

---

## 3.1 技術架構

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Browser)                       │
│  index.html ── HTML UI 結構（HUD / Overlay / Settings）    │
│  style.css  ── 全域樣式                                    │
│                                                           │
│  Three.js (WebGL2 Renderer)                                │
│  ├── Game          主控制器（含 HUD/Overlay/瞄準導線邏輯） (src/game.ts) │
│  ├── SceneManager  場景/攝影機/渲染器    (src/core/scene.ts) │
│  ├── CameraOrbit   攝影機環繞控制        (src/core/camera-orbit.ts) │
│  ├── InputManager  滑鼠/觸控輸入         (src/core/input.ts) │
│  ├── PhysicsSystem Rapier3D 物理封裝     (src/systems/physics.ts) │
│  ├── MergeSystem   碰撞合成邏輯          (src/systems/merge.ts) │
│  ├── ParticleSystem 3D 粒子系統          (src/systems/particles.ts) │
│  ├── GridFlowSystem 地板格線光流         (src/systems/grid-flow.ts) │
│  ├── AudioManager  程式合成音效          (src/audio/audio.ts) │
│  ├── MaterialFactory Material 工廠       (src/rendering/materials.ts) │
│  ├── GeometryFactory Geometry 快取工廠   (src/rendering/geometries.ts) │
│  ├── ShapeMesh     形狀 Mesh 組裝        (src/rendering/shape-mesh.ts) │
│  ├── PostProcessing 後處理管線           (src/rendering/post-processing.ts) │
│  ├── FloatingText  浮動文字 (CSS2D)      (src/ui/floating-text.ts) │
│  └── ObjectPool    通用物件池            (src/utils/pool.ts) │
│                                                           │
│  Vite ── 開發伺服器 + TypeScript 編譯 + 生產打包            │
└─────────────────────────────────────────────────────────┘
                       HTTP API
┌─────────────────────────────────────────────────────────┐
│                      後端 (Node.js)                       │
│  server.js ── Express HTTP 伺服器 (Port 7860)              │
│  ├── POST /api/scores   提交分數                           │
│  └── GET  /api/scores   取得 Top 50 排行榜                 │
│                                                           │
│  scores.db ── SQLite 資料庫 (WAL 模式)                     │
└─────────────────────────────────────────────────────────┘
```

### 3D 新增模組說明

| 模組 | 說明 |
|------|------|
| `SceneManager` | 管理 Three.js Scene、PerspectiveCamera、WebGLRenderer、CSS2DRenderer |
| `CameraOrbit` | 攝影機環繞控制（拖曳旋轉 + 回復預設視角），震動偏移疊加其上 |
| `MaterialFactory` | 3D Material 的建立與快取（MeshStandardMaterial，flat-shaded 實體渲染） |
| `GeometryFactory` | 9 種 3D Geometry 的建立與快取（避免重複生成） |
| `PostProcessing` | EffectComposer + UnrealBloomPass（半解析度泛光效果） |
| `InputManager` | 滑鼠/觸控 → Raycaster → Z=0 垂直平面 → 世界座標 |
| `GridFlowSystem` | 地板光球流動效果（THREE.Points，1 draw call） |
| `ParticleSystem` | 合成爆炸粒子（InstancedMesh，200 顆預先配置 zero-alloc pool，1 draw call） |

> HUD 與 Overlay 視窗由 `index.html` DOM + `game.ts` 直接管理，瞄準導線（Aim Guide）亦內建於 `game.ts`，無獨立 UI 模組。

### 效能優化規格

| 項目 | 規格 |
|------|------|
| **WebGLRenderer** | `antialias: false`、`pixelRatio: min(devicePixelRatio, 1.5)` |
| **Bloom** | UnrealBloomPass 半解析度（`width/2 × height/2`） |
| **材質** | MeshStandardMaterial（非 MeshPhysicalMaterial） |
| **EdgesGeometry** | 按 level 快取共用 |
| **GridFlow** | `THREE.Points`（1 draw call，天生 billboard） |
| **Particles** | `InstancedMesh` + 200 顆預先配置 object pool（零執行期配置） |
| **InputManager** | `Plane(0,0,1,0)` 垂直平面投射（避免陡角放大） |
| **物理步進** | Fixed timestep accumulator（1/60s，dt 上限 50ms），視覺於物理算完後同步一次 |
| **NEXT 預覽** | On-demand 渲染（僅形狀輪替時重繪，不佔每幀預算） |

---

## 3.2 物理引擎

**引擎**：Rapier3D（`@dimforge/rapier3d-compat`，WASM 版本）  
**更新頻率**：60 Hz（`world.timestep = 1/60`）

### 引擎初始化

```typescript
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init(); // 載入 WASM
const gravity = new RAPIER.Vector3(0.0, GRAVITY_Y, 0.0); // GRAVITY_Y = -50.0
const world = new RAPIER.World(gravity);
```

### 世界參數

| 參數 | 數值 | 說明 |
|------|------|------|
| gravity.x | 0 | 無水平重力 |
| gravity.y | -50.0 | 垂直重力（`GRAVITY_Y`，強重力快速沈降、手感俐落） |
| gravity.z | 0 | 無深度方向重力 |
| timestep | 1/60 | 模擬步進時間（遊戲迴圈以 fixed timestep accumulator 驅動） |

### 形狀 Rigid Body 物理屬性

| 屬性 | 數值 | 說明 |
|------|------|------|
| bodyType | Dynamic | 動態剛體 |
| restitution | 0.15 | 碰撞恢復係數（略微彈跳） |
| friction | 0.6 | 動態摩擦力 |
| baseDensity | 1.5 | 基礎密度（小形狀輕） |
| densityPerLevel | 0.4 | 每升一級增加密度（大形狀重） |
| linearDamping | 0.3 | 線性阻尼（減緩速度） |
| angularDamping | 0.5 | 角阻尼（減緩旋轉） |
| ccdEnabled | true | 連續碰撞檢測——防止小球在強重力下高速穿模 |

### 牆壁 Rigid Body 物理屬性

| 屬性 | 數值 |
|------|------|
| bodyType | Static（固定剛體） |
| friction | 1.0 |
| restitution | 0.1 |

### 碰撞體設計

- **重要設計決策**：所有 3D 形狀一律使用**球形碰撞體**（`ColliderDesc.ball(radius)`）
- **碰撞半徑**：`shape.collisionRadius + COLLISION_RADIUS_PADDING(-0.02)`（略小於視覺包圍球，消除面與球之間的堆疊空隙）
- **Rigid Body userData**：存放 `{ level: number, id: string }`（區分遊戲形狀與牆壁）
- **設計理由**：球形碰撞體在 3D 中計算最快、碰撞檢測最穩定，避免複雜凸包碰撞導致的性能問題

### 碰撞事件監聽

```typescript
// Rapier3D 碰撞事件處理
world.contactPairsWith(collider, (otherCollider) => {
  // 檢查是否為相同等級形狀 → 觸發合成
});

// 或使用 EventQueue
const eventQueue = new RAPIER.EventQueue(true);
world.step(eventQueue);
eventQueue.drainContactForceEvents((event) => {
  // 處理碰撞力事件
});
```

---

## 3.3 渲染系統

### Three.js 初始化設定

| 參數 | 值 | 說明 |
|------|-----|------|
| Renderer | WebGLRenderer | WebGL2 渲染器 |
| antialias | false | 關閉抗鋸齒（Bloom 已提供足夠柔化，省 GPU） |
| alpha | false | 不透明背景 |
| powerPreference | `'high-performance'` | 要求高效能 GPU |
| pixelRatio | `min(devicePixelRatio, 1.5)` | 限制最高 1.5× |
| toneMapping | ACESFilmicToneMapping | 電影色調映射 |
| toneMappingExposure | 1.2 | 曝光度 |
| outputColorSpace | SRGBColorSpace | sRGB 色彩空間 |

### 光照系統

| 光源 | 類型 | 參數 | 說明 |
|------|------|------|------|
| 環境光 | AmbientLight | color=`#ffffff`, intensity=0.6 | 基礎亮度，確保暗面可見 |
| 主方向光 | DirectionalLight | color=`#ffffff`, intensity=1.2, pos=(5,15,10) | 右上前方打下，營造多邊形明暗面的立體感 |
| 補光 | DirectionalLight | color=`#ffffff`, intensity=0.4, pos=(-5,5,-5) | 左下方打上，防止背光面全黑 |
| 頂光 | DirectionalLight | color=`#ffffff`, intensity=0.3, pos=(0,20,0) | 正上方打下，讓頂面有高光 |

> **設計變更**：形狀改為實體 flat-shaded 渲染後，光照從「彩色 PointLight 氛圍光」改為「白色三向 DirectionalLight」——顏色由材質本身承載，光源專責塑造明暗立體感。

### 後處理管線（Post-Processing）

```
Scene Render → RenderPass → UnrealBloomPass → OutputPass → Screen
```

| 後處理 | 參數 | 說明 |
|--------|------|------|
| UnrealBloomPass | strength=0.8, radius=0.4, threshold=0.6 | 霓虹泛光效果 |

> **設計說明**：UnrealBloomPass 是實現霓虹 Cyberpunk 視覺的核心。所有發光材質（`emissive` 屬性）會被 Bloom 放大，產生 Glow 效果。

### Material 快取策略

| Material 類型 | 快取 Key | 清除時機 |
|--------------|---------|---------|
| 3D 形狀 Material | `level` (number) | 切換難度時全部清除重建 |
| 形狀邊框 Material | `level` (number) | 與形狀 Material 同步 |
| 粒子 Material | `colorHex` (string) | 手動清除 |
| 環境 Material | 全域單例 | 手動清除 |

### Geometry 快取策略

| Geometry 類型 | 說明 | 快取方式 |
|--------------|------|---------|
| TetrahedronGeometry | Lv.0 | 按等級快取，共 9 個 |
| SphereGeometry | Lv.1/5/8 | 按半徑快取 |
| BoxGeometry | Lv.2 | 按等級快取 |
| DodecahedronGeometry | Lv.3 | 按等級快取 |
| IcosahedronGeometry | Lv.4 | 按等級快取 |
| OctahedronGeometry | Lv.6 | 按等級快取 |
| 自訂 BufferGeometry | Lv.7（截角二十面體） | 按等級快取 |

> **效能要點**：Geometry 和 Material 分開快取，同一 Geometry 可搭配不同 Material 建立多個 Mesh（如遊戲形狀 vs 粒子碎片）。

---

## 3.4 Object Pool（物件池）

使用通用物件池減少 Garbage Collection 壓力：

| 池 | 物件類型 | 用途 |
|---|---------|------|
| `meshPool` | Three.js Mesh | 3D 形狀 Mesh（頻繁生成銷毀） |
| `floatingTextPool` | CSS2DObject | 浮動分數 / COMBO 文字（HTML 覆蓋） |
| `particlePool` | Three.js Points/InstancedMesh | 合成粒子（頻繁生成銷毀） |

**Pool 行為**：
- `acquire()`：從池中取出已回收的物件，若無則建立新的
- `release(obj)`：回收物件、設為不可見、從 Scene 移除
- `drain(disposeFn)`：遊戲結束時銷毀全部（含 Geometry/Material dispose）

---

## 3.5 輸入系統

### 支援輸入方式

| 平台 | 移動準心 | 觸發投放 |
|------|---------|---------|
| 桌機 | `mousemove` | `mousedown` |
| 行動裝置 | `touchmove`（passive: false） | `touchstart`（passive: false） |

### 座標轉換（3D 版本）

```typescript
// 螢幕座標 → 3D 世界 X 座標
const mouse = new THREE.Vector2();
mouse.x = (clientX / window.innerWidth) * 2 - 1;
mouse.y = -(clientY / window.innerHeight) * 2 + 1;

// 使用 Raycaster 投射到 Z=0 的「垂直」平面，取得 3D 投放 X 位置
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);
const dropPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 垂直平面
const dropPoint = new THREE.Vector3();
raycaster.ray.intersectPlane(dropPlane, dropPoint);
const dropX = clamp(dropPoint.x, -HALF_WIDTH + r + 0.08, HALF_WIDTH - r - 0.08);
```

> **3D 改動**：使用 Three.js Raycaster 將螢幕座標投射到 3D 空間。**投放平面採 Z=0 垂直平面**而非水平面——攝影機視角較平，射線與水平面夾角過陡會放大游標位移；垂直平面與視線近乎垂直，游標對應更線性。Clamp 邊界依形狀半徑動態計算（`半徑 + 0.08` 安全邊距）。

### 投放冷卻

- **DROP_COOLDOWN_MS = 250ms**
- 投放後鎖定 `canDrop = false`，250ms 後恢復

---

## 3.6 資料持久化

### 前端 localStorage

| Key | 型別 | 說明 |
|-----|------|------|
| `highScore` | string (number) | 本機最高分 |
| `playerId` | string | 玩家 ID（最多 16 字元） |
| `soundPack` | string | 音效包偏好 |
| `leaderboard` | string (JSON) | 本地排行榜快取 |

### 後端 SQLite

**資料庫**：`scores.db`（WAL 模式，提升並發讀寫效能）

**`scores` 資料表結構：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | INTEGER (PK, AUTO) | 自增主鍵 |
| player_id | TEXT | 玩家識別碼（伺服器端截斷至 16 字元，預設 `guest`） |
| score | INTEGER | 得分 |
| difficulty | TEXT | 難度（easy/normal/hard，預設 `normal`） |
| play_time | INTEGER DEFAULT 0 | 遊戲時長（秒） |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 記錄時間 |

---

## 3.7 建構與部署

| 指令 | 用途 |
|------|------|
| `npm run dev` | Vite 開發伺服器（Hot Reload，:5173，`/api` 代理到 :7860） |
| `npm run server` | 排行榜 API（Express + SQLite，:7860） |
| `npm run build` | 生產打包（tsc 型別檢查 + vite build → `dist/`） |
| `npm run preview` | 預覽 production build（:7860） |
| `./deploy.sh` | 部署（git pull + install + build + PM2 重啟，`ecosystem.config.cjs`） |

**Path Alias**：`@/` → `./src`（Vite + TypeScript 路徑別名）

### WASM 打包注意事項

Rapier3D 使用 WASM，需要在 Vite 配置中處理：

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  }
}
```

---

[下一章：遊戲風格與故事設計 →](04_art_style_and_narrative.md)
