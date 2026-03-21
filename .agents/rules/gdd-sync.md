---
description: 程式碼修改後同步 GDD
alwaysApply: true
---

修改遊戲功能/參數/渲染/音效/UI後，**必須**同步 `docs/gdd/` 對應文件，標記 `[GDD-SYNC]`。

Bug修復、純重構不觸發。

| 程式 | GDD |
|-----|-----|
| `constants.ts`, `types.ts` | `02_scene_and_level_design.md` |
| `rendering/*`, `systems/*` | `04_art_style_and_narrative.md` |
| `core/*`, `server.js` | `03_technical_foundation.md` |
| `audio/*` | `07_audio_design.md` |
| `game.ts` (flow) | `06_game_flow.md` |
| `style.css`, `index.html`, `ui/*` | `05_ui_ux_design.md` |
