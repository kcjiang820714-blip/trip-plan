# 8 張參考圖精準對齊 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改變資料與既有功能的前提下，將行程、預訂、記帳、待辦的 390px 與 1440px 介面重構到貼近 8 張核准參考圖。

**Architecture:** 保留現有單頁 app 與 dialog 事件，以新增的 responsive shell、共用 view header、桌機側欄、手機底欄及各頁語意 class 重排同一份資料。純計算 helper 留在 `app.js` 並用 `node:test` 先 RED 後 GREEN；視覺由 `styles.css` 檔尾的 reference-match 區塊集中控制，避免改動既有資料模型。

**Tech Stack:** 原生 HTML、CSS、JavaScript；Node.js `node:test`；Chrome／Playwright headless；本機靜態伺服器。

## Global Constraints

- 8 張參考圖是唯一視覺驗收基準，不自行創作替代版型。
- 不修改使用者資料格式、localStorage key、Supabase schema、同步、PDF、附件與唯讀規則。
- 新增 helper 一律先寫失敗測試並實際看到 RED，再完成 GREEN。
- 每個階段都跑 `node --check app.js && node --test tests/*.test.js && git diff --check`。
- 驗收截圖使用隔離 browser context 與範例資料，禁止覆蓋使用者資料。
- 每一階段獨立 commit：foundations、itinerary、bookings、expenses、todos。

---

