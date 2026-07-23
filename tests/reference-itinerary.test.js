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

test("行程視覺 helper 映射單色圖示、照片與 fallback 且不改寫資料", () => {
  const getItineraryItemVisual = new Function(
    `${functionSource("getItineraryItemVisual")}
return getItineraryItemVisual;`,
  )();
  const item = {
    type: "餐廳",
    attachments: [
      { id: "pdf", type: "application/pdf", dataUrl: "data:application/pdf;base64,x" },
      { id: "photo", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,y" },
    ],
  };
  const snapshot = structuredClone(item);

  assert.deepEqual(getItineraryItemVisual(item), {
    icon: "food",
    tone: "food",
    imageSource: "data:image/jpeg;base64,y",
    imageAlt: "餐廳行程照片",
  });
  assert.equal(getItineraryItemVisual({ type: "散步", attachments: [] }).icon, "walk");
  assert.equal(getItineraryItemVisual({ type: "其他" }).tone, "other");
  assert.deepEqual(item, snapshot);
});

test("行程 panel 有主欄與桌機天氣、統計右欄", () => {
  const panel = html.match(/<section class="trip-section-panel" id="itineraryPanel"[\s\S]*?<\/section>\s*<section class="trip-section-panel" id="bookingsPanel"/)?.[0] ?? "";

  assert.match(panel, /class="itinerary-main-column"/);
  assert.match(panel, /class="itinerary-side-column"/);
  assert.match(panel, /id="itineraryWeatherSummary"/);
  assert.match(panel, /id="itineraryStatsSummary"/);
});

test("手機行程使用照片時間軸並隱藏舊深色焦點卡", () => {
  assert.match(app, /class="itinerary-type-marker/);
  assert.match(app, /class="itinerary-card-photo/);
  assert.match(css, /#itineraryPanel \.travel-day-panel\s*\{[^}]*display:\s*none/s);
  assert.match(css, /#itineraryPanel \.item-summary\s*\{[^}]*grid-template-columns:[^}]*minmax\(0,\s*1fr\)[^}]*88px/s);
  assert.match(css, /\.itinerary-card-photo\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
  assert.match(css, /\.itinerary-mobile-add\s*\{[^}]*position:\s*fixed/s);
});

test("桌機行程使用主欄與 380px 摘要欄", () => {
  const desktop = css.match(/@media \(min-width:\s*1100px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";

  assert.match(desktop, /#itineraryPanel\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+380px/s);
  assert.match(desktop, /\.itinerary-side-column\s*\{[^}]*display:\s*grid/s);
  assert.match(desktop, /#itineraryPanel \.item-summary\s*\{[^}]*grid-template-columns:/s);
});
