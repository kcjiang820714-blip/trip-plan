import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("手機底部主導覽只有四個主功能並保留中央新增", () => {
  const nav = html.match(/<nav class="trip-section-tabs"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(nav, /data-trip-section="itinerary"/);
  assert.match(nav, /data-trip-section="bookings"/);
  assert.match(nav, /data-trip-section="todos"/);
  assert.match(nav, /data-trip-section="expenses"/);
  assert.match(nav, /data-trip-section-add/);
  assert.doesNotMatch(nav, /data-trip-section="pdf"/);
});

test("更多按鈕可存取地開啟 PDF 預覽", () => {
  assert.match(
    html,
    /<button class="icon-button" id="openPdfPreviewButton" type="button" aria-label="開啟 PDF 預覽">更多<\/button>/
  );
});

test("無管理權時 PDF 畫面的中央新增按鈕會隱藏", () => {
  const renderTabs = app.match(/function renderTripSectionTabs\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(renderTabs, /state\.activeTripSection === "pdf" && !canManage/);
});
