# Task 3：行程內容展開 UI 驗收報告

## 結果

**BLOCKED**

## 已完成的唯讀檢查

- 未修改 `app.js`、`styles.css`、`index.html`、任何測試檔、既有行程資料或 localStorage。
- 自動測試與 JavaScript 語法檢查均成功。

### 完整命令與輸出

```text
$ node --test tests/itinerary-content-expansion.test.js
✔ 詳細區塊會有條件輸出完整行程內容與備註，且不輸出預設備註 (0.861375ms)
✔ 預覽維持兩行截斷，詳細文字則可正常換行 (0.323ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 46.031708

$ node --check app.js

TEST_EXIT=0
SYNTAX_EXIT=0
```

## 瀏覽器／視覺驗收阻礙

第一次嘗試曾指定 in-app browser，但此選擇不符合本任務（使用者未指定瀏覽器），因此不作為最終阻礙依據。第二次已依 Browser skill 改用 runtime default；工具精確回覆：

```text
No browser is available
```

首次嘗試的原始回覆為 `Browser is not available: iab`。兩次皆只透過 Browser skill 的 browser-client 嘗試連線，未改用外部瀏覽器工具。

因此無法在不改用其他瀏覽器的前提下開啟本機介面，也無法實測下列項目：

- 桌面寬度至少 1280px 的展開畫面
- 手機寬度 390px 的展開畫面
- 點選 `.item-summary` 後的 `aria-expanded=true`
- `.item-details` 移除 `hidden`
- 完整行程內容與備註的換行、裁切、重疊及橫向溢出

## 截圖

未成功產生截圖。未建立下列檔案，避免在沒有實際內建瀏覽器驗證的情況下產生不可靠證據：

- `docs/superpowers/verification/2026-07-21-itinerary-content-expansion-desktop.png`
- `docs/superpowers/verification/2026-07-21-itinerary-content-expansion-mobile.png`

## 伺服器停止證明

由於 in-app browser 在連線前即不可用，未啟動 `python3 -m http.server 4173`；因此沒有需停止的本機 HTTP 伺服器程序。沒有背景伺服器殘留。

## Concerns／下一步

- 程式層級測試已通過，但尚缺少真實桌面與手機畫面的視覺證據。
- 待 in-app browser 可用後，應以既有長文字行程卡片完成展開、收合、再展開，以及 1280px／390px 截圖檢查；全程不可新增或改寫行程資料。
# Task 3：四個既有面板的手機單欄操作

## 完成內容

- 行程：`#itineraryPanel` 在 `@media (max-width: 679px)` 使用單欄 flex 排序；天氣、今日旅程、快速票券會在時間軸前。天氣卡縮短為摘要優先，天氣明細仍沿用原本點擊展開機制。時間軸的 `.item-card` 與 `.item-summary` 最小高度為 48px；既有圖片與長備註仍在預設收合的 `.item-details` 裡。
- 預訂：`.sub-tabs` 改成不換行、可水平滑動；`.booking-card` 改為單欄，`.booking-cover` 在手機為 16:9 橫幅，文字區使用 `min-width: 0` 不會被圖片壓縮。下一筆未來預訂會加上 `is-next-upcoming` 與「下一個預訂」標示，但不改動 `trip.bookings` 的資料或渲染排序。
- 待辦：`.todo-table-row` 變成手機卡片排列，checkbox 為 24px × 24px，列最小高度 48px；期限／數量放在右側，完成狀態同時有 checkbox、文字「完成」、透明度與刪除線，不只靠顏色。
- 記帳：`.expense-settings-grid`、`.expense-dashboard`、`.expense-day-list` 在手機均為單欄。新增支出按鈕置於摘要後方；設定／匯率以較低對比顯示，但仍可操作。支出名稱加入 `overflow-wrap: anywhere`，既有類別、付款人、金額輸出都保留。

## 精確的 responsive selectors

所有以下規則都在 `styles.css` 最後的 `@media (max-width: 679px)`：

- `#itineraryPanel`、`#itineraryPanel .day-header`、`#itineraryPanel .weather-panel`、`#itineraryPanel .travel-day-panel`、`#itineraryPanel .quick-ticket-panel`、`#itineraryPanel .timeline`、`#itineraryPanel .timeline-add-button`
- `.weather-card`、`.weather-location-card`、`.weather-location-summary`、`#itineraryPanel .item-card`、`#itineraryPanel .item-summary`
- `.sub-tabs`、`.sub-tabs::-webkit-scrollbar`、`.sub-tab`
- `.booking-card`、`.booking-card-main`、`.booking-card .booking-cover`、`.booking-card.is-next-upcoming`、`.booking-card-labels`、`.booking-next-upcoming`
- `.todo-table-row`、`.todo-table-head`、`.todo-main-cell`、`.todo-main-cell input`、`.todo-detail-cell`、`.todo-second-cell`、`.todo-third-cell`、`.todo-status-cell`、`.todo-action-cell`、`.todo-table-row.is-done`、`.todo-table-row.is-done .todo-title-stack strong`
- `.expense-settings-grid`、`.expense-dashboard`、`.expense-day-list`、`#expensesPanel .day-header`、`#expensesPanel .expense-add-button`、`#expensesPanel .expense-section:first-of-type`、`.expense-entry-main strong`、`.expense-entry-amount`

桌面保護：`.expense-add-button` 和 `.booking-next-upcoming` 在 media query 外預設 `display: none`，所以 680px 以上既有畫面不新增可見控制項。

## app.js 與結構變更

- 新增 `addExpenseButton` DOM 參考；`renderTripSectionTabs()` 用既有 `canUseCollaborativeTools()` 控制它是否可見，沿用既有 `openExpenseDialog()`，不新增資料寫入或 dialog。
- `renderBookings()` 只根據既有日期／時間判斷第一筆未來預訂，加入純呈現 class `is-next-upcoming` 和標示文字；`trip.bookings` 沒有排序、刪除、移動或修改。
- `index.html` 在記帳摘要後新增 `#addExpenseButton`，其既有點擊事件仍開啟原本的支出 dialog。
- 因為 PWA 快取會保留 CSS／JS，將資產版本更新為 `styles.css?v=102`、`app.js?v=110`，`sw.js` 快取名稱更新為 `trip-notebook-v130`。

## 回歸測試

- 新增 `tests/mobile-panels.test.js`，先驗證失敗，再完成實作；覆蓋手機關鍵 selectors、下一筆預訂標示與摘要後的新增支出入口。
- `node --check app.js`：通過。
- `node --test tests/*.test.js`：71/71 通過。
- `git diff --check`：通過。

## UI 截圖檢查

已嘗試啟動本機預覽並連線可用的瀏覽器，但本機 Browser 服務回覆「No browser is available」，Playwright 則沒有已安裝的瀏覽器執行檔。為避免下載大型瀏覽器、污染開發環境，沒有執行安裝。因此本次沒有可附的 UI 截圖；已以 CSS 回歸測試、完整行為測試與 diff 檢查替代。建議主代理在具備瀏覽器的環境，以 390px、679px、680px 各檢查一次四個分頁。
