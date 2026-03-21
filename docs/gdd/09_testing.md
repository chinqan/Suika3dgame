# 第 9 章：遊戲測試

[← 返回目錄](00_index.md) | [← 上一章](08_additional_specs.md)

---

## 9.1 測試目標

| 目標 | 驗收標準 |
|------|---------|
| 核心玩法正確性 | 所有合成組合正確升級、最高等級不再升級 |
| 3D 物理穩定性 | 形狀無穿牆、無飛出容器、3D 堆疊穩定不抖動 |
| Game Over 正確性 | 靜止越線 1.5 秒觸發、未靜止不觸發、可取消 |
| 分數計算正確性 | 合成分數 = 目標等級 score 值 |
| 難度差異 | 3 種難度的形狀數量與可投放等級符合設計 |
| 音效系統 | 8 種音效皆可正常播放並切換 |
| 3D 渲染品質 | Bloom 泛光、Material 半透明、稜線光暈正確顯示 |
| 跨平台 | 桌機 + 行動裝置均可正常遊玩 |

---

## 9.2 功能測試清單

### 核心玩法

- [ ] Lv.0 + Lv.0 → Lv.1（Tetrahedron → Small Sphere）
- [ ] Lv.1 + Lv.1 → Lv.2（Small Sphere → Cube）
- [ ] Lv.2 + Lv.2 → Lv.3（Cube → Dodecahedron）
- [ ] Lv.3 + Lv.3 → Lv.4（Dodecahedron → Icosahedron）
- [ ] Lv.4 + Lv.4 → Lv.5（Icosahedron → Sphere）
- [ ] Lv.5 + Lv.5 → Lv.6（Sphere → Octahedron）
- [ ] Lv.6 + Lv.6 → Lv.7（Octahedron → Truncated Icosahedron）
- [ ] Lv.7 + Lv.7 → Lv.8（Truncated Icosahedron → Large Sphere）
- [ ] Lv.8 + Lv.8 → 得 80 分，無新形狀
- [ ] 不同等級形狀碰撞 → 不合成
- [ ] 投落後 canDrop 鎖定 450ms
- [ ] 冷卻中點擊無反應
- [ ] NEXT 3D 預覽正確顯示下一個形狀

### 3D 物理特定測試

- [ ] 形狀在容器四面牆壁內正確碰撞反彈
- [ ] 形狀 3D 堆疊穩定（不會持續抖動）
- [ ] 大量形狀（15+）同時在容器中無穿透
- [ ] 合成後新形狀正確生成在 3D 中點位置
- [ ] 新形狀向上噴出的 3D 速度表現自然
- [ ] 形狀 Rapier3D Body 與 Three.js Mesh 位置/旋轉同步一致
- [ ] WASM 初始化成功（await RAPIER.init()）

### Game Over 機制

- [ ] 形狀超過 Y=13 且靜止 → 倒計時 1.5 秒
- [ ] 倒計時中形狀被合成或推下 → 取消倒計時
- [ ] 倒計時完成 → 正確觸發 Game Over
- [ ] Game Over 正確顯示本局分數
- [ ] Game Over 正確顯示歷史最高分（localStorage）
- [ ] 最高分被刷新時正確寫入

### 難度系統

- [ ] EASY：形狀數 7（Lv.0 ~ Lv.6），可投放 Lv.0~3
- [ ] NORMAL：形狀數 8（Lv.0 ~ Lv.7），可投放 Lv.0~3
- [ ] HARD：形狀數 9（Lv.0 ~ Lv.8），可投放 Lv.0~4
- [ ] 切換難度後 Evolution Bar 正確更新
- [ ] 切換難度後 NEXT 預覽範圍正確

### COMBO 系統

- [ ] 1200ms 內連續合成 2 次 → 顯示 COMBO x2
- [ ] 連續 3 次 → COMBO x3，字體更大
- [ ] 超過 1200ms 無合成 → COMBO 重置
- [ ] COMBO 不影響實際得分

### UI/UX

- [ ] 分數即時更新（每次合成）
- [ ] HUD NEXT 3D 預覽每次投落後更新
- [ ] 模糊遮罩（CSS backdrop-filter）正確顯示
- [ ] 點擊「再來一局」→ 回到難度選擇
- [ ] Player ID 自動從 localStorage 填入
- [ ] Player ID 輸入為空 → 預設 "guest"
- [ ] 排行榜正確載入並顯示排名顏色
- [ ] 排行榜載入中顯示「載入中…」
- [ ] 排行榜 / 設定打開時隱藏底層 Overlay
- [ ] 設定音效類型後立即切換，下次開啟保持選擇

### 3D 渲染視覺測試

- [ ] 9 種 3D 多面體 Geometry 正確顯示
- [ ] MeshStandardMaterial 半透明霓虹質感正確
- [ ] EdgesGeometry 稜線光暈正確顯示
- [ ] UnrealBloomPass 泛光效果正確
- [ ] 光照系統正常（環境光 + 3 個 PointLight）
- [ ] 地板 GridHelper 正確顯示
- [ ] 容器線框正確顯示
- [ ] Game Over 半透明紅色平面正確
- [ ] 形狀自轉動畫正常
- [ ] CSS2DRenderer 浮動文字定位正確

