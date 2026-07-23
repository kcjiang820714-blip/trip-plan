import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function functionSource(name) {
  let start = appSource.indexOf(`function ${name}(`);
  if (start < 0) return "";
  if (appSource.slice(start - 6, start) === "async ") start -= 6;
  return appSource.slice(start).match(/^[\s\S]*?\n\}/)?.[0] || "";
}

function loadFunction(name, dependencies = {}, extraSources = []) {
  const dependencyNames = Object.keys(dependencies);
  const dependencyValues = Object.values(dependencies);
  const sources = [...extraSources, functionSource(name)].join("\n");
  return new Function(...dependencyNames, `${sources}\nreturn ${name};`)(...dependencyValues);
}

test("normalizeBooking 將個人票券正規化為空陣列", () => {
  const normalizeBookingSource = functionSource("normalizeBooking");

  assert.match(
    normalizeBookingSource,
    /personalTickets:\s*Array\.isArray\(booking\.personalTickets\)/,
    "新舊預訂都應有 personalTickets 陣列，避免顯示與儲存時需要猜資料格式"
  );
  assert.match(
    normalizeBookingSource,
    /\.map\(normalizePersonalTicket\)/,
    "每張個人票券都應經過相同的網址與附件正規化"
  );
});

test("normalizeBooking 將舊單張票券與持有人遷移成一張個人票券", () => {
  const normalizeBookingSource = functionSource("normalizeBooking");

  assert.match(normalizeBookingSource, /legacyPersonalTicket/, "應先建立舊單張票券的相容資料");
  assert.match(normalizeBookingSource, /ticketHolderUserId:\s*booking\.ticketHolderUserId/, "舊持有人 ID 應遷移至個人票券");
  assert.match(normalizeBookingSource, /ticketHolderName:\s*booking\.ticketHolderName/, "舊持有人名稱應遷移至個人票券");
  assert.match(normalizeBookingSource, /ticketUrl:\s*normalizeTicketUrl\(booking\.ticketUrl\)/, "舊電子票券連結應遷移");
  assert.match(normalizeBookingSource, /attachments:\s*.*booking\.attachments/, "舊票券附件應遷移");
});

