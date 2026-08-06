import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  if (start < 0) return "";

  let depth = 0;
  let quote = "";
  let escaped = false;
  let started = false;
  for (let index = start; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (["'", "\"", "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      started = true;
    } else if (character === "}" && started && --depth === 0) {
      return appSource.slice(start, index + 1);
    }
  }
  return "";
}

function requiredFunction(name) {
  const source = functionSource(name);
  assert.ok(source, `應實作 ${name}，讓預訂與行程可以用一致的同步規則處理`);
  return source;
}

function loadFunction(name, dependencies = {}) {
  const source = requiredFunction(name);
  return new Function(...Object.keys(dependencies), `${source}\nreturn ${name};`)(...Object.values(dependencies));
}

function createTrip() {
  return {
    days: [
      { date: "2026-08-01", items: [] },
      { date: "2026-08-02", items: [] }
    ],
    bookings: []
  };
}

test("normalizeItem 保留預訂來源欄位，且不影響既有手動欄位", () => {
  const normalizeItem = loadFunction("normalizeItem", {
    createId: () => "generated-item",
    normalizeAttachment: (attachment) => attachment,
    normalizeTransportSegment: (segment) => segment,
    normalizeFlexibleStops: (stops) => Array.isArray(stops) ? stops : []
  });

  const item = normalizeItem({
    id: "item-1",
    sourceBookingId: "booking-1",
    bookingSourceSummary: "交通 · 台北 → 東京",
    content: "手動補上的集合資訊",
    attractionIntro: "手動介紹",
    attachments: [{ id: "own-photo", dataUrl: "data:image/png;base64,AA==" }]
  });

  assert.equal(item.sourceBookingId, "booking-1");
  assert.equal(item.bookingSourceSummary, "交通 · 台北 → 東京");
  assert.equal(item.content, "手動補上的集合資訊");
  assert.equal(item.attractionIntro, "手動介紹");
  assert.deepEqual(item.attachments, [{ id: "own-photo", dataUrl: "data:image/png;base64,AA==" }]);
});

test("只有交通、餐廳、景點票券與活動會建立行程，住宿不會", () => {
  const isBookingItineraryEligible = loadFunction("isBookingItineraryEligible");

  for (const type of ["交通", "餐廳", "景點票券", "活動"]) {
    assert.equal(isBookingItineraryEligible({ type }), true, `${type} 應自動帶入行程`);
  }
  assert.equal(isBookingItineraryEligible({ type: "住宿" }), false, "住宿跨多日，不應自動變成單一行程卡");
});

test("交通預訂映射為行程時，只使用第一段交通資料", () => {
  const mapBookingToItineraryItem = loadFunction("mapBookingToItineraryItem", {
    normalizeItem: (item) => item
  });
  const item = mapBookingToItineraryItem({
    id: "booking-train",
    type: "交通",
    name: "新幹線 Nozomi 12",
    date: "2026-08-02",
    time: "09:00",
    place: "東京站",
    code: "N12",
    note: "車廂 5",
    transport: {
      mode: "新幹線",
      company: "JR 東海",
      number: "Nozomi 12",
      departureTime: "09:05",
      departurePlace: "東京站",
      arrivalTime: "11:18",
      arrivalPlace: "名古屋站"
    }
  });

  assert.equal(item.sourceBookingId, "booking-train");
  assert.equal(item.type, "交通");
  assert.equal(item.time, "09:05");
  assert.deepEqual(item.transportSegments, [{
    mode: "新幹線",
    company: "JR 東海",
    departureStation: "東京站",
    routeName: "",
    routeNumber: "",
    departureTime: "09:05",
    trainNumber: "Nozomi 12",
    arrivalStation: "名古屋站",
    arrivalTime: "11:18"
  }]);
  assert.match(item.bookingSourceSummary, /交通/);
  assert.match(item.bookingSourceSummary, /新幹線 Nozomi 12/);
});

test("同步同一筆預訂時更新既有行程並移動日期，不重複且保留手動內容與行程自有附件", () => {
  const syncBookingToItinerary = loadFunction("syncBookingToItinerary", {
    isBookingItineraryEligible: () => true,
    mapBookingToItineraryItem: (booking) => ({
      sourceBookingId: booking.id,
      bookingSourceSummary: booking.name,
      type: booking.type,
      place: booking.name,
      time: booking.time,
      transportSegments: []
    }),
    normalizeItem: (item) => item,
    createId: () => "new-item"
  });
  const trip = createTrip();
  trip.days[0].items.push({
    id: "item-linked",
    sourceBookingId: "booking-1",
    content: "手動集合說明",
    attractionIntro: "手動景點介紹",
    attachments: [{ id: "my-photo" }],
    note: "手動備註",
    place: "舊地點"
  });

  syncBookingToItinerary(trip, { id: "booking-1", type: "活動", name: "更新後活動", date: "2026-08-02", time: "14:00" });

  assert.equal(trip.days[0].items.length, 0, "日期改變後舊日不應留下重複行程卡");
  assert.equal(trip.days[1].items.length, 1, "日期改變後應移到對應日");
  const item = trip.days[1].items[0];
  assert.equal(item.id, "item-linked", "更新必須維持原行程卡，不可新增第二張");
  assert.equal(item.place, "更新後活動");
  assert.equal(item.content, "手動集合說明");
  assert.equal(item.attractionIntro, "手動景點介紹");
  assert.deepEqual(item.attachments, [{ id: "my-photo" }]);
  assert.equal(item.note, "手動備註");
});

