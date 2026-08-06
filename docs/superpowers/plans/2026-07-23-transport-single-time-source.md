# 交通單一時間來源 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除交通預訂與交通行程的重複時間輸入，並以單一出發時間驅動顯示與排序。

**Architecture:** 交通預訂以 `booking.date`/`booking.time` 為唯一出發時間輸入，保存時同步至 `transport.departureDate`/`departureTime`。交通行程以第一段 `transportSegments[0].departureTime` 為唯一表單輸入，保存時同步至 `item.time`。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js 內建測試。

## Global Constraints

- 僅修改 `app.js`、`index.html`、`styles.css` 與 `tests/`。
- 不安裝套件、不做 Git 操作、不改 Supabase。
- 非交通預訂與非交通行程不可改變。
- 舊資料的時間必須保留並在編輯時回填。
- 交通預訂的新資料須保持 `booking.date/time` 與 `transport.departureDate/time` 一致。

---

### Task 1: 建立單一時間來源紅燈測試

**Files:**
- Create: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-single-time-source.test.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/index.html`

**Interfaces:**
- Consumes: `syncBookingStayFields()`、`openBookingDialog()`、booking submit handler、`openItemDialog()`、item submit handler。
- Produces: 檢查重複欄位移除、標籤切換、時間同步與舊資料回填的測試。

- [ ] 新增測試，要求交通預訂沒有 `bookingDepartureDateInput`/`bookingDepartureTimeInput`，且上方標籤切換為出發日期／時間；要求交通行程隱藏通用時間並從第一段出發時間同步 `item.time`。
- [ ] 執行 `node --test tests/transport-single-time-source.test.js`，確認因舊欄位與缺少同步而失敗。

### Task 2: 簡化交通預訂表單與保存

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-single-time-source.test.js`

**Interfaces:**
- Produces: `syncBookingStayFields()` 交通標籤與 `transport.departureDate/time` 同步保存。

- [ ] 移除交通專用區塊的出發日期／時間輸入與 JavaScript DOM 參考。
- [ ] 交通類型時將上方日期／時間標籤改為出發日期／出發時間，隱藏通用地點欄位；非交通恢復原樣。
- [ ] 開啟舊交通預訂時，若 `booking.date/time` 空白，回填 `transport.departureDate/time`。
- [ ] 儲存交通預訂時以 `bookingDateInput`/`bookingTimeInput` 同步寫入 transport 出發欄位。
- [ ] 執行專屬測試確認通過。

### Task 3: 簡化交通行程時間與相容回填

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/transport-single-time-source.test.js`

**Interfaces:**
- Produces: `syncTransportFields()` 的通用時間顯示規則與交通 item 的 `item.time` 同步。

- [ ] 交通類型時隱藏通用上方時間欄位及其 required 狀態；切回非交通時恢復。
- [ ] 開啟舊交通行程時，第一段缺少出發時間則以 `item.time` 回填。
- [ ] 儲存交通行程時將第一段出發時間寫入 `item.time`，供時間軸排序與既有畫面使用。
- [ ] 執行 `node --check app.js && node --test tests/*.test.js`，全部通過。
