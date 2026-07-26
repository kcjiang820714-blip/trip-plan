import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("桌機行程頁不會隱藏天氣面板，仍保留 quick ticket 的原規則", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const desktopRules = styles.slice(styles.indexOf("@media (min-width: 680px)"));
  assert.doesNotMatch(desktopRules, /#itineraryPanel\s+\.weather-panel\s*,?[\s\S]{0,160}?display:\s*none/u);
  assert.match(desktopRules, /#itineraryPanel\s+\.quick-ticket-panel[\s\S]{0,120}?display:\s*none/u);
});

test("天氣 chip 的切換與更新按鈕仍由行程頁事件處理", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /weatherPanel\.hidden\s*=\s*!weatherPanel\.hidden/u);
  assert.match(app, /data-refresh-weather/u);
  assert.match(app, /fetchWeatherForActiveDay\(\)/u);
});