test("同步以旅程起始日期定位顯示格式的 Day，而不是直接比對畫面日期文字", () => {
  const syncBookingToItinerary = loadFunction("syncBookingToItinerary", {
    isBookingItineraryEligible: () => true,
    mapBookingToItineraryItem: (booking) => ({
      sourceBookingId: booking.id,
      bookingSourceSummary: booking.name,
      type: booking.type,
      place: booking.name,
      time: booking.time,
      transportSegments: []
    }),
    normalizeItem: (item) => item,
    createId: () => "new-item"
  });
  const trip = {
    startDate: "2026-08-01",
    days: [
      { date: "8/1（六）", items: [] },
      { date: "8/2（日）", items: [] }
    ]
  };

  const result = syncBookingToItinerary(trip, {
    id: "booking-1",
    type: "活動",
    name: "煙火大會",
    date: "2026-08-02",
    time: "19:00"
  });

  assert.equal(result.outOfRange, false);
  assert.equal(trip.days[0].items.length, 0);
  assert.equal(trip.days[1].items[0].sourceBookingId, "booking-1");
});

test("同步不適用的住宿時不會建立行程卡", () => {
  const syncBookingToItinerary = loadFunction("syncBookingToItinerary", {
    isBookingItineraryEligible: () => false,
    mapBookingToItineraryItem: () => {
      throw new Error("住宿不應被映射");
    },
    normalizeItem: (item) => item,
    createId: () => "new-item"
  });
  const trip = createTrip();

  syncBookingToItinerary(trip, { id: "stay-1", type: "住宿", name: "飯店", date: "2026-08-01" });

  assert.deepEqual(trip.days.map((day) => day.items), [[], []]);
});

test("日期超出旅程範圍時，編輯既有預訂不會解除原行程卡的來源連結", () => {
  const submitSource = appSource.match(/bookingForm\.addEventListener\("submit", async \(event\) => \{([\s\S]*?)\n\}\);/)?.[0] || "";

  assert.match(submitSource, /syncResult\s*=\s*syncBookingToItinerary\(currentTrip\(\), booking\)/, "儲存時應交由同步函式判斷日期是否可放入行程");
  assert.doesNotMatch(
    submitSource,
    /syncResult\?\.outOfRange\)\s*unlinkBookingFromItinerary/,
    "日期暫時填錯時必須保留原卡的來源連結，修正日期後才能繼續更新同一張卡"
  );
});

test("刪除預訂只解除相同行程卡的來源連結，不刪除行程與手動資料", () => {
  const unlinkBookingFromItinerary = loadFunction("unlinkBookingFromItinerary", {
    normalizeItem: (item) => item
  });
  const trip = createTrip();
  trip.days[0].items.push(
    { id: "linked", sourceBookingId: "booking-1", bookingSourceSummary: "活動 · 展覽", content: "手動說明", attachments: [{ id: "my-photo" }] },
    { id: "other", sourceBookingId: "booking-2", bookingSourceSummary: "餐廳 · 午餐" }
  );

  unlinkBookingFromItinerary(trip, "booking-1");

  assert.equal(trip.days[0].items.length, 2);
  assert.equal(trip.days[0].items[0].sourceBookingId, "");
  assert.equal(trip.days[0].items[0].bookingSourceSummary, "");
  assert.equal(trip.days[0].items[0].content, "手動說明");
  assert.deepEqual(trip.days[0].items[0].attachments, [{ id: "my-photo" }]);
  assert.equal(trip.days[0].items[1].sourceBookingId, "booking-2");
});

test("行程詳細卡只連結顯示預訂共同附件，絕不帶入個人票券", () => {
  const renderBookingSourceAttachments = loadFunction("renderBookingSourceAttachments", {
    renderAttachmentGallery: (attachments, ownerType, ownerId) => `${ownerType}:${ownerId}:${attachments.map((attachment) => attachment.id).join(",")}`
  });
  const html = renderBookingSourceAttachments(
    { sourceBookingId: "booking-1" },
    {
      id: "booking-1",
      attachments: [{ id: "shared-confirmation" }],
      personalTickets: [{ id: "private-ticket", attachments: [{ id: "private-pdf" }] }]
    }
  );

  assert.match(html, /booking:booking-1:shared-confirmation/);
  assert.doesNotMatch(html, /private-ticket|private-pdf/);
});

test("行程渲染會取得來源預訂並使用共用附件渲染器", () => {
  const renderTripSource = requiredFunction("renderItineraryTimeline");

  assert.match(renderTripSource, /renderBookingSourceAttachments\(/, "詳細卡應顯示來源預訂的共同附件");
  assert.match(renderTripSource, /sourceBookingId/, "渲染時應以行程卡保存的來源 ID 找預訂");
  assert.doesNotMatch(renderTripSource, /personalTickets/, "行程詳細卡不可引用個人票券");
});
