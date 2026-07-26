import assert from "node:assert/strict";
import test from "node:test";

import {
  getAvailableBookingDates,
  getBookingScheduleDateForTabs,
  resolveActiveBookingDate,
  splitBookingsByDate,
} from "../booking-date-tabs.js";

const transport = {
  type: "交通",
  date: "2026-07-02",
  transport: { departureDate: "2026-07-01" },
};
const stay = {
  type: "住宿",
  date: "2026-07-02",
  checkoutDate: "2026-07-04",
};
const ticketBookings = [
  { type: "票券", date: "2026-07-03", name: "美術館" },
  { type: "票券", date: "2026-07-03", name: "展望台" },
];
const undatedBooking = { type: "餐廳", name: "待決定" };
const bookings = [transport, stay, ...ticketBookings, undatedBooking];

test("依交通出發日與其餘預訂日期提供排序且不重複的可用日期", () => {
  assert.deepEqual(getAvailableBookingDates(bookings), [
    "2026-07-01",
    "2026-07-02",
    "2026-07-03",
  ]);
});

test("交通使用出發日，住宿只使用入住日", () => {
  assert.equal(getBookingScheduleDateForTabs(transport), "2026-07-01");
  assert.equal(getBookingScheduleDateForTabs(stay), "2026-07-02");
});

test("依選取日期分組，未定日期一律保留在未定區", () => {
  const result = splitBookingsByDate(bookings, "2026-07-03");

  assert.deepEqual(result.scheduled, ticketBookings);
  assert.deepEqual(result.undated, [undatedBooking]);
});

test("新分類或失效日期選最早日期，有效日期則保持選取", () => {
  const availableDates = ["2026-07-01", "2026-07-02", "2026-07-03"];

  assert.equal(resolveActiveBookingDate(availableDates, "2026-07-03", true), "2026-07-01");
  assert.equal(resolveActiveBookingDate(availableDates, "2026-07-09"), "2026-07-01");
  assert.equal(resolveActiveBookingDate(availableDates, "2026-07-03"), "2026-07-03");
});

test("沒有可用日期時回傳空字串", () => {
  assert.equal(resolveActiveBookingDate([], "2026-07-03"), "");
});
