# 交通票券專用欄位 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓交通預訂可儲存完整乘車資訊，並在行程頁清楚顯示出發、抵達、班次與電子票券。

**Architecture:** 保留 `bookings` 陣列與既有附件流程，僅在 `type === "交通"` 時新增 `transport` 巢狀資料。預訂表單以交通專用區塊收集資料；正規化函式確保舊資料能安全讀取；預訂卡與今日快速取用讀取同一份資料顯示。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js 內建測試。

## Global Constraints

- 僅修改 `app.js`、`index.html`、`styles.css` 與 `tests/`。
- 不安裝套件、不改變既有附件儲存流程、不修改使用者既有資料。
- 舊版 booking 未含 `transport` 時必須能正常開啟與編輯。
- 電子票券網址只允許 `http` 或 `https`，檔案票券繼續使用既有圖片／PDF 附件流程。
- 此工作區沒有 Git repository；不可執行 commit 或建立分支。

---

### Task 1: 建立交通專用資料契約測試

**Files:**
- Create: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-details.test.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js`

**Interfaces:**
- Consumes: `normalizeBooking()`、交通預訂表單、`renderBookingMeta()`、`renderQuickTicketCard()`。
- Produces: 檢查交通欄位、資料正規化、行程顯示的 Node 契約測試。

- [ ] **Step 1: 寫入會失敗的測試**

測試應要求：交通表單有 `bookingTransportModeInput`、`bookingTransportCompanyInput`、`bookingTransportNumberInput`、出發／抵達日期時間地點、乘客與座位欄位；`normalizeBooking()` 產出預設完整的 `transport` 物件；預訂卡與快速取用渲染交通路線與班次。

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test tests/transport-ticket-details.test.js`

Expected: FAIL，因為交通專用欄位與 `transport` 資料尚未存在。

- [ ] **Step 3: 不修改產品程式碼，只確認失敗原因為缺少功能**

Expected: 錯誤訊息應指出找不到交通欄位或 `transport` 正規化資料。

### Task 2: 收集、儲存與恢復交通票券資料

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-details.test.js`

**Interfaces:**
- Consumes: 既有 `bookingTypeInput`、`syncBookingStayFields()`、`openBookingDialog()`、`bookingForm` submit handler。
- Produces: `booking.transport = { mode, company, number, departureDate, departureTime, departurePlace, arrivalDate, arrivalTime, arrivalPlace, passengerName, seat }`。

- [ ] **Step 1: 新增最小 HTML 專用欄位**

在交通電子票券區塊前新增 `bookingTransportFields`：交通方式選單、營運商、班次／車次、出發日期時間與站點、抵達日期時間與站點、乘客姓名、座位／車廂。所有欄位在非交通類型時隱藏；只有交通方式必填。

- [ ] **Step 2: 新增預設與正規化**

在 `normalizeBooking()` 中將 `booking.transport` 正規化為上述九個字串欄位；空值使用 `""`，避免舊資料讀取失敗。不可把交通欄位塞進既有 `place` 或 `note`。

- [ ] **Step 3: 連接表單同步、編輯回填與儲存**

`syncBookingStayFields()` 同步 `bookingTransportFields.hidden` 與 required 狀態；`openBookingDialog()` 回填 `booking.transport`；submit handler 在交通類型時收集欄位，非交通類型儲存空的預設 transport 物件。

- [ ] **Step 4: 加入最小樣式**

交通欄位使用現有表單網格與重點區塊樣式；桌面採兩欄，既有手機 media query 改為單欄；不可影響住宿與一般預訂欄位。

- [ ] **Step 5: 執行新增測試確認通過**

Run: `node --test tests/transport-ticket-details.test.js`

Expected: PASS。

### Task 3: 在預訂卡與行程快速取用顯示交通資訊

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-details.test.js`

**Interfaces:**
- Consumes: `booking.transport`、`renderBookingMeta()`、`renderQuickTicketCard()`。
- Produces: 交通卡顯示方式、班次、出發與抵達資訊及電子票券操作。

- [ ] **Step 1: 將交通卡改為專用摘要**

`renderBookingMeta()` 遇到 `booking.type === "交通"` 時顯示交通方式／營運商／班次、出發與抵達的日期時間地點，以及乘客與座位。空欄位不輸出空白標籤。

- [ ] **Step 2: 將快速取用卡改為路線摘要**

`renderQuickTicketCard()` 對交通預訂優先顯示「出發地 → 抵達地」與班次，保留既有「出示票券」連結／附件按鈕與離線提示。

- [ ] **Step 3: 執行全量檢查**

Run: `node --check app.js && node --test tests/*.test.js`

Expected: exit code 0，全部測試通過。

- [ ] **Step 4: UI 瀏覽器驗收**

使用本機伺服器檢查桌面 1280px 與手機 390px：交通欄位不重疊、切換網址／檔案正確、交通卡可見路線／班次與出示按鈕。若瀏覽器執行環境仍缺少執行檔，記錄阻礙原因且停止伺服器。
