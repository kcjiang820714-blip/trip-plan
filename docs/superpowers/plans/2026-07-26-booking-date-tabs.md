# 預訂日期小分頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者在「預訂與票券」頁面先選分類、再選該分類實際有資料的日期，避免不同日期的卡片混在同一份清單。

**Architecture:** 新增一個不依賴 DOM 的 `booking-date-tabs.js`，專責把既有可見預訂依分類與既有排程日期轉換為「可選日期、目前選取日期、有日期卡片、日期未定卡片」。`app.js` 只負責保存畫面選取狀態、呼叫純函式、渲染第二層頁籤與卡片；HTML/CSS 僅新增容器與響應式外觀。

**Tech Stack:** 原生 ES Modules、HTML、CSS、Node.js 內建 `node:test`／`assert`、GitHub Pages Service Worker。

## Global Constraints

- 第一層分類與既有資料值維持 `全部`、`票券`、`交通`、`住宿`、`餐廳`，不得重分類任何既有預訂。
- 日期資料只能來自目前使用者可查看的預訂；不可改動 Supabase、同步、私人票券或權限規則。
- 交通用既有出發日優先規則；住宿只用入住日，不因退房日重複。
- 第二層只列出有資料的日期，ISO 日期升冪；日期未定預訂必須保留並獨立顯示。
- 手機兩層頁籤可水平捲動且不折行；桌面可清楚辨識作用中分類與日期。
- 修改 HTML、CSS、JS 時同步提高查詢版本與 Service Worker 快取名稱，禁止強制推送。

---

## File Structure

- Create: `booking-date-tabs.js` — 純日期篩選、選取規則與日期頁籤標記，不讀取 DOM、不寫入資料。
- Create: `tests/booking-date-tabs.test.mjs` — 依分類、日期、住宿、交通、無日期與選取回退的回歸測試。
- Modify: `app.js` — 新增 `activeBookingDate` 暫態畫面狀態、接入純函式、渲染日期小分頁與處理點擊。
- Modify: `index.html` — 在預訂分類與主清單之間加入可存取的日期頁籤容器，更新資產版本。
- Modify: `styles.css` — 第二層日期頁籤的桌面／手機樣式及「日期未定」區塊。
- Modify: `sw.js` — 更新快取名稱與所有修改資產的預快取 URL。

### Task 1: 日期篩選規則模組與單元測試

**Files:**

- Create: `booking-date-tabs.js`
- Create: `tests/booking-date-tabs.test.mjs`

**Interfaces:**

- Produces: `getBookingScheduleDateForTabs(booking)`, `getAvailableBookingDates(bookings)`, `resolveActiveBookingDate(availableDates, activeDate, reset)`, `splitBookingsByDate(bookings, activeDate)`。
- Consumes: 已由 `app.js` 完成權限與分類篩選的預訂陣列；每筆預訂保有既有 `type`、`date`、`transport.departureDate` 欄位。

- [ ] **Step 1: 寫出失敗的日期規則測試**

在 `tests/booking-date-tabs.test.mjs` 建立四筆驗收資料：交通的 `date` 與 `transport.departureDate` 不同、跨日住宿含 `checkoutDate`、同日票券兩筆、以及沒有日期的預訂。測試應要求：

```js
assert.deepEqual(getAvailableBookingDates(bookings), ["2026-07-01", "2026-07-02", "2026-07-03"]);
assert.equal(getBookingScheduleDateForTabs(transport), "2026-07-01");
assert.equal(getBookingScheduleDateForTabs(stay), "2026-07-02");
assert.deepEqual(splitBookingsByDate(bookings, "2026-07-03").scheduled, ticketBookings);
assert.deepEqual(splitBookingsByDate(bookings, "2026-07-03").undated, [undatedBooking]);
```

再測試選取規則：新分類或已失效日期回傳最早可用日期；同分類重繪時仍有效的日期保持不變；沒有可用日期回傳空字串。

- [ ] **Step 2: 執行測試，確認目前會失敗**

Run: `node --test tests/booking-date-tabs.test.mjs`

Expected: FAIL，因 `booking-date-tabs.js` 尚不存在或尚未輸出所需函式。

- [ ] **Step 3: 實作最小純函式**

在 `booking-date-tabs.js` 實作：

