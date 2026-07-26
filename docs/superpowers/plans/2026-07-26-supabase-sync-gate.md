# Supabase 同步閘門 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓手動登入與既有登入 session 都在 Supabase 同步完成前顯示全畫面阻擋提示，避免舊本機資料在同步後覆寫使用者操作。

**Architecture:** 新增一個不依賴 DOM 或 Supabase 的同步世代協調器，集中處理同帳號去重、重新同步、登出與過期回應。`app.js` 僅透過它進行初始雲端同步，並以 HTML/CSS 的全畫面閘門顯示 loading 或 error；資料讀回、合併、畫面還原完成後才解除閘門。

**Tech Stack:** 原生 ES modules、Supabase JavaScript v2（既有 CDN 載入）、Node.js 內建 test runner、HTML/CSS、Service Worker。

## Global Constraints

- 不修改 Supabase schema、RLS、RPC、Storage bucket、雲端資料欄位或資料內容。
- 載入文案必須完全為 `正在與 Supabase 同步旅行資料…`。
- 非唯讀模式在 session 判定完成前、手動登入成功後、重新同步中都必須阻擋 app 操作；唯讀分享模式與主動登出既有行為不變。
- 同帳號同時發出的初始同步必須共用同一個 promise；不同帳號、登出或重試必須讓舊世代失效，舊回應不得寫入資料、render 或改變閘門。
- 同步失敗維持阻擋畫面，顯示安全且不含 token／密碼的原因，僅提供 `重新同步`；成功前不得使用本機舊旅程。
- 閘門必須有 `role="dialog"`、`aria-modal="true"`、loading status、error live region，且存在時 app 主內容為 inert；錯誤時焦點移到重試按鈕。
- 所有 app、CSS、新增 module 的查詢版本與 `sw.js` 預快取清單同步遞增；Service Worker cache 名稱也必須遞增。
- 不使用 force push。每個 Task 要通過其測試並提交一個可回退 commit。

---

### Task 1: 建立可測試的同步世代協調器

**Files:**
- Create: `sync-gate.js`
- Create: `tests/sync-gate.test.mjs`

**Interfaces:**
- Produces: `createSyncCoordinator({ onStateChange })`。
- Produces: `coordinator.request(userId, work, { retry })`，其中 `work({ attemptId, userId, isCurrent })` 回傳 promise；相同 userId 的 loading 請求回傳同一 promise，`retry: true` 建立新世代。
- Produces: `coordinator.invalidate()` 與 `coordinator.snapshot()`；snapshot 至少包含 `phase`、`userId`、`attemptId`、`error`。
- Consumed by Task 2: `requestInitialCloudSync` 以 `isCurrent()` 保護每個雲端 await 後的資料套用與閘門更新。

- [ ] **Step 1: 寫入會失敗的協調器測試**

建立 `tests/sync-gate.test.mjs`，以 deferred promise 驗證同帳號只執行一次、重試淘汰舊世代、失敗保留 error、invalidate 後不允許舊任務宣告 current：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSyncCoordinator } from "../sync-gate.js";

test("同一使用者的同步會共用同一個 promise", async () => {
  let resolveWork;
  let calls = 0;
  const coordinator = createSyncCoordinator();
  const work = () => {
    calls += 1;
    return new Promise((resolve) => { resolveWork = resolve; });
  };
  const first = coordinator.request("user-a", work);
  const second = coordinator.request("user-a", work);
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveWork();
  await first;
  assert.equal(coordinator.snapshot().phase, "success");
});
```

另加三個明確測試：`retry: true` 後第一次 work 的 `isCurrent()` 為 false；`invalidate()` 後未完成 work 的 `isCurrent()` 為 false；目前世代 reject 時 snapshot 為 `error` 並安全保留 `String(error.message)`。

- [ ] **Step 2: 執行測試確認失敗**

Run: `node --test tests/sync-gate.test.mjs`

Expected: FAIL，因為 `sync-gate.js` 尚不存在。

- [ ] **Step 3: 寫入最小協調器實作**

建立 `sync-gate.js`。核心結構必須讓每次世代遞增，並只允許目前 token 改變狀態：

```js
export function createSyncCoordinator({ onStateChange = () => {} } = {}) {
  let sequence = 0;
  let active = null;
  let state = { phase: "idle", userId: null, attemptId: 0, error: "" };
  const publish = (next) => { state = { ...next }; onStateChange(state); };
  const isCurrent = (attemptId, userId) => active?.attemptId === attemptId && active?.userId === userId;

  async function request(userId, work, { retry = false } = {}) {
    if (!retry && active?.userId === userId && state.phase === "loading") return active.promise;
    const attemptId = ++sequence;
    const token = { attemptId, userId };
    const promise = Promise.resolve().then(() => work({ ...token, isCurrent: () => isCurrent(attemptId, userId) }));
    active = { ...token, promise };
    publish({ phase: "loading", userId, attemptId, error: "" });
    try { await promise; if (isCurrent(attemptId, userId)) publish({ phase: "success", userId, attemptId, error: "" }); }
    catch (error) { if (isCurrent(attemptId, userId)) publish({ phase: "error", userId, attemptId, error: String(error?.message || "發生未預期的連線錯誤，請檢查網路後重新同步。") }); throw error; }
  }
  return { request, invalidate: () => { active = null; publish({ phase: "idle", userId: null, attemptId: ++sequence, error: "" }); }, snapshot: () => ({ ...state }) };
}
```

保留測試需要的 promise identity：`request` 不可宣告為會每次包裝新 promise 的 async function；回傳儲存的 promise，並在內部 chain 更新狀態。

- [ ] **Step 4: 執行目標與全套測試**

Run: `node --test tests/sync-gate.test.mjs && node --test`

Expected: 新測試與既有測試皆為 0 failures。

- [ ] **Step 5: 提交 Task 1**

```bash
git add sync-gate.js tests/sync-gate.test.mjs
git commit -m "feat: coordinate initial cloud sync"
```

### Task 2: 將登入與畫面改為同步完成後才可操作

**Files:**
- Modify: `index.html:14-103`
- Modify: `styles.css:1-120`（新增閘門樣式可放在既有基礎元件區）
- Modify: `app.js:1,179-183,1220-1305,1555-1605,6449-6510,7670-7678`
- Test: `tests/sync-gate.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `createSyncCoordinator`，`request(userId, work, { retry })` 及 `invalidate()`。
- Produces: `setSyncGate(state)`、`requestInitialCloudSync(userId, { retry })`、受世代保護的 `loadCloudLibraryForAttempt(context)`。
- Produces: `#syncGate`、`#syncGateTitle`、`#syncGateMessage`、`#syncGateRetryButton`；`#appShell` 在 gate 可見時為 inert。

