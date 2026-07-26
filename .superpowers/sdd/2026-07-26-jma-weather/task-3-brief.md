### Task 3: 更新離線快取與 UI 驗收

**Files:** Modify `index.html`, `app.js`, `weather-provider.js`, `jma-weather.js`, `sw.js`, relevant cache test.

- [x] 新增先失敗的測試，確認 JMA module、app/CSS query version 和 cache generation 完全一致。
- [x] 版本一併遞增，將 JMA module 加入 Service Worker precache。
- [x] Run: `node --test && node --check app.js && node --check jma-weather.js && node --check sw.js && git diff --check`，Expected: 0 failures。
- [ ] 以東京與大阪 fixture 驗證「日本氣象廳」來源；以非日本與失敗 fixture 驗證 Open-Meteo 與備援文案，並在 390px、1280px 檢查來源可閱讀。
- [x] Commit: `chore: cache JMA weather source`。
