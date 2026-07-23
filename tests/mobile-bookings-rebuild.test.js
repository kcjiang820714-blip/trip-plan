import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("預訂頁頂部顯示目前頁名並保留旅程名稱", () => {
  assert.match(html, /id="tripPageName"/);
  assert.match(app, /function getTripSectionPageName\(section\)/);
  assert.match(app, /bookings:\s*"預訂"/);
  assert.match(app, /tripView\.dataset\.activeSection\s*=\s*state\.activeTripSection/);
});

test("下一個預訂使用獨立焦點卡而非重用一般預訂卡", () => {
  assert.match(app, /function renderUpcomingBookingFocus\(booking,\s*trip\)/);
  assert.match(app, /booking-focus-card/);
  assert.match(app, /booking-focus-time/);
  assert.match(app, /booking-focus-route/);
  assert.match(app, /booking-focus-actions/);
  assert.match(app, /renderUpcomingBookingFocus\(nextUpcomingBooking,\s*trip\)/);
  assert.doesNotMatch(app, /renderBookingCard\(nextUpcomingBooking,\s*trip,\s*true\)/);
});

test("焦點卡與清單卡保留票券附件與編輯事件入口", () => {
  assert.match(app, /function renderBookingTicketActions\(booking,\s*trip/);
  assert.match(app, /data-open-ticket-url=/);
  assert.match(app, /data-open-attachment=/);
  assert.match(app, /data-edit-booking=/);
  assert.match(app, /bookingNextUpcoming\.addEventListener\("click",\s*handleBookingClick\)/);
  assert.match(app, /bookingList\.addEventListener\("click",\s*handleBookingClick\)/);
});

test("390px 預訂版面有單列橫滑分類、高辨識焦點卡與單欄清單", () => {
  assert.match(css, /#tripView\[data-active-section="bookings"\]\s+\.trip-appbar/);
  assert.match(css, /#bookingsPanel\s+\.sub-tabs\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.booking-focus-card\s*\{[^}]*background:/);
  assert.match(css, /\.booking-focus-time\s*\{[^}]*font-size:\s*(?:1\.[4-9]|2)[0-9]*rem/);
  assert.match(css, /#bookingList\s+\.booking-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
