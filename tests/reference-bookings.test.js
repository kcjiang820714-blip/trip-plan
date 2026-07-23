import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

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

test("預訂呈現 helper 產生今日、交通路線與類型視覺，且不改寫輸入", () => {
  const getBookingReferencePresentation = new Function(
    `${functionSource("getBookingReferencePresentation")}
return getBookingReferencePresentation;`,
  )();
  const booking = {
    type: "交通",
    name: "新幹線",
    date: "2026-06-02",
    time: "08:30",
    place: "東京車站",
    transport: {
      mode: "火車",
      company: "JR",
      number: "Nozomi 217",
      departureDate: "2026-06-02",
      departureTime: "09:03",
      departurePlace: "東京車站",
      arrivalTime: "11:22",
      arrivalPlace: "京都車站",
    },
  };
  const snapshot = structuredClone(booking);

  assert.deepEqual(getBookingReferencePresentation(booking, "2026-06-02"), {
    group: "交通",
    icon: "▰",
    tone: "blue",
    date: "2026-06-02",
    dateLabel: "今天",
    time: "09:03",
    endTime: "11:22",
    route: "東京車站 → 京都車站",
    service: "火車 · JR · Nozomi 217",
  });
  assert.deepEqual(booking, snapshot);
});

test("預訂檢查清單 helper 從實際預訂完整度產生狀態", () => {
  const buildBookingChecklist = new Function(
    `${functionSource("buildBookingChecklist")}
return buildBookingChecklist;`,
  )();
  const bookings = [
    { type: "交通", ticketUrl: "https://example.com/ticket", attachments: [], personalTickets: [] },
    { type: "住宿", date: "2026-06-02", place: "京都", attachments: [], personalTickets: [] },
    { type: "餐廳", date: "2026-06-02", time: "", place: "東山", attachments: [], personalTickets: [] },
  ];

  assert.deepEqual(buildBookingChecklist(bookings), [
    { label: "確認所有交通票券", done: true },
    { label: "住宿入住資訊", done: true },
    { label: "餐廳預約確認", done: false },
    { label: "景點門票／體驗活動", done: false },
  ]);
});

test("預訂 panel 同時提供手機全部分類與桌機中央、右側容器", () => {
  const panel = html.match(/<section class="trip-section-panel" id="bookingsPanel"[\s\S]*?<\/section>\s*<section class="trip-section-panel" id="pdfPreviewPanel"/)?.[0] ?? "";

  assert.match(panel, /data-booking-group="全部"/);
  assert.match(panel, /class="booking-workspace"/);
  assert.match(panel, /class="booking-main-column"/);
  assert.match(panel, /class="booking-side-column"/);
  assert.match(panel, /id="bookingUpcomingSummary"/);
  assert.match(panel, /id="bookingChecklist"/);
});

test("手機焦點卡與桌機三欄工作區符合參考版型", () => {
  assert.match(css, /#tripView\[data-active-section="bookings"\]\s+\.trip-appbar\s*\{[^}]*grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)\s+44px/s);
  assert.match(css, /#tripView\[data-active-section="bookings"\]\s+\.trip-appbar\s+\.title-group\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.booking-focus-card\s*\{[^}]*background:[^}]*#f3654b/s);
  assert.match(css, /\.booking-focus-qr\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /#bookingsPanel\s+\.sub-tabs\s*\{[^}]*overflow-x:\s*auto/s);

  const desktop = css.match(/@media \(min-width:\s*1100px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.match(desktop, /\.booking-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+340px/s);
  assert.match(desktop, /#bookingList\s*\{[^}]*position:\s*relative/s);
  assert.match(desktop, /\.booking-side-column\s*\{[^}]*display:\s*grid/s);
});

test("預訂渲染保留票券、附件、編輯、權限入口並填入桌機摘要", () => {
  assert.match(app, /renderBookingTicketActions\(booking,\s*trip/);
  assert.match(app, /renderBookingAttachmentActions\(booking/);
  assert.match(app, /canManageTrip\(trip\)/);
  assert.match(app, /data-edit-booking=/);
  assert.match(app, /bookingUpcomingSummary\.innerHTML\s*=\s*renderBookingUpcomingSummary/);
  assert.match(app, /bookingChecklist\.innerHTML\s*=\s*renderBookingChecklist/);
});
