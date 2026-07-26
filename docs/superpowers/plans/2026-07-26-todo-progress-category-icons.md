# 待辦進度與分類圖示實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓待辦完成進度只計算目前選取的分類，並在預訂與支出畫面使用一致、直覺的分類圖示。

**Architecture:** 將不依賴瀏覽器畫面的計算與圖示對應抽到一個小型 ES module，使用 Node 內建測試固定其行為。`app.js` 只負責把目前分類與資料交給這些函式並渲染；`index.html` 與 `styles.css` 只處理分類按鈕和圓環的顯示結構。最後提高檔案版本與 Service Worker 快取版本，避免手機繼續讀到舊畫面。

**Tech Stack:** 原生 HTML、CSS、JavaScript ES module、Node.js 內建 `node:test`、瀏覽器本機截圖驗證、GitHub Pages PWA Service Worker。

## Global Constraints

- 不改變待辦、預訂或支出的既有資料、內部分類值、篩選規則、私人／共享權限或 Supabase 資料庫。
- 待辦分類為「全部」或空值時才統計全部待辦；其他分類只統計 `todo.group` 完全相同的待辦。
- 預訂分類按鈕、預訂卡片與支出卡片的五個指定類別必須一致：全部 `☰`、票券 `🎟️`、交通 `🚆`、住宿 `🛏️`、餐廳 `🍽️`；其他類別保留名稱並使用其他圖示。
- 所有 production JavaScript 的新增行為必須先有可觀察到失敗的 Node 測試；視覺置中另以手機與桌面截圖驗證。
- 不新增套件、不修改 Supabase SQL、不修改既有待辦同步程式 `todo-sync.js`。

---

### Task 1: 建立可測試的待辦進度與分類圖示規則

**Files:**
- Create: `tests/ui-presentation.test.mjs`
- Create: `ui-presentation.js`

**Interfaces:**
- Consumes: `todo` 的 `group` 與 `done` 欄位，以及預訂／支出的分類文字。
- Produces: `getTodoProgress(todos, activeGroup)` 回傳 `{ total, done, pending, percent }`；`bookingGroupIcon(group)` 回傳分類按鈕 emoji；`bookingTypeMeta(type)` 與 `expenseCategoryMeta(category)` 回傳 `{ icon, tone }`。

- [ ] **Step 1: 寫入會失敗的規則測試**

建立 `tests/ui-presentation.test.mjs`，先匯入尚不存在的 `../ui-presentation.js`，並寫入以下測試：

```js
import assert from "node:assert/strict";
import test from "node:test";
import { bookingGroupIcon, bookingTypeMeta, expenseCategoryMeta, getTodoProgress } from "../ui-presentation.js";

const todos = [
  { group: "行前準備", done: true },
  { group: "行前準備", done: false },
  { group: "行李打包", done: false },
  { group: "行李打包", done: true }
];

test("getTodoProgress only counts the active group", () => {
  assert.deepEqual(getTodoProgress(todos, "行前準備"), { total: 2, done: 1, pending: 1, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, "行李打包"), { total: 2, done: 1, pending: 1, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, "不存在"), { total: 0, done: 0, pending: 0, percent: 0 });
});

test("getTodoProgress counts all todos only for all or empty groups", () => {
  assert.deepEqual(getTodoProgress(todos, "全部"), { total: 4, done: 2, pending: 2, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, ""), { total: 4, done: 2, pending: 2, percent: 50 });
});

test("booking and expense category icons use the agreed visible mapping", () => {
  assert.equal(bookingGroupIcon("全部"), "☰");
  assert.equal(bookingGroupIcon("票券"), "🎟️");
  assert.equal(bookingGroupIcon("交通"), "🚆");
  assert.equal(bookingGroupIcon("住宿"), "🛏️");
  assert.equal(bookingGroupIcon("餐廳"), "🍽️");
  assert.equal(bookingTypeMeta("交通").icon, "🚆");
  assert.equal(expenseCategoryMeta("票券").icon, "🎟️");
  assert.equal(expenseCategoryMeta("餐飲").icon, "🍽️");
});
```

- [ ] **Step 2: 執行測試，確認因模組不存在而失敗**

Run: `node --test tests/ui-presentation.test.mjs`

Expected: FAIL，錯誤原因為找不到 `ui-presentation.js`，而不是測試語法錯誤。

- [ ] **Step 3: 寫入最小規則模組**

建立 `ui-presentation.js`：

