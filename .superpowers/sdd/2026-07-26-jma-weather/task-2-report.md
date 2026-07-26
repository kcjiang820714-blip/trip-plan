# Task 2 Report — JMA 與 Open-Meteo 整合

## 完成內容

- 新增純模組 `weather-provider.js`：日本且可精確對應時先抓 JMA；對應、HTTP 或解析失敗時，僅該地點改抓 Open-Meteo，來源標示為 `Open-Meteo（日本氣象廳備援失敗）`。
- `app.js` 仍使用既有 `weatherForecasts` 快取與更新流程，只改由 provider 寫入 `daily`、`hourly` 與實際 `source`。
- 來源摘要會依快取中的實際來源顯示；尚未抓取的日本地點明確顯示「日本氣象廳（失敗時改用 Open-Meteo）」；最後更新文字改為「資料來源」。
- 桌機 CSS 不再隱藏 `#itineraryPanel .weather-panel`；quick ticket 維持原本隱藏規則。

## 驗證

```bash
node --test tests/weather-provider.test.mjs tests/weather-desktop.test.mjs
# 6 passed, 0 failed

node --test
# 51 passed, 0 failed

node --check app.js
node --check weather-provider.js
git diff --check
# 皆成功
```

## UI 檢查

- 此環境沒有可用的桌機瀏覽器，無法擷取畫面。
- 已加入 CSS/DOM 防回歸測試，驗證桌機規則不再隱藏 weather panel，並保留 weather chip 切換、更新按鈕與 quick ticket 原規則。
