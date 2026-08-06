import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  if (start < 0) return "";
  return appSource.slice(start).match(/^[\s\S]*?\n\}/)?.[0] || "";
}

function loadFunction(name, dependencies = {}) {
  return new Function(...Object.keys(dependencies), `${functionSource(name)}\nreturn ${name};`)(...Object.values(dependencies));
}

test("共同票券以明確 visibility 儲存，舊票券預設維持個人票券", () => {
  const normalizePersonalTicket = loadFunction("normalizePersonalTicket", {
    createId: () => "generated-ticket",
    normalizeTicketUrl: (value) => value || "",
    normalizeAttachment: (attachment) => attachment
  });

  assert.equal(normalizePersonalTicket({ visibility: "shared", ticketUrl: "https://example.com/group" }).visibility, "shared");
  assert.equal(normalizePersonalTicket({ ticketUrl: "https://example.com/legacy" }).visibility, "personal", "舊資料不可因缺少欄位變成共同票券");
});

test("共同票券不會被持有人篩選擋住，舊未指定個人票券仍只給建立者", () => {
  const canViewPersonalTicket = loadFunction("canViewPersonalTicket", {
    hasPersonalTicketContent: (ticket) => Boolean(ticket.ticketUrl || ticket.attachments?.length),
    canManageTrip: () => false,
    state: { cloudUser: { id: "member-1" } }
  });
  const trip = { ownerId: "owner-1", role: "participant" };

  assert.equal(canViewPersonalTicket({ visibility: "shared", ticketUrl: "https://example.com/group" }, {}, trip), true);
  assert.equal(canViewPersonalTicket({ visibility: "personal", ticketUrl: "https://example.com/legacy", ticketHolderUserId: "" }, {}, trip), false);
  assert.equal(canViewPersonalTicket({ visibility: "personal", ticketUrl: "https://example.com/mine", ticketHolderUserId: "member-1" }, {}, trip), true);
});

test("共同票券可在交通行程連結卡出示，但個人票券不會帶入", () => {
  const renderBookingSourceAttachments = loadFunction("renderBookingSourceAttachments", {
    renderAttachmentGallery: () => "",
    canViewPersonalTicket: (ticket) => ticket.visibility === "shared",
    escapeHtml: (value) => String(value || ""),
    currentTrip: () => ({})
  });
  const html = renderBookingSourceAttachments(
    { sourceBookingId: "booking-1" },
    {
      id: "booking-1",
      type: "交通",
      attachments: [],
      personalTickets: [
        { id: "shared", visibility: "shared", ticketUrl: "https://example.com/group" },
        { id: "private", visibility: "personal", ticketUrl: "https://example.com/private" }
      ]
    }
  );

  assert.match(html, /https:\/\/example\.com\/group/);
  assert.doesNotMatch(html, /private/);
});

test("新增票券列可選共同或個人，個人模式才顯示持有人", () => {
  const editorSource = functionSource("renderPersonalTicketEditor");
  const syncSource = functionSource("syncPersonalTicketEditor");

  assert.match(editorSource, /personal-ticket-visibility/);
  assert.match(editorSource, /value="shared"/);
  assert.match(editorSource, /personal-ticket-holder-field/);
  assert.match(syncSource, /visibility/);
  assert.match(syncSource, /personal-ticket-holder-field/);
});

test("行程卡以 delegated click 安全開啟共同票券網址，附件流程維持原樣", () => {
  const openedUrls = [];
  const openedAttachments = [];
  const handleTimelineClick = loadFunction("handleTimelineClick", {
    openTicketUrl: (url) => openedUrls.push(url),
    openAttachment: (...args) => openedAttachments.push(args),
    openAttractionIntro: () => {},
    document: { querySelector: () => null },
    state: {},
    isReadonly: false,
    openItemDialog: () => {}
  });
  const eventFor = (selectors) => ({ target: { closest: (selector) => selectors[selector] || null } });

  handleTimelineClick(eventFor({
    "[data-open-ticket-url]": { dataset: { openTicketUrl: "https://example.com/group-ticket" } }
  }));
  handleTimelineClick(eventFor({
    "[data-open-attachment]": { dataset: { openAttachment: "personal-ticket", ownerId: "shared-ticket", attachmentId: "pdf-1" } }
  }));

  assert.deepEqual(openedUrls, ["https://example.com/group-ticket"]);
  assert.deepEqual(openedAttachments, [["personal-ticket", "shared-ticket", "pdf-1"]]);
});
