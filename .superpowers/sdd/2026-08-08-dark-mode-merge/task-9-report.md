# Task 9：記帳進階設定深色內層修正

日期：2026-08-08

## 範圍

- 依 `release-review.md` 修正 expenses advanced 展開區的淺色內層。
- 只修改 `styles.css`、`tests/theme-mode.test.js` 與本報告。
- 未修改 `app.js`、`index.html`、`sw.js`，本階段不調整 PWA 版本。

## RED

先新增「深色記帳進階設定的 member、rate 與 ledger 內層不會回退淺色底」契約測試，再執行：

```text
node --test --test-name-pattern='記帳進階設定' tests/theme-mode.test.js
```

結果：`0 pass / 1 fail`。失敗原因是找不到 expenses 範圍內的 `.member-edit-row` 深色 selector，證明測試可捕捉 release review 指出的缺口。

## GREEN

在 `styles.css` 檔尾加入高 specificity、明確列舉且限制於 expenses 畫面的規則：

- surface：`.member-edit-row`、`.exchange-rate-row`、`.member-ledger-card`、`.ledger-row`
- input：`.member-edit-row input`、`.exchange-rate-row input`
- ledger header：`.ledger-head`

測試同時驗證：

- surface／input 使用正確深色 token。
- override 位於各自淺色來源規則之後。
- expenses-scoped selector specificity 高於原始 component selector。

目標測試結果：`1 pass / 0 fail`。

## Task 8 防回退

```text
node --test --test-name-pattern='bookings/todos|accent' tests/theme-mode.test.js
```

結果：`3 pass / 0 fail`。bookings／todos tabs、readonly banner 與 accent 對比契約未回退。

完整主題測試：`20 pass / 0 fail`。

## 完整驗證

- `node --check app.js`：通過。
- `node --test tests/*.test.js tests/*.test.mjs`：`213 pass / 0 fail`（原 212 筆加上本次 1 筆契約測試）。
- `git diff --check`：通過。
- `git diff -- app.js index.html sw.js`：無差異，PWA 與程式邏輯未變更。
