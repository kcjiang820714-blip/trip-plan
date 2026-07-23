import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("詳細區塊會有條件輸出完整行程內容與備註，且不輸出預設備註", () => {
  const renderTripStart = appSource.indexOf("function renderTrip()");
  const renderTravelDayPanelStart = appSource.indexOf("function renderTravelDayPanel()");
  const tripSource = appSource.slice(renderTripStart, renderTravelDayPanelStart);

  assert.ok(renderTripStart >= 0, "找不到 renderTrip() 函式");
  assert.match(tripSource, /item\.content\s*\?\s*`<p class="item-detail-content">\$\{escapeHtml\(item\.content\)\}<\/p>`\s*:\s*""/, "完整行程內容必須只在 item.content 存在時輸出，且必須跳脫 HTML");
  assert.match(tripSource, /item\.note\s*\?\s*`<p class="item-detail-note">\$\{escapeHtml\(item\.note\)\}<\/p>`\s*:\s*""/, "完整備註必須只在 item.note 存在時輸出，且不得以預設文字代替");
  assert.doesNotMatch(tripSource, /item\.note\s*\|\|\s*"沒有備註"/, "詳細區塊不得顯示「沒有備註」");
});

test("預覽維持兩行截斷，詳細文字則可正常換行", () => {
  assert.match(cssSource, /\.item-content-preview\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/, "卡片預覽必須維持兩行截斷");
  assert.match(cssSource, /\.item-detail-content,\s*\.item-detail-note\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/, "詳細文字必須可在長字串時換行");
  assert.doesNotMatch(cssSource, /\.item-detail-content,\s*\.item-detail-note\s*\{[\s\S]*?-webkit-line-clamp\s*:/, "詳細文字不得被行數截斷");
});
