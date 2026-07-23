# Task 2 執行報告：共用手機設計 token、底部安全區與響應式回歸測試

結果：DONE

## 修改範圍

- `styles.css`
  - 在檔案末端新增共用設計 token：色彩、8/12/16/24px 間距、12px 卡片圓角與共用陰影。
  - `#tripView` 改用共用背景色，並預留 `92px + safe-area-inset-bottom` 的底部空間，避免固定底部導覽遮住內容。
  - 固定底部導覽改用 surface token，底部 padding 直接使用 `env(safe-area-inset-bottom)`。
  - 主要按鈕使用 primary token，最小高度固定為 44px。
  - `utility-card`、`todo-group`、`booking-card`、`expense-day-card` 統一使用 card token。
  - 在 `max-width: 679px` 下，四個主要 panel（總覽、預訂、待辦、記帳）統一使用 16px 水平內距；未改動 PDF panel 或任何頁面內容階層。
  - 在既有 `min-width: 680px` 規則僅將 app shell 最大寬度調整為 900px；既有的費用設定雙欄摘要維持不變。
- `tests/mobile-layout.test.js`
  - 新增 CSS 守門測試，確認背景 token、16px 間距 token、安全區與 680px 響應式規則存在。

## 紅燈測試（修改前）

命令：

```sh
node --test tests/mobile-layout.test.js
```

結果：失敗，因為 CSS 尚未有 `--color-bg: #F7F4EF`。這證明測試確實針對新需求守門。

## 修改後驗證

命令：

```sh
node --test tests/mobile-layout.test.js tests/*.test.js
node --check app.js
```

結果：67 個測試全部通過；`node --check app.js` 結束碼為 0，沒有語法錯誤輸出。

## 範圍確認

- 未改動 `app.js`、`index.html`、旅程資料或 Task 3 的頁面個別資訊階層。
- 保留 Task 1 建立的四個主要導覽項目與中央新增按鈕。
- 本任務只新增共用 CSS 覆寫與回歸測試。

## Concerns

目前執行環境沒有可控制的瀏覽器，因此無法產出手機 UI 擷圖；已改以 CSS 守門測試、完整回歸測試與語法檢查驗證。建議整合時在實際瀏覽器以手機寬度再確認一次底部導覽與安全區。
