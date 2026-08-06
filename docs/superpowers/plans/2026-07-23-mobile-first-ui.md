# 手機優先 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將旅．拾光的既有旅程頁改成手機優先的四主功能介面，同時不改變任何旅程、預訂、待辦、記帳、同步或 PDF 的資料規則。

**Architecture:** 保持單一 HTML/CSS/JavaScript 架構與既有 DOM 事件。HTML 只調整底部主導覽與 PDF 入口的語意；CSS 在檔案尾端以設計 token 與手機優先覆寫收斂外觀；JavaScript 只更新頁籤導覽與中央新增按鈕的既有分流，資料渲染函式不改寫。

**Tech Stack:** 原生 HTML、CSS、JavaScript；Node.js 內建 `node:test`／`assert`；瀏覽器實機截圖 smoke test。

## Global Constraints

- 不修改旅程、預訂、待辦、記帳、共享、雲端同步及 PDF 匯出的資料格式或資料庫 SQL。
- 手機 320～459px 必須是單欄，內容左右內距 16px，所有主要觸控目標至少 44×44px。
- 底部只保留「行程、預訂、待辦、記帳」四個主功能；PDF 從「更多」工具入口開啟。
- 固定底部區域必須使用 `env(safe-area-inset-bottom)`，內容不得被遮住。
- 680px 以上僅增加空間，不改變四主功能名稱、順序或資料來源。
- 每個階段都執行 `node --check app.js && node --test tests/*.test.js`；不得新增 console error。
- 此資料夾目前沒有 Git repository；實作前建立具日期的唯讀備份副本，完成後回報備份位置，不能宣稱已 commit。

---

### Task 1: 建立安全回退點與導覽結構測試

**Files:**
- Create: `tests/mobile-navigation.test.js`
- Create: `codex-backup-20260723-mobile-first-ui/index.html`
- Create: `codex-backup-20260723-mobile-first-ui/styles.css`
- Create: `codex-backup-20260723-mobile-first-ui/app.js`
- Modify: `index.html:130-140`
- Modify: `app.js:2921-2943, 5458-5472, 5855-5866`

**Interfaces:**
- Consumes: `data-trip-section`、`data-trip-section-add`、`renderTripSectionTabs()`、現有 `open*Dialog()` 函式。
- Produces: 只有四個主頁籤的底部導覽；PDF 由可存取的「更多工具」按鈕開啟；中央新增按目前頁面分流。

- [ ] **Step 1: 建立不覆蓋原檔的回退副本**

Run:

```bash
mkdir -p codex-backup-20260723-mobile-first-ui
cp index.html styles.css app.js codex-backup-20260723-mobile-first-ui/
cmp index.html codex-backup-20260723-mobile-first-ui/index.html
cmp styles.css codex-backup-20260723-mobile-first-ui/styles.css
cmp app.js codex-backup-20260723-mobile-first-ui/app.js
```

Expected: 三個 `cmp` 都沒有輸出且結束碼為 0。

- [ ] **Step 2: 寫導覽結構的失敗測試**

Create `tests/mobile-navigation.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("手機底部主導覽只有四個主功能並保留中央新增", () => {
  const nav = html.match(/<nav class="trip-section-tabs"[\\s\\S]*?<\\/nav>/)?.[0] ?? "";
  assert.match(nav, /data-trip-section="itinerary"/);
  assert.match(nav, /data-trip-section="bookings"/);
  assert.match(nav, /data-trip-section="todos"/);
  assert.match(nav, /data-trip-section="expenses"/);
  assert.match(nav, /data-trip-section-add/);
  assert.doesNotMatch(nav, /data-trip-section="pdf"/);
});
```

- [ ] **Step 3: 執行測試並確認目前失敗**

Run: `node --test tests/mobile-navigation.test.js`

Expected: FAIL，因為目前 PDF 仍在底部導覽中。

- [ ] **Step 4: 最小修改 HTML 與導覽事件**