```js
const allGroups = new Set(["", "全部"]);

export function getTodoProgress(todos = [], activeGroup = "") {
  const visibleTodos = allGroups.has(activeGroup) ? todos : todos.filter((todo) => todo.group === activeGroup);
  const total = visibleTodos.length;
  const done = visibleTodos.filter((todo) => Boolean(todo.done)).length;
  return { total, done, pending: total - done, percent: total ? Math.round((done / total) * 100) : 0 };
}

const bookingIcons = { 全部: "☰", 票券: "🎟️", 交通: "🚆", 住宿: "🛏️", 餐廳: "🍽️" };

export function bookingGroupIcon(group) {
  return bookingIcons[group] || "⋯";
}

export function bookingTypeMeta(type) {
  const group = bookingIcons[type] ? type : "票券";
  const tone = group === "住宿" ? "green" : group === "餐廳" ? "coral" : "blue";
  return { group, icon: bookingGroupIcon(group), tone };
}

export function expenseCategoryMeta(category) {
  const normalized = String(category || "其他");
  if (normalized.includes("餐") || normalized.includes("食")) return { icon: "🍽️", tone: "food" };
  if (normalized.includes("交通") || normalized.includes("車")) return { icon: "🚆", tone: "transport" };
  if (normalized.includes("景點") || normalized.includes("門票") || normalized.includes("票")) return { icon: "🎟️", tone: "sight" };
  if (normalized.includes("購物")) return { icon: "🛍️", tone: "shopping" };
  if (normalized.includes("住宿")) return { icon: "🛏️", tone: "stay" };
  return { icon: "⋯", tone: "other" };
}
```

- [ ] **Step 4: 再執行測試，確認規則通過**

Run: `node --test tests/ui-presentation.test.mjs`

Expected: PASS，3 個測試全部通過。

- [ ] **Step 5: 提交此可獨立驗證的規則**

```bash
git add tests/ui-presentation.test.mjs ui-presentation.js
git commit -m "test: define progress and category presentation rules"
```

### Task 2: 將規則接到待辦、預訂與支出畫面

**Files:**
- Modify: `app.js:1, 3239-3250, 4130-4216, 4362-4369`
- Modify: `index.html:230-236, 952`
- Modify: `styles.css:9056-9084, 9580-9606`
- Modify: `sw.js:1-9`
- Modify: `tests/ui-presentation.test.mjs`
- Modify: `ui-presentation.js`

**Interfaces:**
- Consumes: Task 1 的 `getTodoProgress`, `bookingTypeMeta`, `expenseCategoryMeta`, `bookingGroupIcon`。
- Produces: 待辦圓環使用 `<div class="todo-progress-ring-content">` 包住百分比與筆數，預訂分類按鈕與卡片／支出卡片輸出一致 emoji，並讓新版本避開舊 PWA 快取。

- [ ] **Step 1: 先擴充測試，讓圓環顯示結構失敗**

在 `tests/ui-presentation.test.mjs` 新增匯入 `renderTodoProgressRing`，並新增：

```js
test("renderTodoProgressRing keeps percent and count in one centered content wrapper", () => {
  const markup = renderTodoProgressRing({ total: 2, done: 1, pending: 1, percent: 50 });
  assert.match(markup, /class="todo-progress-ring-content"/);
  assert.match(markup, />50%<\/strong>/);
  assert.match(markup, />1 \/ 2<\/small>/);
});
```

- [ ] **Step 2: 執行測試，確認因尚未輸出圓環函式而失敗**

Run: `node --test tests/ui-presentation.test.mjs`

Expected: FAIL，錯誤原因為 `renderTodoProgressRing` 尚未匯出。

- [ ] **Step 3: 最小化整合畫面程式**

在 `ui-presentation.js` 新增：

```js
export function renderTodoProgressRing(progress) {
  return `<div class="todo-progress-ring" style="--todo-progress: ${progress.percent}" aria-label="已完成 ${progress.percent}%"><div class="todo-progress-ring-content"><strong>${progress.percent}%</strong><small>${progress.done} / ${progress.total}</small></div></div>`;
}
```

在 `app.js` 最上方改為匯入這些函式，刪除舊的同名 `getTodoProgress` 與 `expenseCategoryMeta`，並把預訂類別的舊符號對應改為 `bookingTypeMeta(booking?.type)`。在 `renderTodos()` 將：

```js
const progress = getTodoProgress(trip.todos);
```

改為：

```js
const progress = getTodoProgress(trip.todos, state.activeTodoGroup);
```

手機與桌面兩處圓環都呼叫 `renderTodoProgressRing(progress)`，不要再分別插入符號、百分比或筆數。保留手機左側的完成筆數摘要。

將 `index.html` 預訂分類按鈕的舊字元改為 `☰`、`🎟️`、`🚆`、`🛏️`、`🍽️`，只改可見文字，不改 `data-booking-group` 值。將 `app.js` 載入版本改為 `v=125`。

將 `.todo-progress-ring` 的子元素改成由 `.todo-progress-ring-content` 用 `display: grid`、`justify-items: center`、`align-content: center`、`text-align: center` 包成單一內容區；百分比與筆數皆放在該內容區內，讓二者共同置於圓心。保留既有環形色彩與手機／桌面尺寸。

將 `sw.js` 的快取名稱提高到 `trip-notebook-v150`，加入 `./ui-presentation.js?v=1`，並將 `app.js` 改成 `v=125`；`styles.css` 有改動時將它改成 `v=117`，且在 `index.html` 使用相同 CSS 版本。

- [ ] **Step 4: 執行測試與語法檢查，確認整合通過**

