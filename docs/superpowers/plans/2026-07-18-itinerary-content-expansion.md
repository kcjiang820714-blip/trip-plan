# 行程卡片完整內容展開 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 點選行程卡片後，完整顯示該筆行程內容與備註；收合後維持目前兩行的內容預覽。

**Architecture:** 保留 `app.js` 的既有 `state.expandedItemId`、`data-toggle-details` 點擊事件與 `.item-details` 容器，不新增儲存欄位或改變行程資料。只在 `renderTrip()` 產生的詳細區塊中，依 `item.content`、`item.note` 是否有值輸出完整文字；CSS 新增詳細文字的換行與留白規則。以 Node 內建模組執行「原始碼契約測試」確認關鍵輸出與 CSS 規則，並以本機靜態伺服器的桌面／手機瀏覽器截圖驗證實際畫面。

**Tech Stack:** 原生 HTML、CSS、瀏覽器 JavaScript、Node.js 內建 `node:assert/strict` 與 `node:fs`、Python 3 的 `http.server`。

## Global Constraints

- 只允許修改 `/Users/kcjiang/Documents/旅遊行程app/app.js`、`/Users/kcjiang/Documents/旅遊行程app/styles.css`，並新增 `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`。
- 不修改 `/Users/kcjiang/Documents/旅遊行程app/index.html`、既有行程資料、localStorage 儲存格式或任何備份資料夾。
- 不安裝套件、不建立 `package.json`、不使用外部測試框架。
- 未展開的 `.item-content-preview` 必須保留現有 `-webkit-line-clamp: 2` 預覽行為。
- `item.content` 不存在時不輸出內容詳細區塊；`item.note` 不存在時不輸出備註詳細區塊或「沒有備註」。
- 展開／收合沿用既有按鈕的 `aria-expanded`、`aria-controls` 與 `hidden` 行為，手機和桌面一致。
- 此資料夾不是 Git 儲存庫：本計畫不執行 commit，也不要求建立分支。

---

## File Structure

- `/Users/kcjiang/Documents/旅遊行程app/app.js`：`renderTrip()`（目前約第 1790–1835 行）輸出卡片 HTML；在既有 `.item-details` 內加入兩個有條件的完整文字區塊。
- `/Users/kcjiang/Documents/旅遊行程app/styles.css`：保留 `.item-content-preview`（目前約第 3705 行）的兩行截斷；新增完整文字區塊的樣式，確保長文字可換行且不被截斷。
- `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`：不需 DOM 或套件的 Node 測試，讀取兩個原始碼檔案並驗證此功能的輸出契約與 CSS 契約。

### Task 1: 建立會失敗的原始碼契約測試

**Files:**
- Create: `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js:1798-1834`
- Read: `/Users/kcjiang/Documents/旅遊行程app/styles.css:3705-3785`

**Interfaces:**
- Consumes: `renderTrip()` 內的 template literal、`item.content`、`item.note`、`escapeHtml()`。
- Produces: 可由 `node --test` 執行的測試檔；它要求 `.item-details` 中有 `.item-detail-content` 與 `.item-detail-note`，兩者以各自欄位的 truthy 條件輸出，且均經 `escapeHtml()` 處理。

- [ ] **Step 1: 建立測試資料夾與失敗測試檔**

建立 `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`，內容如下：

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("詳細區塊會有條件輸出完整行程內容與備註，且不輸出預設備註", () => {
  const renderTripStart = appSource.indexOf("function renderTrip()");
  const renderTravelDayPanelStart = appSource.indexOf("function renderTravelDayPanel()");
  const tripSource = appSource.slice(renderTripStart, renderTravelDayPanelStart);

  assert.ok(renderTripStart >= 0, "找不到 renderTrip() 函式");
  assert.match(
    tripSource,
    /item\.content\s*\?\s*`<p class="item-detail-content">\$\{escapeHtml\(item\.content\)\}<\/p>`\s*:\s*""/,
    "完整行程內容必須只在 item.content 存在時輸出，且必須跳脫 HTML"
  );
  assert.match(
    tripSource,
    /item\.note\s*\?\s*`<p class="item-detail-note">\$\{escapeHtml\(item\.note\)\}<\/p>`\s*:\s*""/,
    "完整備註必須只在 item.note 存在時輸出，且不得以預設文字代替"
  );
  assert.doesNotMatch(tripSource, /item\.note\s*\|\|\s*"沒有備註"/, "詳細區塊不得顯示「沒有備註」");
});