將 `index.html` 的 PDF 頁籤從 `.trip-section-tabs` 移除，在 `.trip-appbar` 右側新增 `button`，屬性為 `id="openPdfPreviewButton"`、`type="button"`、`aria-label="開啟 PDF 預覽"`，可見文字為「更多」。在 `app.js` 新增該元素查詢與 click listener，click 時設定 `viewState.activeTripSection = "pdf"` 後呼叫 `renderTrip()`。保留既有 `pdfPreviewPanel` 和列印功能。

將 `renderTripSectionTabs()` 限制為四個主頁 section；`data-trip-section-add` 保持既有分流，當 active section 是 `pdf` 時開啟一個可選的新增項目對話框，不猜測新增類型。

- [ ] **Step 5: 驗證導覽與既有功能**

Run:

```bash
node --check app.js
node --test tests/mobile-navigation.test.js tests/*.test.js
```

Expected: 結束碼 0；PDF panel 仍可經「更多」開啟。

### Task 2: 共用手機設計 token、底部安全區與響應式回歸測試

**Files:**
- Create: `tests/mobile-layout.test.js`
- Modify: `styles.css:檔案末端（`@media (min-width: 680px)` 後）`

**Interfaces:**
- Consumes: 現有 `.trip-section-tabs`、`.trip-section-tab`、`.trip-section-panel`、`.utility-card`、`.todo-group`、`.booking-card`、`.expense-day-card`。
- Produces: 集中的 CSS token、手機單欄間距與底部安全區；680px 以上擴展規則。

- [ ] **Step 1: 寫會失敗的 CSS 守門測試**

Create `tests/mobile-layout.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("手機版設計 token 與底部安全區存在", () => {
  assert.match(css, /--color-bg:\s*#F7F4EF/);
  assert.match(css, /--space-4:\s*16px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(min-width: 680px\)/);
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `node --test tests/mobile-layout.test.js`

Expected: FAIL，因為 token 尚未集中定義。

- [ ] **Step 3: 在 CSS 末端加入最小可共用的手機 token 與覆寫**

新增以下 token，並以它們覆寫背景、卡片、主要按鈕、底部列與頁面底距；不可大量搜尋取代舊色碼：

```css
:root {
  --color-bg: #F7F4EF;
  --color-surface: #FFFDF8;
  --color-ink: #182521;
  --color-muted: #66706B;
  --color-primary: #0F6B5F;
  --color-accent: #D98145;
  --color-line: #D8DDD3;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --radius-card: 12px;
  --shadow-card: 0 8px 24px rgba(24, 37, 33, .08);
}

