import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("交通預訂的抵達時間使用與出發時間相同的時分選單", () => {
  assert.match(htmlSource, /<input id="bookingArrivalTimeInput" type="hidden"\s*\/>/, "抵達時間應保留 hidden 欄位作為資料來源");
  assert.match(htmlSource, /<select id="bookingArrivalHourInput" aria-label="抵達小時"><\/select>/, "抵達時間應提供小時選單");
  assert.match(htmlSource, /<select id="bookingArrivalMinuteInput" aria-label="抵達分鐘"><\/select>/, "抵達時間應提供分鐘選單");
  assert.doesNotMatch(htmlSource, /id="bookingArrivalTimeInput" type="time"/, "抵達時間不應使用格式不同的原生時間輸入欄位");
});

test("開啟與送出交通預訂時，抵達時分選單會同步既有資料與 hidden 欄位", () => {
  assert.match(appSource, /const bookingArrivalHourInput = document\.querySelector\("#bookingArrivalHourInput"\);/, "應取得抵達小時選單");
  assert.match(appSource, /const bookingArrivalMinuteInput = document\.querySelector\("#bookingArrivalMinuteInput"\);/, "應取得抵達分鐘選單");
  assert.match(appSource, /setTimeSelectPair\(bookingArrivalHourInput, bookingArrivalMinuteInput, booking\?\.transport\?\.arrivalTime \|\| ""\);/, "編輯舊預訂時應回填抵達時分選單");
  assert.match(appSource, /\[bookingArrivalTimeInput, bookingArrivalHourInput, bookingArrivalMinuteInput\]/, "抵達時分變更時應同步 hidden 欄位");

  const submitStart = appSource.indexOf('bookingForm.addEventListener("submit"');
  const submitSource = appSource.slice(submitStart, appSource.indexOf("\n});", submitStart) + 4);
  assert.match(submitSource, /syncHiddenTimeInput\(bookingArrivalTimeInput, bookingArrivalHourInput, bookingArrivalMinuteInput\);/, "送出前應同步抵達 hidden 時間");
  assert.match(submitSource, /arrivalTime:\s*bookingArrivalTimeInput\.value/, "仍應以 hidden 抵達時間寫入 transport 資料");
});
