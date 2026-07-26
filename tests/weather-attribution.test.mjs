import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("JMA 成功預報的更新文字清楚標示加工並連到官方來源", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const renderer = app.match(/function renderWeatherUpdatedLabel\(forecast\) \{[\s\S]*?\n\}/u)?.[0] || "";
  assert.match(renderer, /source === "日本氣象廳"/u);
  assert.match(renderer, /https:\/\/www\.jma\.go\.jp\/bosai\/forecast\//u);
  assert.match(renderer, /日本氣象廳（本 App 已加工）/u);
  assert.match(renderer, /target="_blank" rel="noopener noreferrer"/u);
});

test("Open-Meteo 與 JMA 備援來源維持純文字，不帶加工標示或連結", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const renderer = app.match(/function renderWeatherUpdatedLabel\(forecast\) \{[\s\S]*?\n\}/u)?.[0] || "";
  assert.match(renderer, /escapeHtml\(source \|\| "Open-Meteo"\)/u);
  assert.doesNotMatch(renderer.replace(/source === "日本氣象廳"[\s\S]*?\n  \}/u, ""), /本 App 已加工|jma\.go\.jp/u);
});
