# Task 3 Report — 離線快取與版本同步

## 完成內容

- CSS、app、Service Worker 註冊與 `CACHE_NAME` 同步升級為 `v156`。
- `APP_ASSETS` 新增 `weather-provider.js?v=156`、`jma-weather.js?v=156`，以及 JMA 的直接市町村資料依賴 `jma-municipality-areas.js?v=156`。
- `app.js → weather-provider.js → jma-weather.js → jma-municipality-areas.js` 的正式 import query 都為 `v156`，避免新 app shell 載入舊靜態模組。
- 快取測試會從正式檔案讀取 query，驗證首頁、SW 註冊、快取名稱與所有 JMA 相依資產一致。

## TDD 與驗證

先更新快取一致性測試；舊版測試紅燈，因 `trip-notebook-v155` 與 app `v130` 不一致。完成同步後：

```bash
node --test tests/booking-date-tabs.test.mjs
# 13 passed, 0 failed

node --test
# 51 passed, 0 failed

node --check app.js
node --check jma-weather.js
node --check weather-provider.js
node --check sw.js
git diff --check
# 皆成功
```
