import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  getAvailableBookingDates,
  getBookingScheduleDateForTabs,
  renderBookingDateTabs,
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

test("空分類沒有日期頁籤且沒有作用中日期", () => {
  const availableDates = getAvailableBookingDates([]);

  assert.deepEqual(availableDates, []);
  assert.equal(resolveActiveBookingDate(availableDates, "2026-07-03"), "");
});

test("只有日期未定預訂時隱藏日期頁籤但保留未定卡片", () => {
  const onlyUndated = [{ type: "餐廳", name: "尚未選定餐廳" }];

  assert.deepEqual(getAvailableBookingDates(onlyUndated), []);
  assert.deepEqual(splitBookingsByDate(onlyUndated, "").scheduled, []);
  assert.deepEqual(splitBookingsByDate(onlyUndated, "").undated, onlyUndated);
});

test("Service Worker 預快取目前頁面載入的樣式、程式與日期頁籤模組", async () => {
  const listeners = new Map();
  const precache = { name: "", assets: [] };
  const [indexHtml, appSource, serviceWorker] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../sw.js", import.meta.url), "utf8"),
  ]);
  const context = {
    self: {
      addEventListener(name, listener) {
        listeners.set(name, listener);
      },
      skipWaiting() {},
    },
    caches: {
      async open(name) {
        precache.name = name;
        return {
          async addAll(assets) {
            precache.assets = assets;
          },
        };
      },
    },
  };
  vm.runInNewContext(serviceWorker, context);
  const installEvent = {
    waitUntil(promise) {
      this.done = promise;
    },
  };

  listeners.get("install")(installEvent);
  await installEvent.done;

  const styleUrl = indexHtml.match(/href="(\.\/styles\.css\?v=\d+)"/)?.[1];
  const appUrl = indexHtml.match(/src="(\.\/app\.js\?v=\d+)"/)?.[1];
  const dateTabsUrl = appSource.match(/from "(\.\/booking-date-tabs\.js\?v=\d+)"/)?.[1];

  assert.match(precache.name, /^trip-notebook-v\d+$/);
  assert.ok(precache.assets.includes(styleUrl));
  assert.ok(precache.assets.includes(appUrl));
  assert.ok(precache.assets.includes(dateTabsUrl));
});

test("日期頁籤輸出可點選且標示目前選取日期", () => {
  const markup = renderBookingDateTabs(["2026-07-01", "2026-07-02"], "2026-07-02");

  assert.match(markup, /data-booking-date="2026-07-01"/);
  assert.match(markup, />7\/2（週四）</);
  assert.match(markup, /data-booking-date="2026-07-02"[^>]*aria-pressed="true"/);
});

test("依分類取得日期後，日期清單只包含該分類目前日期的卡片", () => {
  const allDates = getAvailableBookingDates(bookings);
  const ticketDates = getAvailableBookingDates(ticketBookings);
  const activeAllDate = "2026-07-03";
  const activeTicketDate = "2026-07-03";

  assert.deepEqual(allDates, ["2026-07-01", "2026-07-02", "2026-07-03"]);
  assert.deepEqual(ticketDates, ["2026-07-03"]);
  assert.equal(splitBookingsByDate(bookings, activeAllDate).scheduled.length, 2);
  assert.equal(splitBookingsByDate(ticketBookings, activeTicketDate).scheduled.length, 2);
});
