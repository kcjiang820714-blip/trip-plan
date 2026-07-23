# 一筆預訂多張個人票券 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓一筆共同預訂可建立多張個人票券，並依持有人分別顯示與出示。

**Architecture:** `booking.personalTickets` 保存每張票券的持有人、網址與附件。既有單張 ticket URL／附件在正規化時升級為一張個人票券；交通、景點票券、活動共用票券列編輯器與篩選顯示。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js 內建測試。

## Global Constraints

- 僅修改 `app.js`、`index.html`、`styles.css` 與 `tests/`。
- 不安裝套件、不做 Git 操作、不改 Supabase。
- 介面篩選不是嚴格資料隔離。
- 非票券類預訂（餐廳、住宿）必須維持既有附件流程。
- 舊單張票券必須可讀取與開啟，不可重複顯示。

---

### Task 1: 建立多張票券紅燈測試

**Files:**
- Create: `/Users/kcjiang/Documents/旅遊行程app/tests/booking-multiple-personal-tickets.test.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/index.html`

**Interfaces:**
- Consumes: `normalizeBooking()`、booking form、`renderBookings()`、`renderQuickTicketCard()`。
- Produces: personalTickets 資料與顯示行為的紅燈測試。

- [ ] 建立測試，要求 `personalTickets` 正規化、舊單張票券遷移、個人票券編輯器、每張持有人與網址／附件、依持有人篩選。
- [ ] 執行 `node --test tests/booking-multiple-personal-tickets.test.js`，確認 RED。

### Task 2: 個人票券資料與表單編輯器

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/booking-multiple-personal-tickets.test.js`

**Interfaces:**
- Produces: `booking.personalTickets`、`renderPersonalTicketEditors()`、`collectPersonalTickets()`。

- [ ] 正規化 personalTickets，並將舊單張交通票券升級為一張個人票券。
- [ ] 在交通、景點票券、活動的表單顯示可新增／移除的個人票券列。
- [ ] 每列可選持有人與連結／檔案；檔案限圖片／PDF。
- [ ] 建立者在同一次儲存可新增多張票券；非票券類保留原附件輸入。
- [ ] 執行專屬測試確認通過。

### Task 3: 個人票券顯示、快速取用與相容

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/booking-multiple-personal-tickets.test.js`

**Interfaces:**
- Consumes: `booking.personalTickets`、現有持有人篩選。
- Produces: 每張票券獨立出示，建立者看全部、旅伴看自己。

- [ ] 預訂卡與快速取用以個人票券陣列渲染，建立者標示持有人。
- [ ] 同一預訂的共同路線與時間只渲染一份；其他旅伴票券不渲染。
- [ ] 維持舊 ticket URL／附件作為後備資料，直到新資料儲存後不再重複顯示。
- [ ] 執行 `node --check app.js && node --test tests/*.test.js`，全部通過。
