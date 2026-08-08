# Task 3：PWA 快取更新與回歸驗證

## 完成內容

- PWA 資產世代由 `159` 提升為 `160`。
- `index.html` 的 `styles.css` 與 `app.js` query string 均為 `v=160`。
- `app.js` 的 Service Worker 註冊 URL 為 `./sw.js?v=160`。
- `sw.js` 的 `CACHE_NAME` 為 `trip-notebook-v160`，並預快取 `styles.css?v=160` 與 `app.js?v=160`。
- 未變動 `sync-gate`、`todo`、`weather`、日期頁籤或其他模組的 URL。

## TDD 證據

1. 在 `tests/theme-mode.test.js` 新增「深色模式 CSS 與 HTML 更新會提升 PWA 快取世代」回歸測試，並以集中定義的 `DARK_MODE_PWA_ASSET_VERSION = "160"` 鎖定本次資產世代。後續若再修改此深色模式資產，須連同此契約與所有 PWA 版本位置升版。
2. RED：執行 `node --test tests/theme-mode.test.js tests/booking-date-tabs.test.mjs`，新增測試因版本仍為 `159` 失敗；其餘 24 項通過。
3. GREEN：以最小修改同步上述五個 PWA 版本位置至 `160`。
4. 審查修正 RED：暫時將精確期望設為 `159`，`node --test tests/theme-mode.test.js` 如預期以 `'160' !== '159'` 失敗；再恢復集中定義的 `160`，不修改產品碼。

## 驗證結果

- `node --test tests/theme-mode.test.js tests/booking-date-tabs.test.mjs`：25/25 通過。
- `node --check app.js`：通過。
- `node --check sw.js`：通過。
- `node --test tests/*.test.js tests/*.test.mjs`：205/205 通過。
- `git diff --check`：通過，沒有空白錯誤。
- 模組 URL diff 檢查：沒有 `sync-gate`、`todo`、`weather`、日期頁籤或 JMA 模組 URL 的異動。

## 範圍說明

`styles.css` 本身不含可調整的資產 query string，因此本任務未修改該檔；CSS 的快取 query 位於 `index.html`，已同步升為 `v=160`。
