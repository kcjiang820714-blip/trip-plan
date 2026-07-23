import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `找不到 ${name}`);
  const bodyStart = app.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }

  throw new Error(`${name} 函式不完整`);
}

test("679px 以下保留四個面板的單欄手機操作規則", () => {
  const mobile = css.match(/@media \(max-width: 679px\) \{([\s\S]*)\}\s*$/)?.[1] ?? "";

  assert.match(mobile, /#itineraryPanel\s*\{[^}]*display:\s*flex/);
  assert.match(mobile, /\.travel-day-panel\s*\{[^}]*order:\s*2/);
  assert.match(mobile, /\.quick-ticket-panel\s*\{[^}]*order:\s*3/);
  assert.match(mobile, /\.itinerary-timeline-heading\s*\{[^}]*order:\s*4/);
  assert.match(mobile, /\.timeline\s*\{[^}]*order:\s*5/);
  assert.match(mobile, /\.sub-tabs\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(mobile, /\.booking-cover\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(mobile, /\.todo-main-cell input\s*\{[^}]*width:\s*24px/);
  assert.match(mobile, /\.todo-table\s*\{[^}]*gap:\s*\d+px[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none/);
  assert.match(mobile, /\.todo-table-row:not\(\.todo-table-head\)\s*\{[^}]*border:\s*1px[^}]*border-radius:\s*var\(--radius-card\)[^}]*background:\s*var\(--color-surface\)/);
  assert.match(mobile, /\.expense-settings-grid,[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("預訂可標示下一筆，記帳在摘要後有新增入口", () => {
  assert.match(html, /id="bookingNextUpcoming"[\s\S]*id="bookingSubTabs"/);
  assert.match(app, /booking-next-upcoming/);
  assert.match(app, /is-next-upcoming/);
  assert.doesNotMatch(functionSource("renderBookings"), /\.sort\(/);
  assert.match(html, /<h2 id="expenseSummary">尚無支出<\/h2>\s*<\/div>\s*<button class="secondary-action expense-add-button" id="addExpenseButton"/);
});

test("下一筆預訂會跨分類挑出所有可見預訂中最早的未來項目，且不改寫原陣列", () => {
  const findNextUpcomingBooking = new Function(
    `${functionSource("getBookingScheduleDate")}
${functionSource("getBookingScheduleTime")}
${functionSource("findNextUpcomingBooking")}
return findNextUpcomingBooking;`
  )();
  const bookings = [
    { id: "restaurant", type: "餐廳", date: "2026-07-24", time: "19:00" },
    { id: "ticket", type: "景點票券", date: "2026-07-23", time: "15:00" },
    {
      id: "transport",
      type: "交通",
      date: "2026-07-25",
      time: "09:00",
      transport: { departureDate: "2026-07-23", departureTime: "13:30" }
    }
  ];
  const originalOrder = bookings.map((booking) => booking.id);

  assert.equal(findNextUpcomingBooking(bookings, "2026-07-23", "12:00")?.id, "transport");
  assert.deepEqual(bookings.map((booking) => booking.id), originalOrder);
});

test("下一筆預訂排除過期項目，並以同日時間判斷先後", () => {
  const findNextUpcomingBooking = new Function(
    `${functionSource("getBookingScheduleDate")}
${functionSource("getBookingScheduleTime")}
${functionSource("findNextUpcomingBooking")}
return findNextUpcomingBooking;`
  )();
  const bookings = [
    { id: "past-day", type: "住宿", date: "2026-07-22", time: "23:59" },
    { id: "past-time", type: "餐廳", date: "2026-07-23", time: "11:59" },
    { id: "later", type: "景點票券", date: "2026-07-23", time: "12:30" },
    { id: "now", type: "活動", date: "2026-07-23", time: "12:00" }
  ];

  assert.equal(findNextUpcomingBooking(bookings, "2026-07-23", "12:00")?.id, "now");
  assert.equal(findNextUpcomingBooking(bookings.slice(0, 2), "2026-07-23", "12:00"), null);
});
