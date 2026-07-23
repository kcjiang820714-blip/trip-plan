# 手機行程總覽重做報告

## 結果

DONE

已把「手機行程總覽」從舊桌機卡片的 CSS 排序，改成資料驅動的手機資訊架構。預訂、待辦、記帳面板及其資料結構未改動。

## 根因

上一輪 implementation plan 明確限制：

- HTML 只調整底部導覽與 PDF 入口。
- JavaScript 的資料渲染函式不改寫。
- 行程頁先以 CSS `order` 完成焦點排序。

因此上一輪只能把既有「天氣大卡、今日旅程摘要大卡、票券、完整時間軸」重新排序，無法建立示意圖要求的「日期抬頭、下一個行程焦點卡、其餘時間軸」層級。這是資訊架構沒有落地，不是間距或色彩不夠精準。

## 本次實作

### 行程總覽

- app bar 改為 56px 左右的緊湊三區結構：返回、旅程名稱、更多／編輯。
- Day 列改為輸出旅程全部日期，原生橫向滑動；目前日期有 `aria-current="date"`。
- 日期抬頭顯示 Day、日期、城市區段、當日標題與剩餘行程摘要。
- 天氣改為抬頭旁的膠囊 chip；點擊可展開或收合既有完整天氣卡，更新天氣操作仍保留。
- 新增純選擇器 `selectItineraryFocus()`：
  - 今天優先選現在時間之後的第一筆。
  - 今天沒有後續時保留目前／最後一筆。
  - 非今天的日期選第一筆。
  - 不排序、不改寫原行程陣列。
- 下一個行程改為明確的深綠焦點卡，保留導航與「查看詳情」。
- 焦點項目預設不在下方重複；按「查看詳情」後會在時間軸中展開，沿用既有附件、票券來源、地圖與編輯操作。
- 其餘行程改為清楚的垂直時間軸卡片。
- Day 交換功能保留，收進「調整 Day 順序」摺疊入口，避免搶占第一屏。
- 底部維持四個主功能「行程、預訂、待辦、記帳」及中央新增入口，並補上圖示層級。

### PWA 快取

- `index.html` 的 CSS／JS 版本更新為 `styles.css?v=104`、`app.js?v=112`。
- `sw.js` 同步更新預快取版本與 cache name，避免安裝版繼續載入舊 UI。

## TDD 證據

新增 `tests/mobile-itinerary-structure.test.js`，先建立 5 項測試：

1. 緊湊 app bar、日期天氣抬頭、焦點區 DOM。
2. 橫滑 Day 列輸出全部日期。
3. 今天優先選下一筆且不改寫陣列。
4. 今天沒有後續時保留目前行程。
5. 手機焦點卡與垂直時間軸 CSS。

RED：

```text
node --test tests/mobile-itinerary-structure.test.js
tests 5
pass 0
fail 5
```

失敗原因符合預期：舊 DOM 沒有新結構，`renderScrollableDayTabs` 與 `selectItineraryFocus` 尚不存在，CSS 仍是舊排序。

GREEN：

```text
node --check app.js
node --test tests/*.test.js
tests 78
pass 78
fail 0
```

另執行 `git diff --check`，結束碼 0。

## 390px 實際瀏覽器驗證

使用：

- Chrome headless。
- 獨立暫存 profile：`/tmp/trip-app-chrome.dZWgmA`。
- 390 × 844 viewport。
- 只在該暫存 profile 的 localStorage 寫入「京都慢旅五日」範例資料。
- sessionStorage 指定開啟 Day 2 行程頁。
- 未讀寫使用者日常 Chrome profile 或既有 app 資料。

截圖：

`/Users/kcjiang/Documents/旅遊行程app/mobile-itinerary-rebuild-390-v2.png`

自檢結果：

- viewport：390px。
- `document.documentElement.scrollWidth`：390px，無水平溢出。
- app bar、5 天橫滑列、Day／日期／城市、天氣 chip、焦點卡、其餘時間軸、固定底部導覽均可見。
- 焦點卡顯示資料為「清水寺」，不是寫死示意文字。
- 底部導覽有 4 個 `data-trip-section` 主功能。
- `view_image` 檢查後發現天氣 chip 被舊 CSS 撐成大圓形；已調整 selector specificity、改為 40px 高 chip 後重新截圖確認。

實際互動 smoke test：

- 點 Day 3：作用中日期改為 `2`（0-based index），標題更新為「嵐山小旅行」，焦點更新為「竹林小徑」。
- 點天氣 chip：`weatherPanel.hidden` 由 `true` 變 `false`，`aria-expanded` 同步為 `true`；再點一次正確收合。
- 點焦點卡「查看詳情」：對應行程 `aria-expanded="true"`，詳細區 `hidden=false`。
- smoke test 後頁面寬度仍為 390px。

Console：

- 無 `Runtime.exceptionThrown` 或 JavaScript error。
- Chrome 回報既有 `apple-mobile-web-app-capable` deprecated warning；本次沒有新增執行錯誤。

## 修改檔案

- `index.html`
- `app.js`
- `styles.css`
- `sw.js`
- `tests/mobile-itinerary-structure.test.js`
- `tests/mobile-navigation.test.js`
- `tests/mobile-panels.test.js`
- `tests/itinerary-content-expansion.test.js`
- `tests/booking-itinerary-sync.test.js`
- `.superpowers/sdd/rebuild-itinerary-report.md`
- `mobile-itinerary-rebuild-390-v2.png`

## 風險與範圍確認

- 沒有變更旅程、預訂、待辦、支出、同步或附件資料格式。
- 沒有修改預訂、待辦、記帳面板 DOM。
- 既有行程卡 delegated click、附件、共同預訂附件、地圖與編輯流程保留。
- 天氣完整內容沒有刪除，只改成 chip 控制的收合內容。
- 目前唯一非阻塞事項是 Chrome 對既有 PWA meta 的 deprecated warning；不影響本次行程頁功能。