test("預覽維持兩行截斷，詳細文字則可正常換行", () => {
  assert.match(cssSource, /\.item-content-preview\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/, "卡片預覽必須維持兩行截斷");
  assert.match(cssSource, /\.item-detail-content,\s*\.item-detail-note\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/, "詳細文字必須可在長字串時換行");
  assert.doesNotMatch(cssSource, /\.item-detail-content,\s*\.item-detail-note\s*\{[\s\S]*?-webkit-line-clamp\s*:/, "詳細文字不得被行數截斷");
});
```

- [ ] **Step 2: 執行測試，確認它目前失敗**

Run:

```bash
node --test /Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js
```

Expected: FAIL。第一個測試會指出找不到 `.item-detail-content` 或 `.item-detail-note`；第二個測試會指出找不到詳細文字的 CSS 規則。這證明測試不是先天就會通過。

### Task 2: 最小化新增詳細文字輸出與樣式

**Files:**
- Modify: `/Users/kcjiang/Documents/旅遊行程app/app.js:1823-1829`
- Modify: `/Users/kcjiang/Documents/旅遊行程app/styles.css:3705-3720`（保留）及 `.item-details` 規則後方（新增）
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`

**Interfaces:**
- Consumes: Task 1 的兩個正規表示式契約；既有 `isExpanded` 控制的 `.item-details` 容器。
- Produces: 展開時可見的 `<p class="item-detail-content">` 與 `<p class="item-detail-note">`；未提供內容時不產生對應 DOM 節點。

- [ ] **Step 1: 在 `renderTrip()` 的詳細區塊加入完整行程內容與備註**

在 `/Users/kcjiang/Documents/旅遊行程app/app.js` 的 `.item-details` template literal 中，保留既有 `renderFlightInfo`、`renderTransportInfo`、`renderAttractionIntro` 與附件輸出。將目前這一行：

```js
            <p class="note">${escapeHtml(item.note || "沒有備註")}</p>
```

替換為下列兩行，位置放在附件輸出後、`.card-actions` 前：

```js
            ${item.content ? `<p class="item-detail-content">${escapeHtml(item.content)}</p>` : ""}
            ${item.note ? `<p class="item-detail-note">${escapeHtml(item.note)}</p>` : ""}
```

這會讓既有按鈕展開的 `.item-details` 同時顯示完整行程內容與備註；未填任一欄位時不會留下空白段落。不可變更 `data-toggle-details`、`aria-expanded`、`aria-controls`、`hidden` 或第 5371 行附近既有點擊事件。

- [ ] **Step 2: 在 CSS 新增詳細文字的可讀性規則**

在 `/Users/kcjiang/Documents/旅遊行程app/styles.css` 的 `.item-details` 規則結束後加入：

```css
.item-detail-content,
.item-detail-note {
  margin: 0;
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 720;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.item-detail-note {
  color: var(--muted);
}
```

不可修改 `.item-content-preview` 的 `display: -webkit-box`、`overflow: hidden` 或 `-webkit-line-clamp: 2`。詳細文字不用 `overflow: hidden`、`line-clamp`、固定高度或 `white-space: nowrap`，讓桌面與手機都能完整換行。

- [ ] **Step 3: 執行測試，確認最小修改通過**

Run:

```bash
node --test /Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js
```

Expected: PASS，且輸出 2 個通過的子測試。若失敗，先依錯誤訊息核對 class 名稱、條件式與 `escapeHtml()` 是否完全符合 Task 1 的契約，再重新執行；不要放寬測試來掩蓋實作問題。

- [ ] **Step 4: 檢查變更範圍與語法**

Run:

```bash
node --check /Users/kcjiang/Documents/旅遊行程app/app.js
find /Users/kcjiang/Documents/旅遊行程app/tests -maxdepth 1 -type f -name 'itinerary-content-expansion.test.js' -print
```

Expected: `node --check` 無輸出且結束碼為 0；`find` 只列出這次新增的測試檔。由於非 Git 專案，不能用 `git diff` 或 commit 作為驗證方式。

### Task 3: 以本機瀏覽器驗收桌面與手機畫面

**Files:**
- Read: `/Users/kcjiang/Documents/旅遊行程app/index.html`
- Read: `/Users/kcjiang/Documents/旅遊行程app/app.js`
- Read: `/Users/kcjiang/Documents/旅遊行程app/styles.css`
- Test: `/Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js`

**Interfaces:**
- Consumes: Task 2 的完整文字 DOM 與既有 `[data-toggle-details]` 點擊處理器。
- Produces: 桌面與手機各一張「已展開長內容」截圖；一項可重複的手動驗收紀錄。

- [ ] **Step 1: 啟動只讀取專案檔案的本機靜態伺服器**

Run:

```bash
python3 -m http.server 4173 --directory /Users/kcjiang/Documents/旅遊行程app
```

Expected: 顯示 `Serving HTTP on ... port 4173`。此指令只提供本機網頁，不會上傳資料；驗收結束後在該終端按 `Ctrl+C` 停止它。

- [ ] **Step 2: 建立可安全驗收的長文字行程資料**

在瀏覽器開啟 `http://127.0.0.1:4173`。用介面新增或編輯一筆測試行程（不要覆寫使用者的重要既有行程），填入：

```text
行程內容：09:30 從飯店出發，搭地鐵前往市中心；抵達後先寄放行李，再依序前往博物館、老城區與河畔市集。請保留充足步行與拍照時間，並注意最後入場時間。
備註：若下雨，改走室內展館並將河畔市集移至隔日上午；票券與集合地點請以當天通知為準。
```

Expected: 收合時卡片的 `.item-content-preview` 最多顯示兩行；卡片高度不會因完整文字而異常拉長。

- [ ] **Step 3: 桌面寬度檢查與截圖**

在瀏覽器桌面寬度（至少 1280 px）點選該行程卡片的摘要區，再截圖保存為：

```text
/Users/kcjiang/Documents/旅遊行程app/docs/superpowers/verification/2026-07-18-itinerary-content-expansion-desktop.png
```

Expected: `aria-expanded` 變成 `true`、詳細區塊不再有 `hidden`；完整行程內容與完整備註皆可見、能換行、不被裁切、不重疊，且展開箭頭朝上。再點同一張卡片，確認它收合、回到兩行預覽；再展開一次，確認可重複操作。

- [ ] **Step 4: 手機寬度檢查與截圖**

在瀏覽器開發者工具或裝置模擬切換為 390 px 寬度，重新點選同一張卡片使其展開，再截圖保存為：

```text
/Users/kcjiang/Documents/旅遊行程app/docs/superpowers/verification/2026-07-18-itinerary-content-expansion-mobile.png
```

Expected: 完整文字仍可閱讀與換行；卡片、時間欄、展開箭頭、操作按鈕沒有重疊或跑出畫面；收合與再展開的行為與桌面相同。

- [ ] **Step 5: 完成前重跑自動檢查並停止伺服器**

Run:

```bash
node --test /Users/kcjiang/Documents/旅遊行程app/tests/itinerary-content-expansion.test.js
node --check /Users/kcjiang/Documents/旅遊行程app/app.js
```

Expected: 兩個命令皆成功。接著回到啟動伺服器的終端按 `Ctrl+C`。回報時附上兩張截圖路徑、已確認項目與仍需要使用者二次確認的真實內容／個人偏好；不要聲稱已修改資料格式或已 commit。

## Self-Review

- 規格覆蓋：Task 2 保留兩行預覽，並在既有展開區顯示完整內容與備註；兩個欄位分別有條件輸出，因此空值不會出現空白區塊或預設文字。Task 3 驗證重複展開／收合、桌面與手機的完整閱讀、換行、裁切與重疊。
- 資料安全：沒有變更 item 結構、儲存格式或 index.html；瀏覽器測試要求使用測試行程，避免覆寫重要資料。
- 測試可信度：Task 1 先驗證目前會失敗，Task 2 再以 Node 內建工具通過；Task 3 以實際瀏覽器畫面補足原始碼測試無法檢查的視覺行為。
- 一致性：所有任務均使用 `.item-detail-content`、`.item-detail-note`、`item.content`、`item.note` 與 `escapeHtml()`；沒有未定事項、待補內容或互相矛盾的指示。
