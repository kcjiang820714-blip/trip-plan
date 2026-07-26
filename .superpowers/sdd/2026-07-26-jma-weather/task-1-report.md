# Task 1 Report — JMA 區域與預報解析模組

## 完成內容

- 新增 `jma-weather.js` 純 ES module；不讀取 DOM、app state、trip，也不執行 `fetch`。
- 提供 `isJapanLocation`、`resolveJmaForecastArea`、`buildJmaForecastUrl`、`parseJmaForecast`、`mapJmaWeatherToWmo`。
- 已由 JMA 官方 `area.json`（2026-07-27 取得）建立 56 個實際可請求的 forecast endpoint 與 142 個 class10 預報拆分區的 `JMA_OFFICE_FORECAST_AREAS`；追溯 fixture 在 `tests/fixtures/jma-official-area-source-2026-07-27.json`。
- 已逐一以 `curl` 實測 56 個 `https://www.jma.go.jp/bosai/forecast/data/forecast/<code>.json` URL，全部 HTTP 200。`014030`（十勝）改由 `014100` 端點提供，`460040`（奄美）改由 `460100` 端點提供；兩者不再作為 URL。
- `JMA_CLASS10_FORECAST_AREAS` 為完整 142 區的可保存精確對應。位置只有 `jmaAreaCode` 時仍可取得正確端點／class10；沒有可靠溫度站碼時，解析器維持溫度 `null`，不改用其他城市站資料猜測。
- 新增 `jma-municipality-areas.js`：從同一份官方資料擷取 1,805 筆 class20 市町村名稱、英文名稱與 class10 代碼。新地點的名稱若唯一命中，就直接取得正確 JMA endpoint／class10，不需要事先保存 `jmaAreaCode`。
- app 儲存的 `"Municipality, Prefecture, Japan"` 格式會先取第一段完整市町村名稱判定，再處理短別名；含 City／Town／Village 後綴的同名地點沒有唯一官方對應時安全回傳 `null`。
- 完整市町村名稱與「去除 City／Town／Village 的短名稱」使用不同索引。含都道府縣／國家資訊的 app 地點會依序檢查所有完整前綴，因此市內分區、括號區域（例如 `Sasebo City (Uku Area), Nagasaki, Japan`）不會被 `Nagasaki` 等短別名誤配；單獨的 `Yamagata`、`Yokohama` 仍可使用已確認城市別名。
- 帶 app 上下文的短城市別名必須與 `admin1` 都道府縣一致；若已知的小範圍座標也指向不同城市，安全回傳 `null`。這避免 `Fukushima, Hokkaido, Japan`、`Tokyo, Hokkaido, Japan`、`Otsu, Ehime, Japan` 等矛盾資料被錯配。支援英文 `Prefecture` 與日文 `都／道／府／県` 後綴。
- 完整但精簡的官方 class10／class15／class20 階層（142／375／1,805）保存於 `tests/fixtures/jma-area-hierarchy-2026-07-27.json`，含來源 URL 與取得日。
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
# 18 passed, 0 failed

node --test
# 45 passed, 0 failed

node --check jma-weather.js
git diff --check
# 皆成功
```

## 範圍與交接

- 未修改 `app.js`、`index.html`、`sw.js`、CSS、快取或任何 Supabase 相關檔案。
- 未暫存既有未追蹤的 `final-review.md`。
- 已以官方 class20/class15/class10 階層取得每筆正確都道府縣，稽核 1,805 筆市町村 × 日文／英文兩種 `"名稱, 正確都道府縣, Japan"` app 形狀（3,610 筆）；所有可解析結果皆為正確 class10，模糊名稱仍安全回傳 `null`。
- Task 2 需在 app 端用 `resolveJmaForecastArea(location)` 取得 endpoint 與內部區碼，再以 `buildJmaForecastUrl(area.forecastAreaCode)` 抓取 JSON，將 `parseJmaForecast(payload, area)` 的成功結果寫入既有快取；失敗時才走 Open-Meteo。

## 已知限制／後續風險

- JMA 的預報邊界不是簡單矩形。這個純前端版本以完整市町村名稱（或保存的 `jmaAreaCode`）判定新地點，並只為已確認城市／島嶼保留小型、不重疊的座標範圍。沒有名稱或名稱同時指向多個 class10 的座標會安全 fallback；不得以都道府縣名稱或大範圍矩形猜測子區。
- JMA 的溫度區域代碼與預報區代碼不同；新增城市時兩者都必須以該端點官方 JSON 確認，並新增對應測試。
