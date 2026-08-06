import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("詳細區塊會有條件輸出完整行程內容與備註，且不輸出預設備註", () => {
  const renderTimelineStart = appSource.indexOf("function renderItineraryTimeline(");
  const renderWeatherPanelStart = appSource.indexOf("function renderWeatherPanel(");
  const tripSource = appSource.slice(renderTimelineStart, renderWeatherPanelStart);

  assert.ok(renderTimelineStart >= 0, "找不到 renderItineraryTimeline() 函式");
  assert.match(tripSource, /item\.content\s*\?\s*`<p class="item-detail-content">\$\{escapeHtml\(item\.content\)\}<\/p>`\s*:\s*""/, "完整行程內容必須只在 item.content 存在時輸出，且必須跳脫 HTML");
  assert.match(tripSource, /item\.note\s*\?\s*`<p class="item-detail-note">\$\{escapeHtml\(item\.note\)\}<\/p>`\s*:\s*""/, "完整備註必須只在 item.note 存在時輸出，且不得以預設文字代替");
  assert.doesNotMatch(tripSource, /item\.note\s*\|\|\s*"沒有備註"/, "詳細區塊不得顯示「沒有備註」");
});

test("預覽維持兩行截斷，詳細文字則可正常換行", () => {
  const detailRule = cssSource.match(/\.item-detail-content,\s*\.item-detail-note\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(cssSource, /\.item-content-preview\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/, "卡片預覽必須維持兩行截斷");
  assert.match(cssSource, /\.item-detail-content,\s*\.item-detail-note\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/, "詳細文字必須可在長字串時換行");
  assert.doesNotMatch(detailRule, /-webkit-line-clamp\s*:/, "詳細文字不得被行數截斷");
});