### 音效

- [ ] 投落音效每次投放觸發
- [ ] 8 種音效類型皆可正常播放
- [ ] 等級不同時音調有明顯差異
- [ ] 設定介面試聽按鈕功能正常（含閃光動畫）
- [ ] 快速連續合成時音效不爆音（DynamicsCompressor）

### 視覺效果

- [ ] 合成觸發 3D Ring 擴散環
- [ ] 合成觸發 3D Shard 碎片飛散（InstancedMesh）
- [ ] 合成觸發 3D Dot 光點飛散（Points）
- [ ] 浮動分數文字（CSS2DObject）顯示正確顏色與數值
- [ ] COMBO 文字以金色顯示
- [ ] 攝影機震動在合成時觸發，衰減後停止
- [ ] 格線光流 Sprite 持續在地板流動
- [ ] 瞄準導線跟隨滑鼠/觸控精確移動（Raycaster）
- [ ] 瞄準幽靈形狀與 currentLevel 3D 形狀一致

### 後端 API

- [ ] Game Over 後自動提交分數
- [ ] POST /api/scores 包含正確的 player_id/score/difficulty/play_time
- [ ] GET /api/scores 回傳 Top 50 並按分數降序
- [ ] 後端未啟動時遊戲不中斷（靜默失敗）

---

## 9.3 行動裝置測試

| 平台 | 測試項目 |
|------|---------|
| **iOS Safari** | 觸控投放正常、WebGL2 正常、3D 渲染無黑屏 |
| **iOS Chrome** | 基本功能測試 |
| **Android Chrome** | 觸控正常、音效播放、WASM 載入正常 |
| **縱向螢幕** | 攝影機 aspect 正確、containter 可見 |
| **橫向螢幕** | 攝影機 aspect 正確、居中顯示 |
| **Retina 2×** | pixelRatio 限制 2，顯示清晰不模糊 |
| **低階裝置** | 幀率 ≥ 30 FPS |

---

## 9.4 效能測試

| 指標 | 目標 | 測試場景 |
|------|------|---------|
| 幀率（桌機） | 穩定 60 FPS | 15 個 3D 形狀 + 粒子效果 + Bloom |
| 幀率（行動） | ≥ 30 FPS | 10 個 3D 形狀 |
| Draw Calls（桌機） | < 100 | 15 個形狀 + 粒子 + 環境 |
| Draw Calls（行動） | < 50 | 10 個形狀 |
| 三角形數量 | < 50K | 含所有 Mesh |
| 粒子併發 | 200+ 不掉幀 | 連續快速合成 |
| 記憶體穩定 | 20 分鐘無洩漏 | 長局持續遊玩 |
| Geometry/Material dispose | 切換難度無洩漏 | 反覆 Easy→Hard→Easy |
| 物理穩定 | 20 Body 無卡頓 | 容器接近滿 |
| WASM 載入時間 | < 2 秒 | 首次載入 Rapier3D |
| Bloom 開銷 | < 3ms/幀 | 後處理管線 |

---

## 9.5 已知風險與緩解方案

| 風險 | 說明 | 緩解措施 |
|------|------|---------|
| 3D 物理碰撞抖動 | 大量球形碰撞體堆疊可能微抖 | Rapier3D damping 已設置；可調整 solver iterations |
| 連鎖合成衝突 | 多對形狀同幀碰撞可能產生衝突 | `mergeCooldown Set` 防止重複觸發 |
| iOS 首次音效延遲 | 瀏覽器自動播放政策 | 懶初始化 AudioContext，首次互動時建立 |
| 大形狀投放範圍窄 | Lv.8 碰撞半徑 2.50 → 容器內可用寬度僅 ~5 units | Clamp 包含 radius+0.08 邊距 |
| WASM 載入失敗 | 網路問題或瀏覽器不支援 | 顯示降級提示，WASM 異常處理 |
| 記憶體洩漏 | Three.js Geometry/Material 未 dispose | 強制 dispose 機制，移除 Mesh 時同步清理 |
| Bloom 過亮 | emissive 材質在不同顯示器亮度不同 | toneMappingExposure 可調，提供亮度設定選項 |
| 行動裝置性能不足 | 複雜 3D 渲染 + 後處理 | 行動裝置可降級：關閉 Bloom、降低粒子數 |
| 極端長局記憶體 | 持續 30+ 分鐘可能累積 | Particle 清理、Object Pool + dispose 已實作 |

---

## 9.6 玩家體驗測試指標

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| 新玩家上手時間 | < 15 秒 | 首次點擊到有意識投放的時間 |
| 第一局平均時長 | 3~8 分鐘（NORMAL） | `play_time` 統計 |
| COMBO 觸發率 | > 30% 的局至少 1 次 | 體驗觀察/日誌 |
| 「再來一局」比率 | > 60% | 觀察玩家行為 |
| 排行榜提交成功率 | > 95% | 後端日誌 |
| 3D 視覺吸引力 | 首次玩家「哇」反應 | 使用者測試觀察 |

---

[← 返回目錄](00_index.md)