### Task 1: Reference-match layout foundations

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/reference-layout.test.js`

**Interfaces:**
- Consumes: `state.activeTripSection`、既有 `tripSectionTabs`、`tripView`。
- Produces: `getDesktopSectionMeta(section)`、`.desktop-sidebar`、`.reference-page-header`、四頁一致 responsive shell。

- [ ] **Step 1: Write failing tests**

在 `tests/reference-layout.test.js` 驗證：HTML 有桌機側欄與四個 section 入口；CSS 有 `1100px` 桌機斷點、手機底欄及共用紙張／墨色／珊瑚 token；`getDesktopSectionMeta()` 對四頁輸出指定名稱。

- [ ] **Step 2: Verify RED**

Run: `node --test tests/reference-layout.test.js`

Expected: FAIL，因為側欄與 helper 尚不存在。

- [ ] **Step 3: Implement minimal shared shell**

新增桌機側欄、共用頁首容器與 section meta；沿用現有 section tab click handler。CSS 建立暖白紙張、深藍墨色、霧藍、灰綠、珊瑚色角色與 1100px 雙欄骨架。

- [ ] **Step 4: Verify GREEN and regression**

Run: `node --check app.js && node --test tests/*.test.js && git diff --check`

- [ ] **Step 5: Commit**

Run: `git add index.html styles.css app.js tests/reference-layout.test.js && git commit -m "feat: add reference-matched responsive shell"`

### Task 2: Itinerary reference match

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/reference-itinerary.test.js`

**Interfaces:**
- Consumes: trip days/items/weather、`renderItineraryTimeline()`、現有 item dialog。
- Produces: `getItineraryItemVisual(item)`、手機照片時間軸卡、桌機主欄時間軸與右側天氣／統計。

- [ ] **Step 1: Write failing helper and structure tests**

測試類型圖示／fallback 圖片資訊不改寫 item；HTML 有 itinerary side summary；CSS 不再顯示舊 `.itinerary-focus-card`，手機時間軸卡與桌機雙欄存在。

- [ ] **Step 2: Verify RED**

Run: `node --test tests/reference-itinerary.test.js`

- [ ] **Step 3: Implement render and CSS**

移除手機「下一個行程」焦點視覺，全部 item 進同一條時間軸；保留詳細內容與 click 行為。建立三段 Day control、日期天氣列、手機圖片卡與浮動新增；桌機建立路線摘要、右側天氣／統計卡。

- [ ] **Step 4: Verify and screenshot**

Run complete tests；以隔離資料擷取 `390px`、`1440px` 行程，檢查後才 commit。

- [ ] **Step 5: Commit**

Run: `git commit -m "feat: match itinerary reference layouts"`

### Task 3: Bookings reference match

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/reference-bookings.test.js`

**Interfaces:**
- Consumes: bookings、attachments、personal tickets、`handleBookingClick`。
- Produces: `getBookingVisualMeta(booking)`、全部分類、QR-style ticket focus、桌機日期線與右欄摘要。

- [ ] **Step 1: Write failing tests**

測試分類含「全部」、焦點卡 QR 區與一般卡必要 class、桌機右欄容器；helper 正確映射票券／交通／住宿／餐廳且不改資料。

- [ ] **Step 2: Verify RED**

Run: `node --test tests/reference-bookings.test.js`

- [ ] **Step 3: Implement render and CSS**

焦點票券調整為珊瑚描邊、QR 視覺與開啟票券；一般手機卡改為圖示／文字／狀態，不用封面。桌機主欄改日期線大卡，右欄顯示 upcoming 與檢查清單；所有附件與編輯事件沿用。

- [ ] **Step 4: Verify, screenshot, commit**

Run complete tests，擷取 390px／1440px，`git commit -m "feat: match booking reference layouts"`。

### Task 4: Expenses reference match

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/reference-expenses.test.js`

**Interfaces:**
- Consumes: expense entries、members、currency rates、settlement output。
- Produces: `buildExpenseCategoryBreakdown(expenses)`、甜甜圈 CSS 資料、手機摘要／日期清單、桌機三摘要＋表格＋右欄。

- [ ] **Step 1: Write failing tests**

用固定 expense fixture 驗證分類合計與百分比、零資料行為、原陣列不變；驗證摘要／圖表／結算容器 class。

- [ ] **Step 2: Verify RED**

Run: `node --test tests/reference-expenses.test.js`

- [ ] **Step 3: Implement render and CSS**

以現有換算結果建立分類占比；手機第一屏依序為標題頭像、總支出＋甜甜圈、全寬新增、日期明細、結算；設定移到後段。桌機為三摘要、左表格、右圖表與結算。

- [ ] **Step 4: Verify, screenshot, commit**

Run complete tests，擷取 390px／1440px，`git commit -m "feat: match expense reference layouts"`。

### Task 5: Todos reference match

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `tests/reference-todos.test.js`

**Interfaces:**
- Consumes: todos、group names、existing checkbox/edit handlers。
- Produces: `buildTodoProgress(todos)`、手機環形進度／分組卡、桌機主表／進度／快速新增／到期摘要。

- [ ] **Step 1: Write failing tests**

驗證完成／總數／百分比，空資料為 0%，不改陣列；驗證 progress、quick-add、upcoming 容器與手機全寬新增按鈕。

- [ ] **Step 2: Verify RED**

Run: `node --test tests/reference-todos.test.js`

- [ ] **Step 3: Implement render and CSS**

手機建立頁首、分類、進度、今天／可選卡列與全寬新增；桌機建立分類、緊湊表列及右側三卡。維持勾選、編輯、唯讀事件。

- [ ] **Step 4: Verify, screenshot, commit**

Run complete tests，擷取 390px／1440px，`git commit -m "feat: match todo reference layouts"`。

### Task 6: Cross-page visual verification

**Files:**
- Create: `artifacts/reference-match/*.png`
- Create: `docs/superpowers/reference-match-verification.md`

**Interfaces:**
- Consumes: Tasks 1–5。
- Produces: 8 張隔離資料截圖、console 紀錄、逐頁比對結論。

- [ ] **Step 1: Launch isolated preview**

啟動本機 server；以全新 browser context 注入專用 fixture，不能使用或修改使用者瀏覽器資料。

- [ ] **Step 2: Capture eight screenshots**

四頁各擷取 390×844 與 1440×1000，全頁截圖另存於 `artifacts/reference-match/`。

- [ ] **Step 3: Inspect every screenshot**

用 `view_image` 逐張比對參考，若結構、比例、資訊順序或主要色彩偏離就修正並重新截圖。

- [ ] **Step 4: Final verification**

Run: `node --check app.js && node --test tests/*.test.js && git diff --check`

確認 Chrome console 沒有新的 JavaScript error；完成驗證報告，列出每張截圖與比對結果。

## Self-review

- 每張參考圖皆對應一個 390px 或 1440px 截圖與一項頁面 task。
- 新 helper 的介面、輸入與不變性測試已明確寫入各 task。
- PDF、雲端、附件、唯讀、匯入匯出均列為保留，不需資料遷移。
- 無 TODO、TBD 或「類似前一項」等未定內容。
