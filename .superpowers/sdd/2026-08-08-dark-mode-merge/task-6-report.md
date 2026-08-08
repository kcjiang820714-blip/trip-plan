# Task 6：深色模式 CSS 修補後的 PWA 快取升版

## v162 修改內容

- 因 `1345ce2` 再次調整深色卡片 CSS 規則，將 PWA 資產世代由 `161` 升為 `162`。
- `index.html` 的 `styles.css` 與 `app.js` query string 均同步為 `v=162`。
- `app.js` 的 Service Worker 註冊 URL 同步為 `./sw.js?v=162`。
- `sw.js` 的快取名稱為 `trip-notebook-v162`，並預快取 `styles.css?v=162` 與 `app.js?v=162`。
- 未修改其他模組 URL 或功能邏輯。

## TDD 證據

1. 先將 `tests/theme-mode.test.js` 的 `DARK_MODE_PWA_ASSET_VERSION` 由 `161` 提升為 `162`。
2. RED：執行 `node --test tests/theme-mode.test.js`，13 項中僅 PWA 世代測試失敗，錯誤為實際 `161` 與期望 `162` 不一致。
3. GREEN：只同步五個 PWA 版本位置後，再執行同一測試檔，13/13 通過。

## 驗證

- `node --check app.js && node --check sw.js`：通過。
- `node --test tests/*.test.js tests/*.test.mjs`：206/206 通過。
- `git diff --check`：通過，沒有空白錯誤。
- diff 範圍檢查：產品碼只修改 `app.js`、`index.html`、`sw.js` 的 v161 → v162；測試只更新指定快取世代。

## 備註

直接以所有 `.js`／`.mjs` 檔案執行 Node 時，`tests/capture-polish.mjs` 會嘗試連線本機 Chrome DevTools 的 `127.0.0.1:9224`，在未啟動瀏覽器環境失敗。它是截圖工具而非 `.test.*` 回歸測試；正式測試集合已全數通過。
