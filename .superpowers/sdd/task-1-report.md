# Task 1 報告：安全回退點與導覽結構測試

## 修改內容

- 建立 `codex-backup-20260723-mobile-first-ui/`，內含修改前的 `index.html`、`styles.css`、`app.js`。
- 新增 `tests/mobile-navigation.test.js`，保護手機底部導覽只保留「總覽、預訂、待辦、記帳」四個主功能與中央新增按鈕，且不再包含 PDF。
- 將 PDF 從 `#tripSectionTabs` 移除，改在 `.trip-appbar` 右側加入可存取的「更多」按鈕（`#openPdfPreviewButton`）。
- 「更多」會把 `state.activeTripSection` 設為 `pdf`，呼叫 `renderTrip()`，並保存目前畫面狀態；既有 PDF 預覽、圖片控制與列印／匯出功能未修改。
- `renderTripSectionTabs()` 僅將四個主頁籤標示為作用中；PDF 畫面仍正確顯示 PDF panel。
- 中央新增在 PDF 畫面不再被隱藏，且會沿用既有 `openItemDialog()`，讓使用者自行從原有類型選單選擇新增行程類型。

## 測試與結果

1. 回退副本建立前執行：

   ```bash
   mkdir -p codex-backup-20260723-mobile-first-ui
   cp index.html styles.css app.js codex-backup-20260723-mobile-first-ui/
   cmp index.html codex-backup-20260723-mobile-first-ui/index.html
   cmp styles.css codex-backup-20260723-mobile-first-ui/styles.css
   cmp app.js codex-backup-20260723-mobile-first-ui/app.js
   ```

   結果：三個 `cmp` 均無輸出、結束碼為 0。後續原檔修改後，`index.html` 與 `app.js` 與回退副本不同屬預期結果；`styles.css` 未改動。

2. RED：

   ```bash
   node --test tests/mobile-navigation.test.js
   ```

   結果：如預期失敗，原因是原本底部導覽仍有 `data-trip-section="pdf"`。

3. GREEN／完整回歸：

   ```bash
   node --check app.js
   node --test tests/mobile-navigation.test.js tests/*.test.js
   ```

   結果：結束碼 0；共 64 項測試通過、0 項失敗。

4. PDF 入口靜態驗證：確認 HTML 含有正確的「更多」按鈕與 ARIA 標籤，且 app.js 的 click handler 會設為 `pdf`、執行 `renderTrip()`；同時確認 PDF 畫面下的中央新增會開啟 `openItemDialog()`。結果通過。

## 自我審查

- 未修改任何行程、預訂、待辦或記帳的資料結構。
- PDF panel、預覽產生與列印／匯出處理函式均保留。
- 未改動 `styles.css`，沒有進入 Task 2 之後的視覺美化範圍。
- 已執行 `git diff --check`，無空白格式錯誤。
- 無法取得可用的介面驗收瀏覽器，因此未產生 UI 擷圖；以全套測試與入口／事件的靜態驗證補足。後續整合時仍建議在手機寬度實際點擊「更多」與中央新增做一次 smoke test。

## Commit

- `ca53927 feat: simplify mobile trip navigation`

## 追加修正：PDF 中央新增權限

- 修正 `renderTripSectionTabs()`：當使用者沒有管理權限且目前在 PDF 預覽頁時，中央「＋」新增按鈕會隱藏；具管理權限的使用者維持可看見並使用。
- `tests/mobile-navigation.test.js` 新增「更多」按鈕存在且 `aria-label="開啟 PDF 預覽"` 的靜態斷言，並新增 PDF 無管理權的中央新增隱藏回歸測試。

### 測試結果

```bash
node --check app.js && node --test tests/mobile-navigation.test.js tests/*.test.js
```

結果：語法檢查通過；66 項測試通過、0 項失敗。
