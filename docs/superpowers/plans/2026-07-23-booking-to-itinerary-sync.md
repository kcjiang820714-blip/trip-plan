# 預訂自動帶入行程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將適用預訂自動建立／更新為可保留手動介紹的行程卡。

**Architecture:** 行程項目以 `sourceBookingId` 與預訂連結；同步函式只管理預訂來源欄位，手動內容與行程自有附件獨立保存。共用預訂附件在渲染時連結顯示，不複製檔案。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js 內建測試。

## Global Constraints

- 僅修改 `app.js`、`index.html`、`styles.css`、`tests/`。
- 不安裝套件、不改 Supabase、不做 Git 操作。
- 個人票券絕不可同步至行程。
- 刪除預訂時保留行程卡並解除連結。

### Task 1: 新增紅燈同步測試

- Create `tests/booking-itinerary-sync.test.js`。
- 驗證 item 正規化的 `sourceBookingId`、同步函式、適用類型、日期移動、手動內容保留、交通映射、個人票券排除、刪除解除連結。
- 執行 `node --test tests/booking-itinerary-sync.test.js`，確認失敗。

### Task 2: 資料模型與同步函式

- Modify `app.js`。
- 為 item 正規化 `sourceBookingId`、`bookingSourceSummary`；實作適用類型與 booking→item 映射、建立／更新／移動／解除連結。
- 在 booking 儲存及刪除流程呼叫同步；保留手動內容與行程附件。
- 執行專屬測試確認通過。

### Task 3: 行程呈現來源資訊與共用圖片

- Modify `app.js`、`styles.css`。
- 行程詳細卡顯示預訂來源摘要與共用預訂附件；排除 personalTickets。
- 執行 `node --check app.js && node --test tests/*.test.js`。
