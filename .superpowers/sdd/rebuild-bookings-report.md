# 手機預訂頁重做報告

## 結果

- 手機頂部列會依目前 section 顯示頁名；預訂頁顯示「預訂」，旅程名稱保留為次要資訊。
- 下一個預訂不再重用一般卡片，而由 `renderUpcomingBookingFocus()` 獨立渲染。
- 下一筆仍由 `findNextUpcomingBooking()` 從所有可見預訂跨分類挑選真正未過期且最早的項目，不修改原陣列。
- 焦點卡明確顯示日期、時間、起訖地點、服務／班次、訂位代碼，以及票券、共同附件與編輯操作。
- 下方分類清單改由 `renderBookingListCard()` 獨立渲染為手機單欄；共同附件、個人／共同票券與編輯入口仍沿用既有 delegated click handler。
- `normalizeBooking()`、儲存格式、雲端資料、權限判斷、行程同步，以及 itinerary／todo／expense 資料行為皆未修改。

## TDD 證據

### RED

先新增 `tests/mobile-bookings-rebuild.test.js`，執行：

```text
node --test tests/mobile-bookings-rebuild.test.js
```

結果：4 項測試全數失敗。失敗原因分別是缺少動態頂部頁名、獨立焦點卡、共用票券操作渲染器，以及預訂專屬 390px 版面。

### GREEN

完成最小結構後重跑同一測試，結果 4/4 通過。之後更新原本依賴舊 `renderBookings()` 內嵌實作的 source-level 測試，使其改查新的獨立渲染函式，完整測試 82/82 通過。

## 390px Chrome 實際畫面

- 截圖：`mobile-bookings-rebuild-390.png`
- 尺寸：390 × 844
- Chrome：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- 使用隔離 profile：`/tmp/trip-bookings-chrome.DDuLtS`
- 範例資料：瑞士夏日慢旅行，包含交通、景點票券、餐廳與住宿；焦點預訂包含共同電子票券與圖片附件。
- DOM 實測：`innerWidth = 390`、`document.body.scrollWidth = 390`，沒有水平溢出。
- 實際焦點：少女峰登山鐵道（2026-07-24 09:40），證明不是空資料頁。

### view_image 自檢

- 頂部頁名「預訂」與旅程名稱層級清楚。
- 下一個預訂卡與下方一般卡有明顯視覺層級差異。
- 09:40、Interlaken Ost → Jungfraujoch、訂位代碼在第一屏容易辨識。
- 電子票券、共同附件及編輯按鈕皆可見，觸控高度至少 44px。
- 四個分類 chip 維持單列，底部導覽未遮住內容。
- 下方票券卡為單欄，長地點與代碼沒有撐破版面。

## 驗證

```text
node --check app.js
node --test tests/*.test.js
git diff --check
```

- JavaScript 語法檢查：通過。
- 全測試：82/82 通過，0 failed。
- `git diff --check`：通過。
- Chrome console：沒有 JavaScript error；只有既有 `apple-mobile-web-app-capable` deprecated 警告。

## 變更檔案

- `index.html`
- `app.js`
- `styles.css`
- `sw.js`
- `tests/mobile-bookings-rebuild.test.js`
- `tests/booking-multiple-personal-tickets.test.js`
- `tests/mobile-layout.test.js`
- `tests/mobile-panels.test.js`
- `mobile-bookings-rebuild-390.png`