```js
export function getBookingScheduleDateForTabs(booking = {}) {
  return booking.type === "交通" ? booking.transport?.departureDate || booking.date || "" : booking.date || "";
}

export function getAvailableBookingDates(bookings = []) {
  return [...new Set(bookings.map(getBookingScheduleDateForTabs).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
}

export function resolveActiveBookingDate(availableDates = [], activeDate = "", reset = false) {
  if (availableDates.length === 0) return "";
  return !reset && availableDates.includes(activeDate) ? activeDate : availableDates[0];
}

export function splitBookingsByDate(bookings = [], activeDate = "") {
  const scheduled = activeDate ? bookings.filter((booking) => getBookingScheduleDateForTabs(booking) === activeDate) : [];
  const undated = bookings.filter((booking) => !getBookingScheduleDateForTabs(booking));
  return { scheduled, undated };
}
```

不讀取 `checkoutDate`，因此住宿只會按入住日列一次；不處理分類或權限，保持規則單一職責。

- [ ] **Step 4: 執行單元測試，確認轉綠**

Run: `node --test tests/booking-date-tabs.test.mjs`

Expected: PASS，交通、住宿、重複日期、未定日期與選取回退皆通過。

- [ ] **Step 5: Commit**

```bash
git add booking-date-tabs.js tests/booking-date-tabs.test.mjs
git commit -m "test: define booking date tab rules"
```

### Task 2: 預訂畫面接入雙層篩選

**Files:**

- Modify: `booking-date-tabs.js`
- Modify: `app.js:1,188,255-260,1163-1174,1193-1203,3287-3323,5385-5402,6891-6897`
- Modify: `index.html:230-242`
- Test: `tests/booking-date-tabs.test.mjs`

**Interfaces:**

- Consumes: Task 1 的四個純函式與既有 `getBookingGroup()`、`canViewBookingTicket()`。
- Produces: `state.activeBookingDate`、`#bookingDateTabs` 的可操作日期按鈕、與日期一致的主卡片清單。

- [ ] **Step 1: 先寫日期頁籤標記的失敗測試**

擴充 `tests/booking-date-tabs.test.mjs`，要求尚不存在的 `renderBookingDateTabs()` 輸出可存取、可點選的日期按鈕：

```js
const markup = renderBookingDateTabs(["2026-07-01", "2026-07-02"], "2026-07-02");
assert.match(markup, /data-booking-date="2026-07-01"/);
assert.match(markup, />7\/2（週四）</);
assert.match(markup, /data-booking-date="2026-07-02"[^>]*aria-pressed="true"/);
```

同時保留依分類篩好的兩組資料，要求「全部」資料可產生所有日期、個別分類只產生自己的日期，且 `splitBookingsByDate()` 的 `scheduled.length` 等於目前日期清單卡片數。

- [ ] **Step 2: 執行測試，確認紅燈**

Run: `node --test tests/booking-date-tabs.test.mjs`

Expected: FAIL，因 `renderBookingDateTabs` 尚未輸出。

- [ ] **Step 3: 在畫面加上狀態、容器與事件**

1. 在 `booking-date-tabs.js` 新增 `renderBookingDateTabs(availableDates, activeDate)`：以 UTC 日期標籤輸出 `data-booking-date`、`aria-pressed` 和作用中 class 的按鈕字串；它只根據傳入資料產生標記，不能讀取 DOM 或 state。
2. 在 `app.js` 匯入 `booking-date-tabs.js?v=1` 的所有規則與 renderer，並在 state 新增 `activeBookingDate: ""`。
3. 在 view state 的 capture／restore 與 `showTrip()` 選項中攜帶 `activeBookingDate`，僅作本機工作階段畫面還原。
4. 在 `index.html` 的 `bookingSubTabs` 下新增：

```html
<nav class="booking-date-tabs" id="bookingDateTabs" aria-label="預訂日期" hidden></nav>
```

5. 在 `renderBookings()` 先保留既有 `visibleBookings` 權限篩選，再套用既有 `activeBookingGroup`；以 `getAvailableBookingDates()` 取得日期，使用 `resolveActiveBookingDate()` 決定 state，最後以 `splitBookingsByDate()` 取得 `scheduled` 和 `undated`。
6. 只用 `scheduled` 渲染主要日期清單；有 `undated` 時在其後加上標題「日期未定」的獨立卡片區塊；無任何預訂時保留既有空狀態。
7. `bookingDateTabs` 只有 `availableDates.length > 0` 時顯示，內容來自 `renderBookingDateTabs()`。
8. 分類 click handler 先設 `state.activeBookingGroup`，再清空 `state.activeBookingDate` 後重繪，確保選取該分類最早日期；日期 click handler 只設日期後重繪並保存 view state。

