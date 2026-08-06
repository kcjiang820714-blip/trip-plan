import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `找不到 ${name}()`);
  const nextFunction = appSource.indexOf("\nfunction ", start + 1);
  return appSource.slice(start, nextFunction >= 0 ? nextFunction : undefined);
}

test("交通預訂不再保留重複的出發日期與時間 DOM 欄位", () => {
  assert.doesNotMatch(htmlSource, /id="bookingDepartureDateInput"/, "交通預訂應只使用上方日期欄位");
  assert.doesNotMatch(htmlSource, /id="bookingDepartureTimeInput"/, "交通預訂應只使用上方時間欄位");
  assert.doesNotMatch(appSource, /bookingDepartureDateInput/, "JavaScript 不得再參考移除的出發日期欄位");
  assert.doesNotMatch(appSource, /bookingDepartureTimeInput/, "JavaScript 不得再參考移除的出發時間欄位");
});

test("syncBookingStayFields 在交通預訂改用出發標籤並隱藏通用地點", () => {
  const source = functionSource("syncBookingStayFields");

  assert.match(source, /bookingDateLabel\.firstChild\.textContent\s*=\s*isStay\s*\?\s*"入住日期"\s*:\s*isTransport\s*\?\s*"出發日期"\s*:\s*"日期"/, "交通類型的日期標籤應顯示「出發日期」");
  assert.match(source, /bookingTimeLabel\.firstChild\.textContent\s*=\s*isStay\s*\?\s*"check-in 時間"\s*:\s*isTransport\s*\?\s*"出發時間"\s*:\s*"時間"/, "交通類型的時間標籤應顯示「出發時間」");
  assert.match(source, /bookingPlaceInput\.closest\("label"\)\.hidden\s*=\s*isTransport/, "交通類型應隱藏通用地點欄位");
});

test("交通預訂送出時，booking 日期與時間會同步到 transport 出發資料", () => {
  const submitStart = appSource.indexOf('bookingForm.addEventListener("submit"');
  const submitSource = appSource.slice(submitStart, appSource.indexOf("\n});", submitStart) + 4);

  assert.ok(submitStart >= 0, "找不到預訂送出處理器");
  assert.match(submitSource, /departureDate:\s*bookingDateInput\.value/, "交通出發日期必須取自 booking.date 的輸入欄位");
  assert.match(submitSource, /departureTime:\s*bookingTimeInput\.value/, "交通出發時間必須取自 booking.time 的輸入欄位");
});

test("syncTransportFields 在交通行程隱藏通用時間並取消其必填", () => {
  const source = functionSource("syncTransportFields");

  assert.match(source, /timeInput\.closest\("label"\)\.hidden\s*=\s*isTransport/, "交通類型應隱藏通用時間欄位");
  assert.match(source, /timeHourInput\.required\s*=\s*!isTransport/, "交通類型不應要求通用小時欄位");
  assert.match(source, /timeMinuteInput\.required\s*=\s*!isTransport/, "交通類型不應要求通用分鐘欄位");
});

test("開啟舊交通行程時，以 item.time 回填第一段出發時間", () => {
  const source = functionSource("openItemDialog");

  assert.match(source, /item\.type\s*===\s*"交通"/, "舊資料回填應只套用於交通行程");
  assert.match(source, /transportSegmentList\[0\]\.departureTime\s*=\s*item\.time/, "第一段缺少出發時間時應回填既有 item.time");
});

test("交通行程送出時，以第一段出發時間同步寫入 item.time", () => {
  const submitStart = appSource.indexOf('itemForm.addEventListener("submit"');
  const submitSource = appSource.slice(submitStart, appSource.indexOf("\n});", submitStart) + 4);

  assert.ok(submitStart >= 0, "找不到行程送出處理器");
  assert.match(submitSource, /item\.time\s*=\s*item\.transportSegments\[0\]\?\.departureTime\s*\|\|\s*""/, "交通行程應以第一段出發時間作為 item.time");
});