test("預訂表單提供可新增的個人票券編輯器", () => {
  assert.match(htmlSource, /id="personalTicketEditors"/, "表單應有個人票券列容器");
  assert.match(htmlSource, /id="addPersonalTicketButton"/, "表單應有新增個人票券按鈕");
  assert.match(appSource, /function renderPersonalTicketEditors\(/, "應由集中函式建立個人票券編輯列");
  assert.match(appSource, /addPersonalTicketButton\.addEventListener\("click"/, "新增按鈕應加入一張空白個人票券");
});

test("每張個人票券可指定持有人，並選擇連結或圖片／PDF 檔案", () => {
  const editorSource = functionSource("renderPersonalTicketEditor");

  assert.match(editorSource, /personal-ticket-holder/, "每張票券列應有自己的持有人欄位");
  assert.match(editorSource, /personal-ticket-mode/, "每張票券列應可選擇提供方式");
  assert.match(editorSource, /personal-ticket-url/, "連結模式應有自己的網址欄位");
  assert.match(editorSource, /personal-ticket-file/, "檔案模式應有自己的檔案欄位");
  assert.match(editorSource, /accept="image\/\*,application\/pdf"/, "個人票券檔案只接受圖片或 PDF");
});

test("儲存預訂時收集每張個人票券，而非只讀取單一票券欄位", () => {
  const submitSource = appSource.match(/bookingForm\.addEventListener\("submit", async \(event\) => \{([\s\S]*?)\n\}\);/)?.[0] || "";
  const collectSource = functionSource("collectPersonalTickets");

  assert.match(appSource, /function collectPersonalTickets\(/, "應有集中收集個人票券資料的函式");
  assert.match(collectSource, /personalTicketEditors/, "收集函式應逐列讀取個人票券編輯器");
  assert.match(collectSource, /getSelectedTicketHolder\(/, "每列持有人必須由既有旅伴選項驗證");
  assert.match(collectSource, /validateTransportTicketFile\(/, "每列上傳檔案都應驗證為圖片或 PDF");
  assert.match(submitSource, /personalTickets\s*=\s*isPersonalTicketBooking\s*\?\s*await collectPersonalTickets\(/, "儲存前必須實際收集 personalTickets，不能只靠註解通過測試");
});

test("預訂卡與快速取用逐張渲染個人票券，並以持有人篩選", () => {
  const renderBookingsSource = functionSource("renderBookings");
  const renderQuickTicketCardSource = functionSource("renderQuickTicketCard");

  assert.match(appSource, /function canViewPersonalTicket\(/, "應以集中規則判斷單張個人票券是否可見");
  assert.match(renderBookingsSource, /booking\.personalTickets.*\.filter\(.*canViewPersonalTicket/s, "預訂卡應只輸出目前使用者可看的個人票券");
  assert.match(renderQuickTicketCardSource, /booking\.personalTickets.*\.filter\(.*canViewPersonalTicket/s, "快速取用應只輸出目前使用者可看的個人票券");
  assert.match(renderBookingsSource, /ticket\.ticketHolderName/, "建立者檢視時應標示每張票券的持有人");
  assert.match(renderQuickTicketCardSource, /ticket\.ticketUrl|ticket\.attachments/, "快速取用應逐張使用個人票券的連結或附件");
});

test("所有預訂都可保留共同附件，且個人票券仍獨立收集", () => {
  const syncFieldsSource = functionSource("syncBookingStayFields");
  const submitSource = appSource.match(/bookingForm\.addEventListener\("submit", async \(event\) => \{([\s\S]*?)\n\}\);/)?.[0] || "";
  const renderBookingsSource = functionSource("renderBookings");

  assert.match(syncFieldsSource, /isPersonalTicketBooking/, "只有交通、景點票券與活動才應顯示個人票券編輯器");
  assert.match(syncFieldsSource, /bookingAttachmentField\.hidden\s*=\s*false/, "票券與一般預訂都必須能加入共同圖片或附件");
  assert.match(submitSource, /personalTickets:\s*isPersonalTicketBooking\s*\?/, "餐廳與住宿儲存時不應收集個人票券");
  assert.match(submitSource, /attachments\s*=\s*await readBookingAttachments\(isPersonalTicketBooking\)/, "所有預訂都應收集共同附件，票券類仍要驗證檔案格式");
  assert.match(submitSource, /attachments:\s*\[\.\.\.keptBookingAttachments, \.\.\.attachments\]/, "共同附件必須與既有附件一起儲存");
  assert.match(renderBookingsSource, /renderAttachmentGallery\(booking\.attachments, "booking", booking\.id/, "票券類的共同附件也必須能在預訂卡顯示");
});

test("旅伴沒有可見個人票券時，快速取用不會回退開啟舊票券", () => {
  const renderQuickTicketCard = loadFunction("renderQuickTicketCard", {
    canViewPersonalTicket: () => false,
    currentTrip: () => ({ role: "participant" }),
    getPrimaryTicketAttachment: (attachments = []) => attachments[0] || null,
    normalizeTicketUrl: (value) => value || "",
    renderStayQuickTime: () => "",
    getBookingOfflineLabel: () => "",
    canManageTrip: () => false,
    escapeHtml: (value) => String(value || ""),
    googleMapsUrl: () => ""
  });
  const html = renderQuickTicketCard({
    id: "booking-1",
    type: "交通",
    name: "共同班次",
    date: "2026-07-23",
    time: "08:00",
    place: "",
    code: "",
    transport: {},
    ticketUrl: "https://example.com/legacy-ticket",
    attachments: [{ id: "legacy-file" }],
    personalTickets: [{ id: "ticket-owner", ticketHolderUserId: "owner", ticketUrl: "https://example.com/owner-ticket", attachments: [] }]
  });

  assert.doesNotMatch(html, /legacy-ticket|legacy-file/, "旅伴不能藉由 legacy fallback 看到不屬於自己的票券");
});

test("移除前方票券列後，後方票券以 ticket id 保留既有附件", async () => {
  const keptContainer = { id: "ticket-b-existing" };
  const editor = {
    dataset: { personalTicketId: "ticket-b" },
    querySelector(selector) {
      if (selector === ".personal-ticket-holder") return { value: "member-b" };
      if (selector === ".personal-ticket-mode:checked") return { value: "file" };
      if (selector === ".personal-ticket-url") return { value: "" };
      if (selector === ".personal-ticket-file") return { files: [] };
      if (selector === '[data-personal-ticket-existing="ticket-b"]') return keptContainer;
      return null;
    }
  };
  const collectPersonalTickets = loadFunction("collectPersonalTickets", {
    personalTicketEditors: { querySelectorAll: () => [editor] },
    createBlankPersonalTicket: () => ({ id: "blank", attachments: [] }),
    getSelectedTicketHolder: () => ({ userId: "member-b", displayName: "B" }),
    currentTrip: () => ({}),
    getKeptAttachments: (container, attachments) => container === keptContainer ? attachments : [],
    normalizeTicketUrl: (value) => value,
    validateTransportTicketFile: () => {},
    readBookingAttachment: async (file) => file,
    normalizePersonalTicket: (ticket) => ticket,
    hasPersonalTicketContent: () => true
  });
  const ticketA = { id: "ticket-a", attachments: [{ id: "attachment-a" }] };
  const ticketB = { id: "ticket-b", attachments: [{ id: "attachment-b" }] };

  const [result] = await collectPersonalTickets([ticketA, ticketB]);

  assert.deepEqual(result.attachments, ticketB.attachments);
});

test("舊票券附件遷移後只存在個人票券，不在預訂重複保留", () => {
  let nextId = 0;
  const normalizeBooking = loadFunction("normalizeBooking", {
    isPersonalTicketBooking: (type) => ["交通", "景點票券", "活動"].includes(type),
    normalizeTicketUrl: (value) => value || "",
    getAttachmentSource: (attachment) => attachment?.dataUrl || attachment?.publicUrl || "",
    normalizePersonalTicket: (ticket) => ({ ...ticket, attachments: ticket.attachments || [] }),
    hasPersonalTicketContent: () => true,
    normalizeAttachment: (attachment) => attachment,
    createId: () => `generated-${nextId += 1}`
  });
  const legacyAttachment = { id: "legacy-attachment", dataUrl: "data:application/pdf;base64,QQ==" };

  const booking = normalizeBooking({ id: "booking-1", type: "交通", attachments: [legacyAttachment] });

  assert.deepEqual(booking.personalTickets[0].attachments, [legacyAttachment]);
  assert.deepEqual(booking.attachments, [], "同一附件不可同時存在新舊容器，否則編輯時會被誤判為已刪除");

  const previouslyDuplicatedBooking = normalizeBooking({ ...booking, attachments: [legacyAttachment] });
  assert.deepEqual(previouslyDuplicatedBooking.attachments, [], "已曾被儲存成新舊重複格式的資料，重新載入時也必須去重");

  const legacyWithEmptyTicketArray = normalizeBooking({ id: "booking-2", type: "交通", personalTickets: [], attachments: [legacyAttachment] });
  assert.equal(legacyWithEmptyTicketArray.personalTickets.length, 1, "空陣列不能阻止舊票券遷移");
  assert.deepEqual(legacyWithEmptyTicketArray.personalTickets[0].attachments, [legacyAttachment], "空陣列不能阻止舊票券遷移");
  assert.deepEqual(legacyWithEmptyTicketArray.attachments, []);
});

test("新建立的共同附件不會在重新開啟時被誤遷移成個人票券", () => {
  const normalizeBooking = loadFunction("normalizeBooking", {
    createId: () => "generated-id",
    normalizeTicketUrl: (value) => value || "",
    getAttachmentSource: (attachment) => attachment?.dataUrl || attachment?.publicUrl || "",
    normalizePersonalTicket: (ticket) => ticket,
    isPersonalTicketBooking: (type) => ["交通", "景點票券", "活動"].includes(type),
    hasPersonalTicketContent: () => true,
    normalizeAttachment: (attachment) => attachment
  });

  const sharedAttachment = { id: "route-map", dataUrl: "data:image/png;base64,AA==" };
  const normalized = normalizeBooking({
    id: "booking-1",
    type: "交通",
    usesSharedAttachments: true,
    attachments: [sharedAttachment]
  });

  assert.equal(normalized.personalTickets.length, 0, "共同附件不可被誤當成未指定持有人的個人票券");
  assert.deepEqual(normalized.attachments, [sharedAttachment]);
});

test("個人票券附件以 personal-ticket 與 ticket id 精準開啟", () => {
  const attachmentA = { id: "same-id", name: "A.pdf" };
  const attachmentB = { id: "same-id", name: "B.pdf" };
  const findAttachment = loadFunction("findAttachment", {
    currentTrip: () => ({
      bookings: [
        { id: "booking-a", attachments: [], personalTickets: [{ id: "ticket-a", attachments: [attachmentA] }] },
        { id: "booking-b", attachments: [], personalTickets: [{ id: "ticket-b", attachments: [attachmentB] }] }
      ],
      days: []
    })
  });

  assert.equal(findAttachment("personal-ticket", "ticket-b", "same-id"), attachmentB);
  assert.equal(findAttachment("booking", "booking-a", "same-id"), null, "booking 類型不應跨進個人票券猜測附件");
  assert.match(functionSource("renderBookings"), /data-open-attachment="personal-ticket"[\s\S]*?data-owner-id="\$\{escapeHtml\(ticket\.id\)\}"/);
  assert.match(functionSource("renderQuickTicketCard"), /data-open-attachment="personal-ticket"[\s\S]*?data-owner-id="\$\{escapeHtml\(ticket\.id\)\}"/);
});

test("normalizePersonalTicket 相容兩種持有人欄位並輸出統一格式", () => {
  let nextId = 0;
  const normalizePersonalTicket = loadFunction("normalizePersonalTicket", {
    createId: () => `generated-${nextId += 1}`,
    normalizeTicketUrl: (value) => value || "",
    normalizeAttachment: (attachment) => attachment
  });

  const current = normalizePersonalTicket({ ticketHolderUserId: "current-id", ticketHolderName: "現行名稱" });
  const alternate = normalizePersonalTicket({ holderUserId: "alternate-id", holderName: "相容名稱" });

  assert.equal(current.ticketHolderUserId, "current-id");
  assert.equal(current.ticketHolderName, "現行名稱");
  assert.equal(alternate.ticketHolderUserId, "alternate-id");
  assert.equal(alternate.ticketHolderName, "相容名稱");
  assert.equal("holderUserId" in alternate, false, "儲存時應只輸出一套標準欄位");
});

test("離線提示只根據目前可見的個人票券", () => {
  const getBookingOfflineLabel = loadFunction("getBookingOfflineLabel", {
    normalizeTicketUrl: (value) => value || ""
  });
  const hiddenTicket = { ticketUrl: "https://example.com/hidden", attachments: [] };
  const visibleTicket = { ticketUrl: "", attachments: [{ id: "local", dataUrl: "data:application/pdf;base64,QQ==" }] };
  const booking = { personalTickets: [hiddenTicket, visibleTicket], ticketUrl: "", attachments: [] };

  assert.equal(getBookingOfflineLabel(booking, [visibleTicket]), "票券已保存在此裝置，離線可開");
});