- [ ] **Step 4: 執行自動檢查**

Run:

```bash
node --test tests/booking-date-tabs.test.mjs
node --test tests/ui-presentation.test.mjs
node --check app.js
node --check booking-date-tabs.js
git diff --check
```

Expected: 全數 PASS，且 app.js 語法無錯。

- [ ] **Step 5: Commit**

```bash
git add app.js index.html booking-date-tabs.js tests/booking-date-tabs.test.mjs
git commit -m "feat: filter bookings by category date"
```

### Task 3: 響應式樣式、快取與畫面驗收

**Files:**

- Modify: `styles.css`（新增 `.booking-date-tabs`、`.booking-date-tab`、`.booking-undated-section`）
- Modify: `index.html`（提高 CSS 與 app query version）
- Modify: `app.js`（提高 booking-date-tabs query version）
- Modify: `sw.js`（提高快取名稱與同步資產版本）
- Test: `tests/booking-date-tabs.test.mjs`, `tests/ui-presentation.test.mjs`

**Interfaces:**

- Consumes: Task 2 產生的 `#bookingDateTabs`、`data-booking-date` 與日期未定區塊 class。
- Produces: 手機和桌面皆可辨識、可操作且能更新的雙層頁籤 PWA。

- [ ] **Step 1: 撰寫驗收清單與快取斷言**

在 `tests/booking-date-tabs.test.mjs` 加入純函式邊界測試：空分類得到 `[]` 與空選取日期；只有未定資料時日期清單為 `[]`、`undated` 仍含該筆。以手動驗收清單覆蓋：手機 390px 和桌面 1280px、五個分類、日期排序、住宿一次、未定區塊、無資料空狀態。

- [ ] **Step 2: 執行測試，確認現有程式在新增邊界前失敗**

Run: `node --test tests/booking-date-tabs.test.mjs`

Expected: 若邊界函式或行為尚未完整處理，FAIL；補齊前不可進行發布。

- [ ] **Step 3: 加入樣式與完整 PWA 版本更新**

1. 日期頁籤採 `display:flex; overflow-x:auto; white-space:nowrap;`，手機可滑動、桌面不與分類頁籤混淆。
2. 使用 `.is-active` 的日期啟用樣式，且不覆寫第一層分類頁籤。
3. 日期未定區塊使用清楚標題與間距，維持既有預訂卡片樣式。
4. 同步提高 `index.html` 的 `styles.css`、`app.js` 版本；提高 app.js 的 `booking-date-tabs.js` 版本；在 `sw.js` 同步相同 URL 和新的 `trip-notebook-v*` cache name。

- [ ] **Step 4: 執行完整驗證與視覺檢查**

Run:

```bash
node --test tests/booking-date-tabs.test.mjs
node --test tests/ui-presentation.test.mjs
node --check app.js
node --check booking-date-tabs.js
node --check sw.js
git diff --check
```

再用本機伺服器以 390px 與 1280px 檢查：日期小分頁僅列有資料日期、切換分類回到最早日期、點日期只顯示當日卡片、日期未定卡片存在、所有頁籤文字完整、console 沒有 error。

Expected: 兩組測試皆 PASS、三個 syntax check PASS、diff check PASS；兩種螢幕寬度擷圖符合驗收清單。

- [ ] **Step 5: Commit**

```bash
git add styles.css index.html app.js sw.js tests/booking-date-tabs.test.mjs booking-date-tabs.js
git commit -m "style: polish booking date tabs"
```

## Plan Self-Review

- 規格覆蓋：Task 1 處理日期來源、排序、住宿與未定資料；Task 2 處理可見性後篩選、分類切換、日期切換與 view state；Task 3 處理手機／桌面、空狀態、快取與發布驗收。
- 介面一致性：所有任務使用相同的 `activeBookingDate`、`getAvailableBookingDates`、`resolveActiveBookingDate` 與 `splitBookingsByDate` 名稱；分類與權限均留在 `app.js` 的既有流程。
- 範圍檢查：不涉及資料庫、同步、權限與資料結構；新增模組只做純畫面計算。
- Placeholder scan：本文件沒有 TBD、TODO、未定義函式名稱或「稍後處理」描述。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-26-booking-date-tabs.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
