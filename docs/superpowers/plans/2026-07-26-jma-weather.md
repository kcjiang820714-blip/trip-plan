# 日本氣象廳天氣來源 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本地點優先顯示日本氣象廳公開預報，失敗時安全回退 Open-Meteo。

**Architecture:** 新增純模組負責日本預報區與氣象廳 JSON 預報轉換；`app.js` 依地點國碼選資料來源，並維持既有 forecast 結構及來源標示。

**Tech Stack:** 原生 ES modules、氣象廳公開 JSON、Open-Meteo、Node test、PWA。

## Global Constraints

- 只用日本氣象廳公開可機讀資料，不爬取 Tenki。
- 日本地點優先 JMA；無法對應或 JMA 失敗時使用 Open-Meteo，且來源如實顯示。
- 其他國家及既有 Supabase 資料結構不變。
- JMA 解析與區域對應必須有單元測試；版本與 Service Worker 必須同步。

### Task 1: JMA 區域與預報解析模組

**Files:** Create `jma-weather.js`, `tests/jma-weather.test.mjs`.

- [ ] 寫入東京、大阪、福岡等座標／行政區可對應預報區，以及 JMA JSON 天氣、最高最低溫、降雨機率轉為既有 daily 結構的失敗測試。
- [ ] 實作 `resolveJmaForecastArea(location)`、`parseJmaForecast(payload, area, timezone)`；無法對應或缺資料回傳 `null`，不猜測資料。
- [ ] Run: `node --test tests/jma-weather.test.mjs`，再 Run: `node --test`，Expected: 0 failures。
- [ ] Commit: `feat: parse JMA weather forecasts`。

### Task 2: 在 App 整合 JMA 與 Open-Meteo 備援

**Files:** Modify `app.js`; Test `tests/jma-weather.test.mjs`.

- [ ] 先加入會失敗測試，驗證 `countryCode === "JP"` 先請求 JMA 預報區 JSON；JMA 對應、HTTP、CORS 或解析失敗時只對該地點改用既有 Open-Meteo。
- [ ] 將現有 `fetchWeatherForLocation` 拆成 JMA／Open-Meteo 小函式；成功結果寫入既有 `weatherForecasts`，`source` 分別為 `日本氣象廳`、`Open-Meteo` 或 `Open-Meteo（日本氣象廳備援失敗）`。
- [ ] 調整來源摘要，混合資料時不誤標；保留現有更新、錯誤與快取行為。
- [ ] Run: `node --test` and `node --check app.js`，Expected: 0 failures。
- [ ] Commit: `feat: use JMA forecasts in Japan`。

### Task 3: 更新離線快取與 UI 驗收

**Files:** Modify `index.html`, `app.js`, `sw.js`, relevant cache test.

- [ ] 新增先失敗的測試，確認 JMA module、app/CSS query version 和 cache generation 完全一致。
- [ ] 版本一併遞增，將 JMA module 加入 Service Worker precache。
- [ ] Run: `node --test && node --check app.js && node --check jma-weather.js && node --check sw.js && git diff --check`，Expected: 0 failures。
- [ ] 以東京與大阪 fixture 驗證「日本氣象廳」來源；以非日本與失敗 fixture 驗證 Open-Meteo 與備援文案，並在 390px、1280px 檢查來源可閱讀。
- [ ] Commit: `chore: cache JMA weather source`。