- [ ] **Step 1: 增加會失敗的 DOM／整合測試**

擴充 `tests/sync-gate.test.mjs`，讀取 `index.html` 與 `styles.css`，斷言：

```js
assert.match(html, /id="syncGate"/);
assert.match(html, /正在與 Supabase 同步旅行資料…/);
assert.match(html, /id="syncGateRetryButton"/);
assert.match(styles, /\.sync-gate/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(app, /requestInitialCloudSync/);
assert.match(app, /createSyncCoordinator/);
```

另用 module 的 deferred 工作測試：同使用者的兩個入口只讀一次；登出 invalidate 或 user-b retry 後，user-a 的延遲工作在 `isCurrent()` 為 false 時不得呼叫一個模擬的 `commitLibrary`。

- [ ] **Step 2: 執行測試確認先失敗**

Run: `node --test tests/sync-gate.test.mjs`

Expected: FAIL，因為 gate DOM、樣式與整合入口尚未存在。

- [ ] **Step 3: 新增閘門 DOM 與樣式**

在 `index.html` 將現有 `<main class="app-shell">` 改為具有 `id="appShell"`，並在 `</main>` 後加入：

```html
<section class="sync-gate" id="syncGate" role="dialog" aria-modal="true" aria-labelledby="syncGateTitle" hidden>
  <div class="sync-gate-card">
    <span class="sync-gate-spinner" aria-hidden="true"></span>
    <p id="syncGateTitle" role="status" aria-live="polite">正在與 Supabase 同步旅行資料…</p>
    <p id="syncGateMessage"></p>
    <button class="primary-button" id="syncGateRetryButton" type="button" hidden>重新同步</button>
  </div>
</section>
```

在 CSS 使用 fixed `inset: 0`、不透明淺色背景、較高 z-index 與置中卡片；error 時不要顯示 spinner；加 `@media (prefers-reduced-motion: reduce)` 關閉 spinner 動畫。不要只靠透明層阻擋，Task 2 的 app 邏輯必須同步設 `appShell.inert = true` 與 `aria-hidden="true"`。

- [ ] **Step 4: 將 app 同步入口集中到協調器**

在 app.js 首行加入版本化匯入：

```js
import { createSyncCoordinator } from "./sync-gate.js?v=1";
```

新增 DOM references 與 `setSyncGate(gateState)`：loading 顯示指定文案；error 顯示 `無法完成 Supabase 同步`、安全的錯誤訊息與重試按鈕；成功或 idle 隱藏；error 出現後 `syncGateRetryButton.focus()`。建立 `syncCoordinator` 時以 `onStateChange: setSyncGate`。

把目前 `loadCloudLibrary()` 的實際讀取邏輯拆為 `loadCloudLibraryForAttempt({ userId, isCurrent })`。每個 `await` 後、以及寫入 `state.library`、localStorage、active view state、`render()`、`restoreViewState()` 前，先執行：

```js
if (!isCurrent() || state.cloudUser?.id !== userId) return;
```

建立唯一入口 `requestInitialCloudSync(userId, options)`，只由它呼叫協調器與讀取函式。雲端沒有 trips 時，既有 `saveCloudLibrary` 需改成能在此 initial attempt 下完成首次上傳，成功前不可解除 gate；一般「立即同步」維持原本語意。

更新事件來源：

