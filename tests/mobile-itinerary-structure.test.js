import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
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

test("行程總覽使用緊湊 app bar、日期天氣抬頭與下一個行程焦點區", () => {
  const tripView = html.match(/<section id="tripView"[\s\S]*?<section class="trip-section-panel" id="bookingsPanel"/)?.[0] ?? "";

  assert.match(tripView, /class="trip-appbar-actions"/);
  assert.match(tripView, /id="dayTabs" aria-label="滑動選擇日期"/);
  assert.match(tripView, /class="day-header itinerary-day-heading"/);
  assert.match(tripView, /id="dayWeatherChip"/);
  assert.match(tripView, /id="travelDayPanel" aria-label="下一個行程"/);
  assert.match(tripView, /class="itinerary-timeline-heading"/);
});

test("橫向 Day 列會輸出所有日期並標示目前日期", () => {
  const renderScrollableDayTabs = new Function(
    "renderDayTab",
    `${functionSource("renderScrollableDayTabs")}
return renderScrollableDayTabs;`,
  )((trip, index, className, isActive) => `${index}:${className}:${isActive}`);
  const trip = { days: [{}, {}, {}, {}, {}] };

  assert.equal(
    renderScrollableDayTabs(trip, 2),
    "0::false1::false2:is-active:true3::false4::false",
  );
});

test("焦點行程選擇器在今天優先下一筆，未來日期選第一筆且不改寫陣列", () => {
  const selectItineraryFocus = new Function(
    `${functionSource("selectItineraryFocus")}
return selectItineraryFocus;`,
  )();
  const items = [
    { id: "morning", time: "09:00" },
    { id: "lunch", time: "12:30" },
    { id: "evening", time: "18:00" },
  ];
  const originalOrder = items.map((item) => item.id);

  assert.deepEqual(
    selectItineraryFocus(items, "2026-07-23", "2026-07-23", "12:00"),
    { item: items[1], label: "下一個行程" },
  );
  assert.deepEqual(
    selectItineraryFocus(items, "2026-07-24", "2026-07-23", "12:00"),
    { item: items[0], label: "下一個行程" },
  );
  assert.deepEqual(items.map((item) => item.id), originalOrder);
});

test("今天沒有後續行程時焦點卡會保留目前行程", () => {
  const selectItineraryFocus = new Function(
    `${functionSource("selectItineraryFocus")}
return selectItineraryFocus;`,
  )();
  const items = [
    { id: "morning", time: "09:00" },
    { id: "lunch", time: "12:30" },
  ];

  assert.deepEqual(
    selectItineraryFocus(items, "2026-07-23", "2026-07-23", "21:00"),
    { item: items[1], label: "目前行程" },
  );
});

test("手機行程總覽有橫滑日期、焦點卡及清楚的垂直時間軸", () => {
  const mobile = css.match(/@media \(max-width: 679px\) \{([\s\S]*)\}\s*$/)?.[1] ?? "";

  assert.match(mobile, /\.day-tabs\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/);
  assert.match(mobile, /\.itinerary-focus-card\s*\{/);
  assert.match(mobile, /#itineraryPanel \.timeline\s*\{[^}]*position:\s*relative/);
  assert.match(mobile, /#itineraryPanel \.item-card\s*\{[^}]*border-radius:\s*var\(--radius-card\)/);
});
