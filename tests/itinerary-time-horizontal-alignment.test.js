import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("手機版所有行程時間共用固定寬度欄位與同一條水平中心線", () => {
  const finalContract = css.slice(css.lastIndexOf("/* Itinerary time horizontal alignment contract:"));

  assert.match(finalContract, /--itinerary-time-column-width:\s*72px/);
  assert.match(
    finalContract,
    /\.item-summary:has\(\.itinerary-time-range\)[^{]*\{[\s\S]*?grid-template-columns:\s*var\(--itinerary-time-column-width\)\s+minmax\(0,\s*1fr\)\s+24px/
  );
  assert.match(
    finalContract,
    /\.itinerary-time-range\s*\{[\s\S]*?width:\s*100%[\s\S]*?justify-self:\s*stretch[\s\S]*?text-align:\s*center/
  );
  assert.match(
    finalContract,
    /\.itinerary-time-range\.is-single\s+\.itinerary-time-start\s*\{[\s\S]*?width:\s*100%/,
    "單一時間的文字層也必須撐滿共用時間欄，否則只會在自身寬度內置中"
  );
});

test("桌機版單一、起訖與交通時間也共用同一個時間欄寬度", () => {
  const finalContract = css.slice(css.lastIndexOf("/* Itinerary time horizontal alignment contract:"));

  assert.match(
    finalContract,
    /@media\s*\(min-width:\s*1100px\)[\s\S]*?--itinerary-time-column-width:\s*82px/
  );
  assert.match(
    finalContract,
    /@media\s*\(min-width:\s*1100px\)[\s\S]*?\.item-summary:has\(\.itinerary-time-range\)[^{]*\{[\s\S]*?grid-template-columns:\s*var\(--itinerary-time-column-width\)\s+48px\s+minmax\(0,\s*1fr\)\s+26px/
  );
});
