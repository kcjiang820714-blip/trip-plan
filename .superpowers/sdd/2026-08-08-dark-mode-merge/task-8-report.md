# Task 8 Release Review 深色修正報告

## 範圍

處理 release review 新增的 2 Important：

1. 390px bookings / todos 非 active sub-tabs 仍是近白底，readonly banner 仍是淺色。
2. todo active tab 與其他實際 white-on-accent 元件對比不足。

後續專門 PWA 階段因 CSS 變更，將 v163 同步升為 v164；未修改其他模組 URL 或功能。

## PWA v164 追補

- `index.html` 的 CSS／app query string 同步為 `v=164`。
- `app.js` 註冊 `./sw.js?v=164`。
- `sw.js` 的 `CACHE_NAME` 與兩個預快取資產同步為 `v164`。
- `DARK_MODE_PWA_ASSET_VERSION` 由 `163` 升為 `164`。
- TDD RED：先升版本鎖定，`node --test tests/theme-mode.test.js` 19 項中僅版本測試失敗（實際 `163`、期望 `164`）；同步後轉為 19/19 通過。

## TDD

### RED

先新增測試後執行：

```text
node --test tests/theme-mode.test.js
tests 19 / pass 17 / fail 2
```

兩個預期失敗：

- 找不到 bookings/todos 非 active tabs 與 readonly banner 的深色覆寫。
- 找不到 trip-section-add、todo active、完成勾選、expense avatar 等實際 accent 元件的高對比覆寫。

測試輔助程式初次對重複 selector 只取檔尾規則，會選到不含背景的 media override；先將 helper 改為可列舉所有同名規則，再確認上述 2 個 RED 均因產品行為缺口而失敗。

### GREEN

```text
node --test tests/theme-mode.test.js
tests 19 / pass 19 / fail 0
```

## 實作

### Tabs 與 readonly surface

- `html[data-theme="dark"] #bookingsPanel .sub-tab:not(.is-active)`
- `html[data-theme="dark"] .todo-category-tabs .sub-tab:not(.is-active)`
- 上述 tabs 改用 `--panel` 背景、`--ref-line` 邊線、`--ink` 文字。
- readonly banner 改用 `--ref-surface` / `--ref-line` / `--ink`。

### Accent 對比

- todo active tab 固定使用 `--ref-blue` 背景與 `--ref-accent-ink` 文字，不再因手機／桌機 cascade 切換到不相容的前景背景。
- trip-section-add 及圖示、todo 完成勾選、booking checklist 完成勾選改用 `--ref-accent-ink`。
- expense avatars 改用深色文字；將臨界的 base stop `#b56e57` 調為 `#ba735e`，將藍色 stop `#557f98` 調為 `#6e94aa`。
- 測試依實際 selector 區分：
  - bright coral/blue/green 背景必須使用深色文字。
  - brand/brand-dark 深背景的實際元件可保留白字，但每組仍需 >= 4.5:1。
  - 所有固定 gradient stops 都有獨立對比契約。

## 驗證

```text
node --check app.js
exit 0

node --test tests/*.test.js tests/*.test.mjs
tests 212 / pass 212 / fail 0

git diff --check
exit 0

git diff -- app.js index.html sw.js
no output
```

## 瀏覽器驗收

- 待補：目前 Browser 連線診斷回報沒有可用瀏覽器實例。

## 風險與後續

- 未 merge、未 push。
- 本階段不做 PWA bump。
