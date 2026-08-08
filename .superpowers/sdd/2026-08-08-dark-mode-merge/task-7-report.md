# Task 7 最終修正報告

## 範圍

只處理 `final-review.md` 的 1 Critical + 3 Important：

1. 補齊深色全 App 主要 surface，並修正 install panel 的 DOM selector。
2. 修正 `ref-coral` / `ref-blue` 實際元件的文字對比。
3. sync gate 開啟時封鎖全域主題鈕。
4. 把主題測試升級為 DOM 關係、selector specificity / 規則位置、實際函式 harness 與對比契約。

後續專門 PWA 階段已因本 commit 的 `app.js`／`styles.css` 變更，將 v162 同步升為 v163；未改動其他模組 URL 或功能。

## PWA v163 追補

- `index.html` 的 CSS 與 app query string 均為 `v=163`。
- `app.js` 註冊 `./sw.js?v=163`。
- `sw.js` 的 `CACHE_NAME` 為 `trip-notebook-v163`，並預快取 `styles.css?v=163`、`app.js?v=163`。
- `DARK_MODE_PWA_ASSET_VERSION` 由 `162` 升為 `163`。
- TDD RED：先升版本鎖定，`node --test tests/theme-mode.test.js` 17 項中僅版本測試失敗（實際 `162`、期望 `163`）；同步後轉為 17/17 通過。

## TDD 記錄

### RED

先只修改 `tests/theme-mode.test.js`，執行：

```text
node --test tests/theme-mode.test.js
tests 17 / pass 12 / fail 5
```

5 個預期失敗分別是：

- sync gate 沒有 disabled / inert / aria-hidden 主題鈕。
- trip 主要 panels、appbar、bottom nav、booking-side-card 缺深色 cascade。
- landing / home / editor 缺深色 surface 與 field 規則。
- install panel 仍使用不可能命中的 `#tripView ... .install-panel`。
- 實際 coral / blue accent 元件缺高對比文字 token。

sync harness 首次因舊 `functionSource` 無法解析含預設物件參數的函式而產生語法錯誤；先修正測試擷取器後重跑，測試會因 `themeToggleButton.disabled === false` 而正確 RED。

瀏覽器第一輪驗收又發現 editor 內層「每日標題／旅程分段／每日天氣」panel 仍淺底，再先擴充測試並確認 RED：

```text
node --test --test-name-pattern='landing.*home.*editor' tests/theme-mode.test.js
tests 1 / pass 0 / fail 1
```

### GREEN

實作後單檔主題測試：

```text
node --test tests/theme-mode.test.js
tests 17 / pass 17 / fail 0
```

## 實作摘要

### Surface / cascade

- CSS 檔尾用明確 selector 覆蓋 landing hero/ticket/stats、cloud panel、trip card、editor 與內層 panel、editor/cloud inputs、手機 appbar/bottom nav、desktop sidebar/booking side cards，以及 itinerary/todo/expense 主要 panels。
- `#tripView` 內的規則使用 `html[data-theme="dark"] #tripView[data-active-section] ...` 取得足夠 specificity，並位於後段桌機淺色規則之後。
- install panel 根據真實 DOM 直接子節點關係改用 `html[data-theme="dark"] #appShell > #installPanel.install-panel`。
- 沒有使用 `*` 通配 override，也沒有改動 print 白底 `!important`、sync gate surface 與 flexible-stop surface。

### Contrast

- 保留 bright `--ref-coral: #ff9b83` / `--ref-blue: #90bfd1` 作為 icon/text accent，新增 `--ref-accent-ink: #111a18`。
- 將實際 coral / blue 背景的 primary buttons、booking active tabs、date/day active tabs、todo/expense add buttons 改用深色文字。
- 測試同時守住 token 組合與 gradient stops；最低契約為 `#111a18` on `#688ca1` = 4.94:1，高於 4.5:1。

### Sync gate

- `setSyncGate` 在 loading/error 時對主題鈕設定 `disabled = true`、`inert = true`、`aria-hidden="true"`。
- idle 時恢復 enabled / non-inert，並移除 `aria-hidden`。
- 測試從真實 `setSyncGate` 擷取函式建 harness，不只檢查原始字串。

## 瀏覽器驗收

為避免本階段尚未升版的 v162 Service Worker 舊快取影響，最終在全新 localhost origin 驗收。

- 390px landing/home/editor/itinerary：主要 surface computed background 為 `rgb(23, 36, 32)`，field 為 `rgb(27, 42, 38)`；appbar、bottom nav、install panel 均正確深色。
- 390px sync gate：toggle 實際 `disabled=true`、`aria-hidden=true`。
- 1440px bookings：`.booking-side-card` 與 `.desktop-sidebar` 均為 `rgb(23, 36, 32)`；`#addBookingButton` / active tab 為 `rgb(17, 26, 24)` on `rgb(255, 155, 131)`。
- 1440px expenses：summary/category/settlement/settings panels 均為深色 surface。
- 已擷圖檢查上述手機與桌機畫面；console error/warning 為 0。

## 最終驗證

```text
node --check app.js
exit 0

node --test tests/*.test.js tests/*.test.mjs
tests 210 / pass 210 / fail 0

git diff --check
exit 0
```

## 風險與後續

- 本 commit 故意不升 PWA 版本，舊 origin 可能繼續顯示 v162 快取；後續專門階段必須同步升級 HTML CSS/app query、SW register、cache name 與 precache URLs。
- 未 merge、未 push。
