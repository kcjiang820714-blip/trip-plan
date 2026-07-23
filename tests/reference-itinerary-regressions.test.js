import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `找不到 ${name}`);
  const bodyStart = app.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`${name} 函式不完整`);
}

test("長行程名稱和沒有使用者照片的項目不會製造卡通圖片框", () => {
  const visual = new Function(`${functionSource("getItineraryItemVisual")}\nreturn getItineraryItemVisual;`)();
  const longTransport = visual({
    type: "交通",
    content: "福岡空港國際線ターミナル → 由布院駅前バスセンター",
    attachments: []
  });

  assert.equal(longTransport.imageSource, "");
  assert.equal(longTransport.icon, "transport");
  assert.doesNotMatch(longTransport.icon, /[\u{1F000}-\u{1FAFF}]/u);
  assert.match(app, /referenceVisual\.imageSource\s*\?\s*`<span class="itinerary-card-photo has-image"/);
  assert.match(css, /\.item-summary:not\(:has\(\.itinerary-card-photo\)\)/);
  assert.match(css, /-webkit-line-clamp:\s*3/);
});

test("分類節點使用單色 SVG，時間軸與卡片從同一個軸線起算", () => {
  assert.match(app, /function renderItineraryTypeIcon\(/);
  assert.match(app, /<svg[^>]*viewBox="0 0 24 24"/);
  assert.match(css, /\.itinerary-type-marker svg\s*\{/);
  assert.match(css, /--itinerary-axis:/);
  assert.match(css, /left:\s*var\(--itinerary-axis\)/);
});

test("已有日期和每日標題時，緊湊日期導覽保留兩者", () => {
  const format = new Function(`${functionSource("formatCompactDayLabel")}\nreturn formatCompactDayLabel;`)();
  const label = format({ date: "2026-07-28", title: "抵達福岡" }, 0);
  assert.match(label.primary, /Day 1/);
  assert.match(label.primary, /7\/28/);
  assert.equal(label.title, "抵達福岡");
  assert.doesNotMatch(label.primary, /日期未定/);
  assert.match(app, /dayCurrentLabel\.innerHTML/);
  assert.match(app, /data-day-nav-title/);
});

test("舊資料的日期顯示字串會依旅程起日轉成可計算日期，且保留每日標題", () => {
  const normalizeDay = new Function(
    `${functionSource("createUtcDate")}\n${functionSource("toDateInputValue")}\n${functionSource("addDays")}\n${functionSource("normalizeItem")}\n${functionSource("normalizeDay")}\nreturn normalizeDay;`,
  )();
  const day = normalizeDay({ date: "7/28（二）", title: "抵達福岡", items: [] }, 0, "2026-07-28");
  assert.equal(day.date, "2026-07-28");
  assert.equal(day.title, "抵達福岡");
  assert.match(app, /title:\s*booking\?\.name\s*\|\|\s*route/);
});

test("手機旅程名稱會維持單行，天氣膠囊固定顯示天氣", () => {
  assert.match(css, /#tripView\[data-active-section="itinerary"\] #tripTitle\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(css, /#tripView\[data-active-section="itinerary"\] #tripTitle\s*\{[\s\S]*?font-size:\s*clamp\(/);
  assert.match(app, /<span class="day-weather-chip-label">天氣<\/span>/);
  assert.match(css, /\.day-weather-chip\s*\{[\s\S]*?background:\s*var\(--ref-blue-soft\)/);
});

test("共同票券的標籤、按鈕與操作列有獨立可對齊的版面", () => {
  assert.match(app, /class="itinerary-shared-ticket"/);
  assert.match(app, /共同票券/);
  assert.match(css, /\.itinerary-shared-ticket\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(css, /\.itinerary-shared-ticket button\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.item-details \.card-actions\s*\{[\s\S]*?grid-template-columns:/);
});