#tripView { background: var(--color-bg); padding-bottom: calc(92px + env(safe-area-inset-bottom)); }
.trip-section-tabs { padding-bottom: env(safe-area-inset-bottom); }
```

接著在 `max-width: 679px` 規則中，將四個主要 panel 的水平內距統一為 `var(--space-4)`，卡片圓角統一使用 `var(--radius-card)`，主要按鈕最小高度設定為 44px；在既有 `min-width: 680px` 內只調整寬度與雙欄摘要，不改功能順序。

- [ ] **Step 4: 驗證 CSS 守門與完整測試**

Run:

```bash
node --test tests/mobile-layout.test.js tests/*.test.js
node --check app.js
```

Expected: 全部 PASS。

### Task 3: 將四個既有面板收斂為手機單欄操作

**Files:**
- Modify: `styles.css:1451-1479, 2061-2227, 2229-2410, 2552-2744, 3136-3590, 4727-4984`
- Modify: `app.js:2241-2315, 2745-2920, 2945-3600, 3601-4131, 4132-4218`（只在需要增加語意 class 或空狀態文字時）

**Interfaces:**
- Consumes: `renderTravelDayPanel()`、`renderQuickTickets()`、`renderBookings()`、`renderTodos()`、`renderExpenses()` 現有資料輸出。
- Produces: 行程、預訂、待辦、記帳四頁的單欄卡片 UI，所有原有點擊與 dialog 行為維持不變。

- [ ] **Step 1: 行程頁先以 CSS 完成焦點排序**

在 679px 以下讓 `.weather-panel` 預設為短摘要、`.travel-day-panel` 和 `.quick-ticket-panel` 排在 `.timeline` 前方，時間軸卡片最小高度 48px，圖片與長備註保持收合。若現有 DOM 順序不符合，以 `display: flex`／`order` 處理，不搬動資料結構。

- [ ] **Step 2: 預訂頁調整成「下一個預訂 → 分類 → 單欄卡片」**

讓 `.sub-tabs` 橫向可滑動且不換行；`.booking-card` 在 679px 以下固定單欄，封面使用 16:9 橫幅、文字區不可被圖片擠壓。保留 `.booking-card` 的既有 click、附件與個人票券行為。

- [ ] **Step 3: 待辦頁保留大勾選框與直覺操作**

讓 `.todo-table-row` 在手機轉為一列一張卡：勾選框至少 24px、整列可見高度至少 48px、到期日／數量放右側簡短區域。已完成列使用文字與勾選狀態淡化，不只靠顏色，且不從資料中刪除。

- [ ] **Step 4: 記帳頁優先新增、摘要與每日明細**

在 679px 以下讓 `.expense-settings-grid`、統計和 `.expense-day-list` 單欄；將新增支出入口放在摘要後方，設定／匯率保留但視覺降級。每筆 `.expense-entry` 顯示分類、名稱、付款人、金額，長名稱須可換行而不溢出。

- [ ] **Step 5: 僅在 CSS 無法表示語意時補最小 JavaScript class**

如需標示下一個未來行程或預訂，新增純 class（例如 `is-next-upcoming`）且在對應 `render*` 函式中以既有日期／時間資料判斷；不得排序、刪除或遷移 `trip` 內資料。

- [ ] **Step 6: 跑行為回歸測試**

Run: `node --check app.js && node --test tests/*.test.js`

Expected: PASS；既有票券、交通、待辦、支出相關測試全數通過。

### Task 4: 瀏覽器 smoke test、跨尺寸截圖與最終安全檢查

**Files:**
- Create: `mobile-ui-check-375.png`
- Create: `mobile-ui-check-393.png`
- Create: `mobile-ui-check-430.png`
- Create: `mobile-ui-check-680.png`
- Create: `mobile-ui-check-1280.png`

**Interfaces:**
- Consumes: Tasks 1–3 的 UI、所有既有資料與 dialog。
- Produces: 五張實機驗證截圖及可交付的驗證結果。

- [ ] **Step 1: 啟動本機靜態網站並載入有代表性的旅程資料**

Run: `python3 -m http.server 4173`

Expected: 瀏覽器可開啟 `http://localhost:4173`；若沒有示範資料，使用既有新增表單建立一筆行程、一筆預訂、一筆待辦與一筆支出，不能手改 localStorage 格式。

- [ ] **Step 2: 在五個寬度截圖並檢查**

在 375、393、430、680、1280px 寬度依序截圖。每張檢查：無橫向捲動、沒有文字重疊、底部列不遮住最後一筆、目前頁籤有可見選取狀態、中央新增按鈕可點。

- [ ] **Step 3: 執行四條旅行當下關鍵流程**

1. 在行程頁切換日期並開啟下一個行程。
2. 在預訂頁開啟一張票券或附件。
3. 在待辦頁勾選一筆後重新整理，確認狀態仍存在。
4. 在記帳頁新增一筆支出後重新整理，確認摘要與明細同步更新。

- [ ] **Step 4: 檢查 console 與最終測試**

Run: `node --check app.js && node --test tests/*.test.js`

Expected: PASS；瀏覽器 Console 無新增 error；唯讀模式下新增入口仍依既有規則禁止寫入。

## Self-review

- 規格第 3～4 節的四個主頁，分別由 Task 3 實作；第 5～8 節由 Task 1～2 的 token、導覽與響應式規則覆蓋；第 9～11 節由 Task 4 驗證並避免擴大資料功能。
- 計畫不包含資料遷移、第三方服務、地圖、付款或推播。
- 已明確處理目前無 Git repository 的風險：先建立不覆蓋的備份，而非假裝可開分支或 commit。
