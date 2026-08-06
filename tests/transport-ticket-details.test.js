import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const transportInputIds = [
  "bookingTransportModeInput",
  "bookingTransportCompanyInput",
  "bookingTransportNumberInput",
  "bookingDeparturePlaceInput",
  "bookingArrivalDateInput",
  "bookingArrivalTimeInput",
  "bookingArrivalPlaceInput",
  "bookingPassengerNameInput",
  "bookingSeatInput"
];

test("交通預訂表單提供完整且不重複的乘車資訊欄位", () => {
  assert.match(htmlSource, /id="bookingTransportFields"/, "應有交通專用欄位區塊");
  assert.match(htmlSource, /id="bookingDateInput"/, "交通表單應以共用日期欄位填寫出發日期");
  assert.match(htmlSource, /id="bookingTimeInput"/, "交通表單應以共用時間欄位填寫出發時間");

  for (const inputId of transportInputIds) {
    assert.match(htmlSource, new RegExp(`id="${inputId}"`), `交通表單應有 ${inputId} 欄位`);
  }
});

test("normalizeBooking 為新舊交通預訂提供完整預設資料", () => {
  assert.match(appSource, /function normalizeBooking\(booking\)/, "應有 normalizeBooking 函式");
  assert.match(appSource, /transport:\s*\{/, "normalizeBooking 應產出 transport 物件");

  for (const field of [
    "mode",
    "company",
    "number",
    "departureDate",
    "departureTime",
    "departurePlace",
    "arrivalDate",
    "arrivalTime",
    "arrivalPlace",
    "passengerName",
    "seat"
  ]) {
    assert.match(
      appSource,
      new RegExp(`${field}:\\s*booking\\.transport\\?\\.${field}\\s*\\|\\|\\s*""`),
      `transport.${field} 應在缺少舊資料時正規化為空字串`
    );
  }
});

test("交通預訂卡輸出路線與班次摘要", () => {
  const renderBookingMetaSource = appSource.match(/function renderBookingMeta\(booking\) \{([\s\S]*?)\n\}/)?.[0] || "";

  assert.match(renderBookingMetaSource, /booking\.type === "交通"/, "交通預訂應使用專用摘要");
  assert.match(renderBookingMetaSource, /transport\.departurePlace/, "交通預訂卡應顯示出發地");
  assert.match(renderBookingMetaSource, /transport\.arrivalPlace/, "交通預訂卡應顯示抵達地");
  assert.match(renderBookingMetaSource, /transport\.number/, "交通預訂卡應顯示班次／車次");
});

test("舊交通預訂缺少 transport 資料時，預訂卡仍顯示既有日期、時間與地點", () => {
  const transportSection = appSource.match(/if \(booking\.type === "交通"\) \{([\s\S]*?)\n  \}\n\n  if \(booking\.type !== "住宿"\)/)?.[1] || "";

  assert.match(transportSection, /booking\.date/, "舊交通預訂應回退顯示既有日期");
  assert.match(transportSection, /booking\.time/, "舊交通預訂應回退顯示既有時間");
  assert.match(transportSection, /booking\.place/, "舊交通預訂應回退顯示既有地點");
});

test("今日快速取用優先輸出交通路線與班次", () => {
  const renderQuickTicketCardSource = appSource.match(/function renderQuickTicketCard\(booking\) \{([\s\S]*?)\n\}/)?.[0] || "";

  assert.match(renderQuickTicketCardSource, /booking\.type === "交通"/, "快速取用應辨識交通預訂");
  assert.match(renderQuickTicketCardSource, /booking\.transport\.departurePlace/, "快速取用應顯示出發地");
  assert.match(renderQuickTicketCardSource, /booking\.transport\.arrivalPlace/, "快速取用應顯示抵達地");
  assert.match(renderQuickTicketCardSource, /booking\.transport\.number/, "快速取用應顯示班次／車次");
});

test("今日快速取用以交通出發日期篩選，並以出發時間排序後回退既有欄位", () => {
  const getBookingsForDaySource = appSource.match(/function getBookingsForDay\(trip, dayDate\) \{([\s\S]*?)\n\}/)?.[0] || "";
  const renderQuickTicketsSource = appSource.match(/function renderQuickTickets\(\) \{([\s\S]*?)\n\}/)?.[0] || "";

  assert.match(appSource, /function getBookingScheduleDate\(booking\)/, "應集中處理交通預訂的顯示日期");
  assert.match(appSource, /function getBookingScheduleTime\(booking\)/, "應集中處理交通預訂的顯示時間");
  assert.match(getBookingsForDaySource, /getBookingScheduleDate\(booking\) === dayDate/, "交通預訂應以出發日期判斷是否屬於當天");
  assert.match(renderQuickTicketsSource, /getBookingScheduleTime\(a\)/, "快速取用應以交通出發時間排序");
  assert.match(appSource, /booking\.transport\?\.departureDate \|\| booking\.date/, "交通日期缺漏時應回退既有日期");
  assert.match(appSource, /booking\.transport\?\.departureTime \|\| booking\.time/, "交通時間缺漏時應回退既有時間");
});

test("從交通分頁新增預訂時，類型預設為交通", () => {
  const openBookingDialogSource = appSource.match(/function openBookingDialog\(bookingId = null\) \{([\s\S]*?)\n\}/)?.[0] || "";

  assert.match(openBookingDialogSource, /state\.activeBookingGroup === "交通" \? "交通"/, "交通分頁新增預訂應預設交通類型");
});

test("交通票券上傳只接受圖片或 PDF，並提供繁中錯誤訊息", () => {
  assert.match(
    htmlSource,
    /id="bookingAttachmentInput"[^>]*accept="image\/\*,application\/pdf"/,
    "檔案挑選器應只提示圖片或 PDF"
  );
  assert.match(appSource, /function validateTransportTicketFile\(file\)/, "應在送出前驗證交通票券檔案格式");
  assert.match(appSource, /file\.type\.startsWith\("image\/"\) \|\| file\.type === "application\/pdf"/, "交通票券只允許圖片或 PDF MIME 類型");
  assert.match(appSource, /交通電子票券檔案只接受圖片或 PDF 格式。/, "格式錯誤應顯示繁中訊息");
});
