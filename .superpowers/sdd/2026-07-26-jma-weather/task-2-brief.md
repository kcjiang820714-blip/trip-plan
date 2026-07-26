### Task 2: 在 App 整合 JMA 與 Open-Meteo 備援

**Files:** Modify `app.js`, `weather-provider.js`, `styles.css`; Test `tests/weather-provider.test.mjs` and a desktop CSS/DOM regression check.

- [x] 先加入會失敗測試，驗證 `countryCode === "JP"` 先請求 JMA 預報區 JSON；JMA 對應、HTTP、CORS 或解析失敗時只對該地點改用既有 Open-Meteo。
- [x] 將現有 `fetchWeatherForLocation` 拆成 JMA／Open-Meteo 小函式；成功結果寫入既有 `weatherForecasts`，`source` 分別為 `日本氣象廳`、`Open-Meteo` 或 `Open-Meteo（日本氣象廳備援失敗）`。
- [x] 調整來源摘要，混合資料時不誤標；保留現有更新、錯誤與快取行為。
- [x] 桌機斷點不得再強制隱藏 `#itineraryPanel .weather-panel`；點擊天氣 chip 後，面板與「更新天氣」要可見可用，quick ticket 維持原行為。
- [x] Run: `node --test` and `node --check app.js`，Expected: 0 failures。
- [x] Commit: `feat: use JMA forecasts in Japan`。
