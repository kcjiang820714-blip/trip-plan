# Task 3：四個既有面板的手機單欄操作

## 完成內容

- 行程：`#itineraryPanel` 在 `@media (max-width: 679px)` 使用單欄 flex 排序；天氣、今日旅程、快速票券會在時間軸前。時間軸卡片維持至少 48px，圖片與長備註仍在預設收合區。
- 預訂：分類 tabs 可水平滑動；卡片在手機為單欄、封面為 16:9。`#bookingNextUpcoming` 位於分類 tabs 前，會從所有目前使用者可見的預訂跨分類挑選最早且未過期的一筆。分類清單維持 `trip.bookings` 原始順序，未排序或改寫資料。
- 待辦：手機版移除 `.todo-table` 共用外框並加入列間距；每個非 header row 各自有背景、邊框、圓角與陰影。checkbox 為 24px × 24px，完成狀態同時有文字、透明度與刪除線。680px 以上規則不受影響。
- 記帳：設定、摘要與每日明細在手機為單欄；新增支出入口位於摘要後方，既有 dialog 與資料行為不變。

## 預訂下一筆規則

- `findNextUpcomingBooking()` 是純選擇函式，以既有日期／時間資料比較，不呼叫 `sort()`，不更動輸入陣列。
- `renderBookings()` 先以 `canViewBookingTicket()` 篩出所有可見預訂，再跨分類選出下一筆；分類篩選只用於下方分類清單。
- 早於現在的日期或同日較早時間不會被選中；正好等於目前分鐘仍視為當前可用。
- 沒有時間的日期型預訂以當日 `23:59` 比較，沒有日期的預訂不列入下一筆。
- 焦點卡沿用分類卡相同的票券、附件與編輯事件處理。

## 手機 responsive selectors

- 預訂：`.booking-next-focus`、`.booking-card`、`.booking-card-main`、`.booking-card .booking-cover`、`.booking-card.is-next-upcoming`、`.booking-card-labels`、`.booking-next-upcoming`
- 待辦：`.todo-table`、`.todo-table-row:not(.todo-table-head)`、`.todo-table-row`、`.todo-table-head`、`.todo-main-cell input` 與既有各欄位 selectors
- 以上新增規則都位於 `@media (max-width: 679px)`；`.booking-next-focus` 在 media query 外預設隱藏。

## 測試

- `tests/mobile-panels.test.js` 新增跨分類、排除過期、同日時間、陣列順序不變，以及手機待辦獨立卡片規則。
- `node --check app.js`：通過。
- `node --test tests/*.test.js`：73/73 通過。
- `git diff --check`：通過。

## UI 驗證限制

先前環境無可用 Browser 服務或 Playwright 瀏覽器執行檔，因此本 task 沒有新增 UI 截圖。自動測試已保護 679px 以下規則與 680px 以上隔離；仍建議主代理在可用瀏覽器環境以 390px、679px、680px 做最終畫面檢查。
