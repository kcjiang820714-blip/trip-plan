# 交通票券持有人介面篩選 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓建立者指定交通票券持有人，並讓受邀旅伴只在票券介面看到自己的票券。

**Architecture:** 在既有 `booking` 加入 `ticketHolderUserId` 與 `ticketHolderName`，不改 Supabase schema。表單持有人選項由建立者與 `sharedMembers` 組成；共用交通資訊照常渲染，只有票券預訂卡和今日快速取用依目前登入者過濾。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js 內建測試。

## Global Constraints

- 僅修改 `app.js`、`index.html`、`styles.css` 與 `tests/`。
- 不安裝套件、不執行 Git、不修改 Supabase schema、Storage 或 RLS。
- 這是介面篩選，不可宣稱為嚴格隱私。
- 建立者可看全部票券；旅伴只可看 `ticketHolderUserId === state.cloudUser.id` 的交通票券。
- 未指定持有人的交通票券只顯示給建立者。
- 非交通預訂與共用交通路線資訊不得被篩掉。
- 舊資料未含持有人欄位時必須正常讀取。

---

### Task 1: 新增會失敗的持有人契約測試

**Files:**
- Create: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-holder-filter.test.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/index.html`

**Interfaces:**
- Consumes: `normalizeBooking()`、交通票券表單、`renderBookings()`、`renderQuickTickets()`。
- Produces: 檢查持有人欄位、儲存、選項與畫面篩選的紅燈測試。

- [ ] 寫入測試：要求 `bookingTicketHolderInput`、`ticketHolderUserId`、`ticketHolderName`、建立者與旅伴的下拉選項，以及 `canViewBookingTicket()` 或等價集中篩選函式。
- [ ] 執行 `node --test tests/transport-ticket-holder-filter.test.js`，確認因缺少持有人功能失敗。

### Task 2: 新增持有人選擇與資料保存

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-holder-filter.test.js`

**Interfaces:**
- Produces: `booking.ticketHolderUserId`、`booking.ticketHolderName`；`renderTicketHolderOptions()`。

- [ ] 在電子票券區塊前新增「票券持有人」select，非交通類型隱藏。
- [ ] `normalizeBooking()` 為兩個欄位提供空字串預設；編輯時回填；儲存時只對交通保留值。
- [ ] 建立者選項使用 `trip.ownerId` 或登入帳號，受邀旅伴使用 `sharedMembers.userId`；選項文字包含顯示名稱與 Email。
- [ ] 沒有雲端登入時僅保留建立者選項與清楚提示；不可選不存在的旅伴。
- [ ] 執行專屬測試確認通過。

### Task 3: 依持有人過濾票券畫面

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-ticket-holder-filter.test.js`

**Interfaces:**
- Consumes: `booking.ticketHolderUserId`、`canManageTrip()`、`state.cloudUser`。
- Produces: `canViewBookingTicket(booking, trip)`；建立者持有人標籤與篩選後票券清單。

- [ ] 實作集中判斷：建立者可看全部；受邀旅伴只可看自己的交通票券；未指定只限建立者；非交通一律不受本規則影響。
- [ ] `renderBookings()` 的交通分頁依判斷過濾票券卡；建立者可看到持有人標籤。
- [ ] `renderQuickTickets()` 依相同判斷過濾交通票券；共用交通路線不受影響。
- [ ] 執行 `node --check app.js && node --test tests/*.test.js`，全部通過。
