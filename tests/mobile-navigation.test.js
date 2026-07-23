import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("手機底部主導覽只有四個主功能並保留中央新增", () => {
  const nav = html.match(/<nav class="trip-section-tabs"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(nav, /data-trip-section="itinerary"/);
  assert.match(nav, /data-trip-section="bookings"/);
  assert.match(nav, /data-trip-section="todos"/);
  assert.match(nav, /data-trip-section="expenses"/);
  assert.match(nav, /data-trip-section-add/);
  assert.doesNotMatch(nav, /data-trip-section="pdf"/);
});
