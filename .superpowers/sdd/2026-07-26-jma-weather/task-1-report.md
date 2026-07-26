# Task 1 Report — JMA 區域與預報解析模組

## 完成內容

- 新增 `jma-weather.js` 純 ES module；不讀取 DOM、app state、trip，也不執行 `fetch`。
- 提供 `isJapanLocation`、`resolveJmaForecastArea`、`buildJmaForecastUrl`、`parseJmaForecast`、`mapJmaWeatherToWmo`。
- 已由 JMA 官方 `area.json`（2026-07-27 取得）建立 58 個預報端點與所有 class10 預報拆分區的 `JMA_OFFICE_FORECAST_AREAS`；追溯 fixture 在 `tests/fixtures/jma-official-area-source-2026-07-27.json`。
- `JMA_FORECAST_AREAS` 涵蓋 47 都道府縣代表城市，另含函館、小笠原、北九州、舞鶴、伊豆諸島、沖繩離島與奄美的獨立預報區／溫度站碼。
- 解析只接受精確城市名稱、已保存的內部預報區碼或唯一座標範圍；廣域都道府縣文字（例如 `Tokyo`、`Hokkaido`）不再被當成城市答案。若無法唯一對應，安全回傳 `null` 交由後續 Open-Meteo 備援。
- 解析以 `Intl.DateTimeFormat` 的 `Asia/Tokyo` 時區產生日字串；`--`、空字串、非數字與未知天氣都保留為 `null`，不補 0 或晴天。
- 不完整 payload、區碼不符、序列長度不符與要求日期不存在都安全回傳 `null`，不拋出未處理例外。

## TDD 證據

先新增 `tests/jma-weather.test.mjs`，再執行：

```bash
node --test tests/jma-weather.test.mjs
```

紅燈結果為預期的 `ERR_MODULE_NOT_FOUND`：`jma-weather.js` 尚不存在。建立模組後，目標測試 7/7 通過。

## 驗證結果

```bash
node --test tests/jma-weather.test.mjs
# 11 passed, 0 failed

node --test
# 38 passed, 0 failed

node --check jma-weather.js
git diff --check
# 皆成功
```

## 範圍與交接

- 未修改 `app.js`、`index.html`、`sw.js`、CSS、快取或任何 Supabase 相關檔案。
- 未暫存既有未追蹤的 `final-review.md`。
- Task 2 需在 app 端用 `resolveJmaForecastArea(location)` 取得 endpoint 與內部區碼，再以 `buildJmaForecastUrl(area.forecastAreaCode)` 抓取 JSON，將 `parseJmaForecast(payload, area)` 的成功結果寫入既有快取；失敗時才走 Open-Meteo。

## 已知限制／後續風險

- JMA 的預報邊界不是簡單矩形。這個純前端版本僅為已確認的城市／島嶼放入小型、不重疊的座標範圍；其他地點必須靠精確名稱或未來保存的 `jmaAreaCode` 才會走 JMA，否則安全 fallback。不得以都道府縣名稱或大範圍矩形猜測子區。
- JMA 的溫度區域代碼與預報區代碼不同；新增城市時兩者都必須以該端點官方 JSON 確認，並新增對應測試。
