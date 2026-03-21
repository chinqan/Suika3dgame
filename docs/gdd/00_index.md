# 🎮 Neon Shape Merge — 遊戲設計規格書（GDD）

**版本**：v2.0（3D 重製版）  
**遊戲名稱**：Neon Shape Merge（霓虹幾何合成）  
**遊戲類型**：3D 物理落下益智遊戲（3D Physics Drop Puzzle）  
**平台**：Web Browser（桌機 + 行動裝置）  
**開發框架**：TypeScript / Three.js / Rapier3D (WASM) / Vite  
**後端**：Node.js + Express + SQLite（better-sqlite3）  
**文件日期**：2026-03-21  

---

## 📑 文件目錄

| # | 章節 | 檔案 | 說明 |
|---|------|------|------|
| 1 | [遊戲概述](01_game_overview.md) | `01_game_overview.md` | 核心概念、設計支柱、核心循環、目標玩家 |
| 2 | [遊戲場景與關卡設計](02_scene_and_level_design.md) | `02_scene_and_level_design.md` | 3D 遊戲場景、攝影機、形狀進化系統 |
| 3 | [遊戲基礎建設](03_technical_foundation.md) | `03_technical_foundation.md` | Three.js 架構、Rapier3D 物理、渲染管線 |
| 4 | [遊戲風格與故事設計](04_art_style_and_narrative.md) | `04_art_style_and_narrative.md` | 3D 美術風格、Material 系統、隱性世界觀 |
| 5 | [遊戲 UI/UX 設計](05_ui_ux_design.md) | `05_ui_ux_design.md` | HUD、Overlay 視窗、3D 瞄準導線、即時回饋 |
| 6 | [遊戲流程設計](06_game_flow.md) | `06_game_flow.md` | 完整流程圖、Game Over 機制、COMBO 系統 |
| 7 | [遊戲音樂音效設計](07_audio_design.md) | `07_audio_design.md` | Web Audio API、8 種合成音效、3D 空間音效 |
| 8 | [遊戲其他規格與設定](08_additional_specs.md) | `08_additional_specs.md` | 3D 粒子效果、後端 API、邊界條件處理 |
| 9 | [遊戲測試](09_testing.md) | `09_testing.md` | 功能測試、3D 效能測試、風險評估 |
