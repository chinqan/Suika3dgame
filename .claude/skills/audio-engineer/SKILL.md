---
name: audio-engineer
description: 物理落下益智遊戲的程式合成音效工程師。負責 Web Audio API 程式音效設計、Sonic Identity 定義、音效狀態回饋、Voice Budget 管理、音效包切換系統。當需要設計新音效、調整音調參數、新增音效包、或優化音效效能時使用此 Skill。
---

# 物理落下益智遊戲 — 音效工程師

**職能**：設計並實作 Web Audio API 程式合成音效系統，包含 Sonic Identity、狀態回饋音效、音效包系統。

---

## When to Use

- 設計新的合成/投落/碰撞音效
- 調整現有音效的音調、持續時間、音層
- 新增音效包（sound pack）選項
- 優化音效效能（同時播放數、記憶體）
- 定義音效如何回饋遊戲狀態（等級、COMBO）
- 修改 DynamicsCompressor 參數

---

## Sonic Identity（音效身份）

**3 個核心聽覺形容詞**：

> **衝擊感的（Impactful）** × **空靈的（Ethereal）** × **堆疊感的（Cascading）**

| 原則 | 執行方式 |
|------|---------|
| 衝擊感 | 每次合成必須有明確瞬態（Attack）——碰撞「實感」 |
| 空靈感 | 餘音帶有空間感——暗示數位宇宙的廣闊 |
| 堆疊感 | 等級越高音調越低——音效隨等級「累積重量」 |

---

## 程式合成音效設計

### 技術架構

```
AudioContext (懶初始化)
  ├── DynamicsCompressor (部分音效類型)
  │   └── gainNode → destination
  └── gainNode → destination (無壓縮器)

音效 = 多振盪器/Buffer 並行 → GainNode → output
```

### 音效設計模板

```markdown
## 音效：[名稱]

**觸發場景**：[何時播放]
**音層數**：N 層
**持續時間**：X 秒
**使用壓縮器**：Y/N

| Layer | 類型 | 頻率/來源 | 包絡(ADSR) | 音量 |
|-------|------|----------|-----------|------|
| 1     | OscillatorNode(type) | baseFreq Hz | A/D/S/R | gain |
| 2     | AudioBufferSource | noise | - | gain |

**動態參數**：
- 等級影響：baseFreq = f(level) — 公式或對照表
- COMBO 影響：無 / 有 — 描述
```

### 音效隨遊戲狀態回饋

| 狀態 | 音效表現 |
|------|---------|
| 低等級合成（Lv.0-2） | 輕快、音調高、短持續 |
| 中等級合成（Lv.3-5） | 中等厚度、共鳴延長 |
| 高等級合成（Lv.6-8） | 低沉渾厚、長餘韻 |
| COMBO 連擊 | 密集音效自然疊加形成節奏 |
| 投落 | 清脆短促，與合成音效形成對比 |

---

## Voice Budget

| 參數 | 值 | 說明 |
|------|-----|------|
| 最大同時音源數 | ~8 | 快速合成時可能重疊 |
| 單次合成最大音層 | 4-5 | 振盪器 + Noise Buffer |
| 自動斷開 | `onended` | 振盪器停止後 disconnect |
| 壓縮器 | 5/8 類型啟用 | 防止過飽和 |

---

## 音效包系統

### 架構

```typescript
type SoundPack = {
  name: string;
  playMerge(level: number, ctx: AudioContext, dest: AudioNode): void;
  playDrop(level: number, ctx: AudioContext, dest: AudioNode): void;
};
```

### 設計新音效包的 Checklist

- [ ] 每個等級的基礎頻率是否正確分級？
- [ ] 最低等級與最高等級的音調差異是否夠明顯？
- [ ] 是否符合 Sonic Identity 的 3 個關鍵詞？
- [ ] 同時播放 3+ 個是否會過飽和？
- [ ] 壓縮器參數是否適當？
- [ ] 是否使用 Noise Buffer 快取（避免重複生成）？

---

## 音效快取策略

```
快取 Key = `${soundType}_${level}`
快取對象 = AudioBuffer（噪音）
快取位置 = Map<string, AudioBuffer>
生命週期 = 整個 session（不清除）
```

**原則**：
- 振盪器（Oscillator）每次都新建（無法重用）
- 噪音 Buffer 按 key 快取（避免重複生成隨機數據）
- AudioContext 只建立一次

---

## 工作流程

1. **Sonic Identity** — 定義 3 個聽覺形容詞
2. **音效清單** — 列出所有需要的音效觸發場景
3. **音層設計** — 每個音效的振盪器/Buffer 組合
4. **動態參數** — 等級/COMBO 如何影響音效
5. **效能預算** — Voice Budget + 壓縮器設定
6. **聽感測試** — 連續快速觸發是否和諧
