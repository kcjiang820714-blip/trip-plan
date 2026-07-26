# Task 1 Report — JMA 區域與預報解析模組

## 完成內容

- 新增 `jma-weather.js` 純 ES module；不讀取 DOM、app state、trip，也不執行 `fetch`。
- 提供 `isJapanLocation`、`resolveJmaForecastArea`、`buildJmaForecastUrl`、`parseJmaForecast`、`mapJmaWeatherToWmo`。
- 已建立東京、京都、大阪、札幌、福岡的官方端點／預報區／溫度站對應；解析器將 JMA 的區域預報輸出為既有 `daily` 與空 `hourly.time` 結構。
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
# 7 passed, 0 failed

node --test
# 34 passed, 0 failed

node --check jma-weather.js
git diff --check
# 皆成功
```

## 範圍與交接

- 未修改 `app.js`、`index.html`、`sw.js`、CSS、快取或任何 Supabase 相關檔案。
- 未暫存既有未追蹤的 `final-review.md`。
- Task 2 需在 app 端用 `resolveJmaForecastArea(location)` 取得 endpoint 與內部區碼，再以 `buildJmaForecastUrl(area.forecastAreaCode)` 抓取 JSON，將 `parseJmaForecast(payload, area)` 的成功結果寫入既有快取；失敗時才走 Open-Meteo。

## 已知限制／後續風險

- 目前對應表只含 Task 1 驗收所需的東京、京都、大阪、札幌、福岡。完整 47 都道府縣及北海道／離島的實際 JMA 分區，必須在擴表時逐筆補上官方端點、內部預報區、溫度站與不重疊座標範圍，並新增對應測試，不能以城市名稱模糊比對推測。
- JMA 的溫度區域代碼與預報區代碼不同；新增地區時兩者都必須確認，否則解析器會安全回傳 `null` 並讓後續的 Open-Meteo 備援處理。
