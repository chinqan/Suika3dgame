# Neon Shape Merge 3D (Suika 3D Game)

3D 物理落下益智遊戲（Suika-type）。Three.js 渲染 + Rapier 物理引擎，前端 Vite + TypeScript，後端 Express + better-sqlite3 排行榜 API。

## 常用指令

```bash
npm install          # 安裝依賴
npm run dev          # 前端開發伺服器（Vite，:5173，/api 代理到 :7860）
npm run server       # 排行榜 API（Express + SQLite，:7860）
npm run build        # 編譯（tsc 型別檢查 + vite build → dist/）
npm run preview      # 預覽 production build（:7860）
./deploy.sh          # 部署（git pull + install + build + PM2 重啟）
```

本地開發需同時跑 `npm run server`（API）與 `npm run dev`（前端）。

## 架構

- `src/main.ts` — 入口；`src/game.ts` — 遊戲主流程
- `src/constants.ts`, `src/types.ts` — 遊戲參數與型別
- `src/core/` — scene、camera、input
- `src/rendering/` — geometry、material、mesh、後製特效
- `src/systems/` — physics（Rapier）、merge 合成、particles、grid-flow
- `src/audio/` — 音效；`src/ui/` — 浮動文字；`src/utils/` — math、物件池
- `server.js` — 排行榜 API（POST/GET `/api/scores`），資料存 `scores.db`
- `docs/gdd/` — 遊戲設計文件（GDD），共 10 章
- 路徑別名：`@/*` → `src/*`

## GDD 同步規則（必須遵守）

修改遊戲功能/參數/渲染/音效/UI 後，**必須**同步 `docs/gdd/` 對應文件，並在 commit/變更說明標記 `[GDD-SYNC]`。Bug 修復、純重構不觸發。

| 程式 | GDD |
|-----|-----|
| `constants.ts`, `types.ts` | `02_scene_and_level_design.md` |
| `rendering/*`, `systems/*` | `04_art_style_and_narrative.md` |
| `core/*`, `server.js` | `03_technical_foundation.md` |
| `audio/*` | `07_audio_design.md` |
| `game.ts`（流程） | `06_game_flow.md` |
| `style.css`, `index.html`, `ui/*` | `05_ui_ux_design.md` |

## Skills

`.claude/skills/` 內有 18 個專案 skills（自 `.agents/skills/` 遷移）：遊戲設計、關卡設計、美術風格、音效、QA、UI/UX，以及 Three.js 各主題（fundamentals、geometry、materials、lighting、shaders、post-processing 等）。處理對應領域的任務時使用。