Run: `node --test tests/ui-presentation.test.mjs && node --check app.js && node --check ui-presentation.js && git diff --check`

Expected: PASS，Node 測試全數通過、兩個 JavaScript 檔案沒有語法錯誤、diff 沒有空白格式問題。

- [ ] **Step 5: 提交畫面整合與快取更新**

```bash
git add app.js index.html styles.css sw.js ui-presentation.js tests/ui-presentation.test.mjs
git commit -m "fix: scope todo progress and clarify category icons"
```

### Task 3: 以本機手機與桌面畫面驗證，再發布

**Files:**
- Verify only: `index.html`, `app.js`, `styles.css`, `ui-presentation.js`, `sw.js`

**Interfaces:**
- Consumes: Task 2 的本機靜態網站與測試通過的規則。
- Produces: 兩張本機截圖、發布後版本與快取檔案可被 GitHub Pages 讀取的證據。

- [ ] **Step 1: 啟動本機網站並建立不會碰到正式帳號的測試資料**

Run: `python3 -m http.server 4173 --bind 127.0.0.1`

在本機網站載入前，僅為 `http://127.0.0.1:4173` 寫入下列 `trip-notebook-v2` JSON；不得寫入 GitHub Pages 或 Supabase：

```js
{
  trips: [{
    id: "ui-check-trip",
    title: "介面驗證旅程",
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    members: ["我"],
    todos: [
      { id: "todo-prepare-done", group: "行前準備", text: "確認護照", done: true, schedule: "departure" },
      { id: "todo-prepare-pending", group: "行前準備", text: "購買保險", done: false, schedule: "departure" },
      { id: "todo-pack-pending", group: "行李打包", text: "收納衣物", done: false, schedule: "departure" },
      { id: "todo-pack-done", group: "行李打包", text: "準備充電器", done: true, schedule: "departure" }
    ],
    bookings: [
      { id: "booking-ticket", type: "票券", name: "博物館門票", date: "2026-07-01", time: "10:00" },
      { id: "booking-transport", type: "交通", name: "機場巴士", date: "2026-07-01", time: "08:00", transport: { departureDate: "2026-07-01", departureTime: "08:00", departurePlace: "機場", arrivalPlace: "飯店" } },
      { id: "booking-stay", type: "住宿", name: "測試飯店", date: "2026-07-01", time: "15:00", checkoutDate: "2026-07-02" },
      { id: "booking-food", type: "餐廳", name: "測試餐廳", date: "2026-07-01", time: "18:00" }
    ],
    expenses: [
      { id: "expense-ticket", date: "2026-07-01", name: "博物館門票", amount: 500, currency: "TWD", category: "票券", payer: "我", shareWith: ["我"] },
      { id: "expense-transport", date: "2026-07-01", name: "機場巴士", amount: 300, currency: "TWD", category: "交通", payer: "我", shareWith: ["我"] },
      { id: "expense-stay", date: "2026-07-01", name: "測試飯店", amount: 1200, currency: "TWD", category: "住宿", payer: "我", shareWith: ["我"] },
      { id: "expense-food", date: "2026-07-01", name: "測試餐廳", amount: 600, currency: "TWD", category: "餐飲", payer: "我", shareWith: ["我"] }
    ]
  }]
}
```

- [ ] **Step 2: 檢查桌面寬度畫面**

在 1280px 寬度開啟本機「旅行清單」：依序切換兩個待辦分類，確認圓環百分比、`已完成 / 總數`、圖例數字都隨分類改變；擷取桌面截圖，確認圓環中的兩行文字在水平與垂直方向共同置中。

- [ ] **Step 3: 檢查手機寬度與預訂／支出圖示**

在 390px 寬度開啟本機「預訂與票券」及「記帳」：擷取手機截圖，確認預訂分類按鈕、預訂卡片與支出卡片的票券／交通／住宿／餐廳 icon 分別為 `🎟️`、`🚆`、`🛏️`、`🍽️`，且每個文字名稱仍完整可見。

- [ ] **Step 4: 發布前進行完整靜態驗證**

Run: `node --test tests/ui-presentation.test.mjs && node --check app.js && node --check ui-presentation.js && git diff --check && git status --short`

Expected: 測試與語法檢查成功；狀態只剩預期已提交的內容，沒有測試資料、截圖或暫存伺服器檔案被加入 Git。

- [ ] **Step 5: 以正常 Git 流程推送並確認 GitHub Pages 已載入新版本**

```bash
git push origin codex/todo-progress-category-icons
```

建立或合併回 `main` 前先確認 `git log --oneline --decorate -5` 與 `git status --short`。發布到 `main` 後，以 `curl -fsSL https://kcjiang820714-blip.github.io/trip-plan/` 和 `curl -fsSL https://kcjiang820714-blip.github.io/trip-plan/sw.js` 確認頁面引用 `app.js?v=125`、`styles.css?v=117`，Service Worker 為 `trip-notebook-v150` 且列出 `ui-presentation.js?v=1`。
