import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function functionSource(name) {
  return appSource.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`))?.[0] || "";
}

test("交通電子票券表單提供票券持有人選擇", () => {
  assert.match(htmlSource, /id="bookingTicketHolderInput"/, "交通票券表單應有票券持有人 select");
  assert.match(
    htmlSource,
    /<select[^>]*id="bookingTicketHolderInput"[\s\S]*?<\/select>/,
    "票券持有人欄位應使用下拉選單，避免輸入不存在的旅伴"
  );
});

test("normalizeBooking 為新舊預訂保留空白持有人預設值", () => {
  const normalizeBookingSource = functionSource("normalizeBooking");

  assert.match(normalizeBookingSource, /ticketHolderUserId:\s*booking\.ticketHolderUserId\s*\|\|\s*""/, "應將缺少的持有人 ID 正規化為空字串");
  assert.match(normalizeBookingSource, /ticketHolderName:\s*booking\.ticketHolderName\s*\|\|\s*""/, "應將缺少的持有人名稱正規化為空字串");
});

test("交通票券可見性由集中函式判斷", () => {
  const visibilitySource = functionSource("canViewBookingTicket");

  assert.match(appSource, /function canViewBookingTicket\(booking, trip\)/, "應有集中判斷票券可見性的 canViewBookingTicket 函式");
  assert.match(visibilitySource, /booking\.type !== "交通"/, "非交通預訂不得被持有人規則篩掉");
  assert.match(visibilitySource, /canManageTrip\(trip\)/, "建立者應可查看全部交通票券");
  assert.match(visibilitySource, /booking\.ticketHolderUserId === state\.cloudUser\.id/, "旅伴只能查看自己的交通票券");
});

test("登出後不得顯示已同步雲端旅程的電子交通票券，本機旅程則維持可見", () => {
  const visibilitySource = functionSource("canViewBookingTicket");
  const loggedOutCloudTripGuard = "if (trip?.ownerId && !state.cloudUser) return false;";

  assert.match(
    visibilitySource,
    /if \(trip\?\.ownerId && !state\.cloudUser\) return false;/,
    "已同步雲端旅程在登出時，必須先拒絕顯示電子票券"
  );
  assert.ok(
    visibilitySource.indexOf(loggedOutCloudTripGuard) < visibilitySource.indexOf("canManageTrip(trip)"),
    "登出保護必須在建立者管理權限判斷之前，避免 canManageTrip 將登出誤判為建立者"
  );
  assert.doesNotMatch(
    visibilitySource,
    /if \(!state\.cloudUser\) return false;/,
    "未同步的本機旅程沒有 ownerId，登出時仍應可使用自己的電子票券"
  );
});

test("登出後已同步雲端旅程必須唯讀，本機旅程維持可編輯", () => {
  const manageSource = appSource.match(/function canManageTrip\(trip = currentTrip\(\)\) \{([\s\S]*?)\n\}/)?.[0] || "";
  const loggedOutCloudTripGuard = "if (trip?.ownerId && !state.cloudUser) return false;";

  assert.match(
    manageSource,
    /if \(trip\?\.ownerId && !state\.cloudUser\) return false;/,
    "已同步雲端旅程在登出時不得保有管理權限，避免票券持有人被清空"
  );
  assert.ok(
    manageSource.indexOf(loggedOutCloudTripGuard) < manageSource.indexOf("if (!state.cloudUser) return true;"),
    "雲端旅程登出防護必須在本機旅程的可編輯回退規則之前"
  );
});

test("啟動恢復登入前，快取的旅伴角色不得短暫顯示或管理電子票券", () => {
  const visibilitySource = functionSource("canViewBookingTicket");
  const manageSource = appSource.match(/function canManageTrip\(trip = currentTrip\(\)\) \{([\s\S]*?)\n\}/)?.[0] || "";
  const cachedSharedTripGuard = "if (trip?.role && !state.cloudUser) return false;";

  assert.match(
    visibilitySource,
    /if \(trip\?\.role && !state\.cloudUser\) return false;/,
    "快取到 participant 角色、但登入狀態尚未恢復時，含電子票券的交通項目不得可見"
  );
  assert.match(
    manageSource,
    /if \(trip\?\.role && !state\.cloudUser\) return false;/,
    "快取到 participant 角色、但登入狀態尚未恢復時，canManageTrip 必須回傳 false"
  );
  assert.ok(
    manageSource.indexOf(cachedSharedTripGuard) < manageSource.indexOf("if (!state.cloudUser) return true;"),
    "共享旅程的登入恢復防護必須在純本機旅程可管理的回退規則之前"
  );
  assert.doesNotMatch(
    manageSource,
    /if \(!state\.cloudUser\) return false;/,
    "role 為空的純本機旅程在未登入時仍應可管理"
  );
});

test("沒有電子票券的共用交通路線不套用持有人篩選", () => {
  const visibilitySource = functionSource("canViewBookingTicket");

  assert.match(visibilitySource, /hasElectronicTicket/, "應先辨識交通預訂是否真的含有電子票券");
  assert.match(visibilitySource, /if \(!hasElectronicTicket\) return true;/, "沒有票券的共用交通路線應持續顯示給所有旅伴");
});

test("共同附件不是個人票券，旅伴仍可查看共用交通資訊", () => {
  const canViewBookingTicket = new Function(
    "normalizeTicketUrl",
    "getAttachmentSource",
    "hasPersonalTicketContent",
    "state",
    "canManageTrip",
    `${functionSource("canViewBookingTicket")}\nreturn canViewBookingTicket;`
  )(
    (value) => value || "",
    (attachment) => attachment?.dataUrl || "",
    () => false,
    { cloudUser: { id: "traveler-1" } },
    () => false
  );

  assert.equal(
    canViewBookingTicket(
      { type: "交通", usesSharedAttachments: true, attachments: [{ dataUrl: "data:image/png;base64,AA==" }], personalTickets: [] },
      { ownerId: "owner-1", role: "participant" }
    ),
    true
  );
});

test("預訂交通分頁與今日快速取用共用票券可見性判斷", () => {
  const renderBookingsSource = functionSource("renderBookings");
  const renderQuickTicketsSource = functionSource("renderQuickTickets");

  assert.match(renderBookingsSource, /canViewBookingTicket\(booking, trip\)/, "預訂分頁應依集中規則篩選交通票券");
  assert.match(renderQuickTicketsSource, /canViewBookingTicket\(booking, trip\)/, "今日快速取用應依同一規則篩選交通票券");
});

test("票券持有人選項來源包含建立者與受邀旅伴", () => {
  const optionsSource = functionSource("renderTicketHolderOptions");

  assert.match(appSource, /function renderTicketHolderOptions\(trip/, "應有集中產生票券持有人選項的函式");
  assert.match(optionsSource, /trip\.ownerId/, "建立者選項應使用 trip.ownerId");
  assert.match(optionsSource, /state\.cloudUser/, "未載入 ownerId 時，建立者選項應可回退登入帳號");
  assert.match(optionsSource, /normalizeSharedMembers\(trip\.sharedMembers\)/, "旅伴選項應使用受邀 sharedMembers");
  assert.match(optionsSource, /member\.userId/, "旅伴選項值應使用 userId");
  assert.match(optionsSource, /member\.email/, "旅伴選項文字應包含 Email");
});