```js
// initCloudSync：在第一次 await 前先 setSyncGate({ phase: "loading" })；無 session 才 set idle。
// onAuthStateChange：SIGNED_IN 只 requestInitialCloudSync(nextUser.id)，SIGNED_OUT 先 syncCoordinator.invalidate() 再沿用登出狀態。
// signInWithPassword 成功：設定 user 後只 await requestInitialCloudSync(data.user.id)。
// signOut：invalidate()，不得讓尚未結束的讀取結果回寫。
// retry click：若仍有 state.cloudUser，requestInitialCloudSync(state.cloudUser.id, { retry: true })。
```

在啟動順序中先啟動同步 gate，再 render／restore view，使現有 session 不會閃現舊旅程；唯讀 `isReadonly` 直接跳過雲端初始化與 gate。

- [ ] **Step 5: 驗證行為與回歸**

Run: `node --test tests/sync-gate.test.mjs && node --test && node --check app.js && node --check sync-gate.js`

Expected: 全部 pass；無 session 只在 session 判定期間 gate，session 同步成功後才解除，錯誤停留並可 retry，舊世代不可 commit。

- [ ] **Step 6: 提交 Task 2**

```bash
git add app.js index.html styles.css tests/sync-gate.test.mjs
git commit -m "feat: block app until cloud sync completes"
```

### Task 3: 更新離線快取並完成 UI 驗收

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `sw.js`
- Modify: `tests/booking-date-tabs.test.mjs`
- Test: `tests/booking-date-tabs.test.mjs`, `tests/sync-gate.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 `sync-gate.js?v=1` 匯入與 gate DOM。
- Produces: 版本完全一致的 HTML、app、CSS、sync-gate module 與 Service Worker precache。

- [ ] **Step 1: 寫入會失敗的快取版本測試**

擴充現有 Service Worker 預快取測試，讀取 `index.html` 的 `styles.css?v=N`、`app.js?v=N` 與 `app.js` 的 `sync-gate.js?v=N`，並 assert `sw.js` 的 cache name 已從 `trip-notebook-v154` 提升，且 assets 包含完全相同的三個 URL。範例：

```js
assert.match(worker, /const CACHE_NAME = "trip-notebook-v155"/);
assert.match(worker, /"\.\/sync-gate\.js\?v=1"/);
```

實際版本由目前檔案讀取結果加一決定；計畫中的 `v155` 只是本次基準 `v154` 的預期值，若基底已前進，所有四處一起使用「現況 + 1」。

- [ ] **Step 2: 執行快取測試確認失敗**

Run: `node --test tests/booking-date-tabs.test.mjs`

Expected: FAIL，因為尚未預快取同步模組且 cache generation 未遞增。

- [ ] **Step 3: 同步版本與 Service Worker**

將 `index.html` 的 CSS 與 app query version 各遞增；將 `app.js` 的 `sync-gate.js?v=1` 版本與它一致地加入 `sw.js` assets；將 `sw.js` cache name 遞增一代。確認 app 改動後的每個本機 module 都由新版 precache 指到，不遺漏 `todo-sync.js`、`ui-presentation.js`、`booking-date-tabs.js` 的既有固定版本。

- [ ] **Step 4: 跑完整檢查**

Run: `node --test && node --check app.js && node --check sync-gate.js && node --check sw.js && git diff --check`

Expected: 0 failures、全部 syntax check exit 0、diff check 無輸出。

- [ ] **Step 5: 本機 UI 驗收**

啟動靜態伺服器：

```bash
python3 -m http.server 4175 --directory .
```

用瀏覽器在 1280×900 與 390×844 驗證三種狀態並保留截圖路徑／console 結果於 Task report：

1. 模擬已登入、延遲同步：loading 覆蓋全螢幕，文案完全正確，背後 app 無法點擊或 Tab。
2. 模擬失敗：顯示標題、非敏感原因與 `重新同步`；焦點在按鈕，按 Enter 可開始新世代。
3. 模擬成功或無 session：gate 消失，既有首頁／旅程可正常使用；唯讀 URL 不顯示 gate。

Console errors 必須為空；若要 mock Supabase，不可使用真實帳密或寫入正式資料。

- [ ] **Step 6: 提交 Task 3**

```bash
git add app.js index.html styles.css sw.js tests/booking-date-tabs.test.mjs tests/sync-gate.test.mjs
git commit -m "chore: cache Supabase sync gate"
```

## Coverage Review

- 驗收 1、2：Task 2 的 gate、唯一協調器與受保護資料套用；Task 3 的雙尺寸 UI 檢查。
- 驗收 3：Task 1 error state，Task 2 retry DOM／焦點與安全錯誤，Task 3 error UI 檢查。
- 驗收 4：Task 1 generation tests，Task 2 所有登入來源只走同一入口。
- 驗收 5、6：Task 2 的 readonly/signout guard 與不變更 Supabase 實作邊界。
- 驗收 7：Task 2 HTML、inert、aria、focus、reduced motion。
- 驗收 8：Task 3 版本／precache test、syntax、完整 node test 與正式發布前 UI 證據。
