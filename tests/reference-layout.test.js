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

test("桌機側欄提供四個核准主功能與更多工具入口", () => {
  const sidebar = html.match(/<aside class="desktop-sidebar"[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.match(sidebar, /data-trip-section="itinerary"[\s\S]*行程總覽/);
  assert.match(sidebar, /data-trip-section="bookings"[\s\S]*預訂與票券/);
  assert.match(sidebar, /data-trip-section="expenses"[\s\S]*旅費管理/);
  assert.match(sidebar, /data-trip-section="todos"[\s\S]*旅行清單/);
  assert.match(sidebar, /data-desktop-trip-tools/);
});

test("section meta 使用桌機參考圖的頁名且未知頁回到行程", () => {
  const getDesktopSectionMeta = new Function(
    `${functionSource("getDesktopSectionMeta")}
return getDesktopSectionMeta;`,
  )();

  assert.equal(getDesktopSectionMeta("itinerary").title, "行程總覽");
  assert.equal(getDesktopSectionMeta("bookings").title, "預訂與票券");
  assert.equal(getDesktopSectionMeta("expenses").title, "旅費管理");
  assert.equal(getDesktopSectionMeta("todos").title, "旅行清單");
  assert.deepEqual(getDesktopSectionMeta("unknown"), getDesktopSectionMeta("itinerary"));
});

test("reference-match 設計 token、手機底欄與桌機雙欄斷點存在", () => {
  assert.match(css, /--ref-paper:\s*#f8f5ee/i);
  assert.match(css, /--ref-ink:\s*#172b36/i);
  assert.match(css, /--ref-blue:\s*#557f98/i);
  assert.match(css, /--ref-coral:\s*#f3654b/i);
  assert.match(css, /\.trip-section-tabs\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /@media\s*\(min-width:\s*1100px\)/);
  assert.match(css, /\.desktop-sidebar\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+380px/);
});
