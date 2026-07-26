# 日本氣象廳天氣資料設計

## 目的與邊界

日本地點更新天氣時，優先使用日本氣象廳（JMA）官方公開、可機讀的府縣天氣預報 JSON；其他國家維持既有 Open-Meteo。既有畫面繼續顯示天氣、最高／最低溫、降雨機率與實際資料來源。

- JMA 資料只取自官方端點 `https://www.jma.go.jp/bosai/forecast/data/forecast/<預報區碼>.json`，格式依 [JMA 資料利用指南](https://www.data.jma.go.jp/developer/weatherdataguide/appendix/2-1-c.html)；不爬 HTML、不用非官方網站。
- 不修改 Supabase、RLS、共享權限、旅程內容或匯入／匯出格式；不新增 API key、伺服器、Proxy 或資料庫。
- JMA 是區域預報，不假裝成城市座標的觀測值。JMA 未提供的逐時資料、風速或日期不可猜測補值。
- JMA 端點可能遭 CORS、網路或格式變化影響；這些都是可預期的安全回退情境。

## 資料與模組設計

保留 `trip.weatherLocations[YYYY-MM-DD]` 和 `trip.weatherForecasts[locationId]`。成功結果維持既有 `daily`／`hourly` 格式，僅可選擴充來源資訊，因此舊快取仍可讀取：

```js
{
  fetchedAt: "2026-07-26T08:00:00.000Z",
  source: "日本氣象廳", // 或 Open-Meteo／Open-Meteo MeteoSwiss
  sourceDetail: "JMA 130000（東京都）", // 可選
  fallbackReason: "jma-cors", // 只在改用 Open-Meteo 時可選
  daily: {
    time: ["2026-07-26"], weather_code: [3],
    temperature_2m_max: [31], temperature_2m_min: [25],
    precipitation_probability_max: [40], wind_speed_10m_max: [null]
  },
  hourly: { time: [] }
}
```

新增 `jma-weather.js`，只放純函式與靜態對應表，不可讀 DOM、`state`、`trip` 或執行 `fetch`：

```js
isJapanLocation(location)
resolveJmaForecastArea(location)
buildJmaForecastUrl(forecastAreaCode)
parseJmaForecast(payload, { forecastAreaCode, targetTimezone: "Asia/Tokyo" })
mapJmaWeatherToWmo(value)
```

`app.js` 只負責呼叫這些函式、抓取、回退、寫入既有快取和重繪。所有 JMA 解析、日期處理、天氣嚴重度與來源摘要皆可獨立單元測試。

## 日本地點與預報區對應

以 `weatherLocation.countryCode === "JP"` 判定日本。既有東京、京都、大阪、札幌補上 `countryCode: "JP"`；搜尋結果沿用現有地理編碼國碼。新增版本控制的 `JMA_FORECAST_AREAS`，初版完整收錄 47 都道府縣及 JMA 實際拆分的預報區（北海道、東京都島嶼、沖繩離島等），每筆包含官方預報區碼、名稱、別名與不重疊的座標範圍：

```js
{ forecastAreaCode: "130000", prefecture: "東京都",
  aliases: ["東京", "Tokyo", "東京都"],
  admin1Aliases: ["Tokyo", "東京都"],
  bounds: { minLat: 35.4, maxLat: 35.9, minLon: 138.9, maxLon: 139.95 } }
```

對應順序：非 JP 不查 JMA；JP 先用未來可選的已保存區碼；再以 `admin1`、`country`、`group`、`name` 的正規化文字精確比對；文字沒有唯一結果才用座標範圍。無結果或多重命中回傳 `unmapped`／`ambiguous`，不呼叫 JMA，直接回退 Open-Meteo。正規化須 Unicode 正規化、空白折疊、大小寫不敏感；不可用城市名稱的模糊包含比對。對應表每次修改均需測試與官方區碼來源註記。

## 抓取、解析與日期規則

```text
更新每個地點
  → 非 JP：Open-Meteo（既有流程）
  → JP 且唯一區碼：JMA JSON → 成功則 source = 日本氣象廳
  → JP 無區碼或 JMA 失敗：Open-Meteo → source = 實際成功來源
  → 兩者失敗：不覆蓋上次成功快取
```

JMA／Open-Meteo 都以 `AbortController` 設 10 秒逾時。每個地點獨立處理；JMA 成功時不可請求 Open-Meteo；JMA 成功以外的回退最多請求一次 Open-Meteo。

`parseJmaForecast` 必須先驗證官方 JSON 是陣列，且存在所需 `timeSeries`、`timeDefines` 與唯一區域；失敗只回傳 `invalid-payload`、`area-not-found` 或 `date-unavailable`，不能拋出未處理例外。規則如下：

1. 以 JMA `timeDefines` 在 `Asia/Tokyo` 轉為 `YYYY-MM-DD`；不可用裝置時區或 `new Date("YYYY-MM-DD")` 的 UTC 切日行為。
2. 以官方 `area.code` 選取區域，名稱僅作核對；找不到唯一區域即失敗。
3. 天氣碼／文字映射為現有 WMO 相容 `weather_code`。同日多時段依序選雷雨、雪、雨、霧、多雲、晴；未知值為 `null`，不得預設晴。
4. 最高／最低溫依同日官方序列取值；降雨機率採該日可用時段的最大值。`--`、空值與未發布值均為 `null`，不填 0。
5. JMA 沒有可可靠對齊的逐時資料時輸出 `hourly: { time: [] }`；目標日期未提供即 `date-unavailable`，改用 Open-Meteo 嘗試。

`fetchedAt` 維持 ISO UTC 儲存，既有台灣格式顯示；日本行程日固定 JST，其他國家保留 Open-Meteo `timezone=auto` 行為。

## 回退與介面

| 情況 | 行為 | 最終標示 |
| --- | --- | --- |
| 非日本 | 只抓 Open-Meteo | `Open-Meteo` 或既有 MeteoSwiss 名稱 |
| JP 無唯一對應 | 改抓 Open-Meteo | `Open-Meteo`；提示未對應 JMA 預報區 |
| JMA HTTP、逾時、網路、CORS、格式、區域或日期失敗 | 改抓 Open-Meteo 一次 | 成功顯示 `Open-Meteo`；提示 JMA 暫時無法取得 |
| JMA 成功 | 不抓 Open-Meteo | `日本氣象廳` |
| JMA 與 Open-Meteo 都失敗 | 保留舊快取；無快取則空狀態 | 舊來源不變；提示更新失敗 |

來源由每筆實際成功快取的 `source` 決定：全 JMA 顯示「日本氣象廳」、全同一 Open-Meteo 顯示該名稱、混合則顯示「日本氣象廳、Open-Meteo」。展開卡的上次更新行也要顯示該筆實際來源；JMA 回退成功不可仍寫成日本氣象廳。JMA 無逐時資料時保留整日天氣、高低溫與雨機率，但隱藏上午／下午／晚上列；風速缺值顯示 `--`。完成更新後用一則非技術摘要說明回退／失敗，例如「2 個地點已更新，其中 1 個改用 Open-Meteo」。

## 測試與驗收

新增 `tests/jma-weather.test.mjs`，使用儲存的最小官方 JSON fixture，單元測試不得連線。覆蓋：

- 東京、京都、大阪、札幌及每都道府縣／離島代表位置能唯一對應；非 JP、同名、邊界外與多重命中不會誤發 JMA 請求。
- JMA fixture 正確產出日期、天氣碼、高低溫與最大降雨機率；空值、`--`、未知碼和缺逐時資料皆如實處理。
- JST 午夜、帶時區的發報時間及不同裝置時區均得出相同日本日期；錯誤 payload、區碼不符、序列長度不一致都受控失敗。
- 以 stubbed fetch 驗證 JMA 成功不呼叫 Open-Meteo，無對應／CORS／逾時／HTTP／解析失敗才回退一次；雙失敗保留舊快取。
- 舊 `weatherForecasts` 可讀，新來源欄位會保留，來源摘要與每張卡如實反映 JMA、Open-Meteo 與混合結果。

手動在桌面與手機檢查：東京成功顯示「日本氣象廳」與三項主要數據；阻擋 JMA 時誠實顯示 Open-Meteo；非日本和瑞士 MeteoSwiss 行為不變；無逐時資料無空白版面；雙失敗不清空舊資料；console 無未處理錯誤。

## PWA 發布

實作會更新 `app.js`、新增 `jma-weather.js`，必要時更新 CSS、HTML、`sw.js`。同一次發布要將新模組加入 `sw.js` 的 `APP_ASSETS`，同步遞增 `index.html` 的 app／CSS 查詢版本、`sw.js` 的資產版本及 `CACHE_NAME`。以本機靜態伺服器與 GitHub Pages 確認新 Service Worker、離線新版殼層，以及舊快取／舊旅程的相容性。

## 驗收條件

1. 可唯一對應的 JP 地點成功時只使用並顯示日本氣象廳。
2. 無法對應或 JMA 任一取得／解析失敗時安全回退 Open-Meteo，且來源如實顯示。
3. JMA 資料在現有介面提供天氣、高低溫、降雨機率；未提供的值不杜撰。
4. 雙失敗保留上次成功資料；非日本、瑞士、Supabase、RLS、旅程格式與權限均不回歸。
5. 純函式、回退與 PWA 更新皆有上述測試與手動驗收。

## 規格自我檢查

本規格沒有待定決策或占位字。JMA 優先與實際來源標示一致：唯一對應且 JMA 成功時不查 Open-Meteo，其他情況只顯示最後成功來源；JMA 的區域性與缺值也不會被偽裝成精確逐時預報。
