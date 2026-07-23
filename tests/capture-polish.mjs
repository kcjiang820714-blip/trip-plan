import { writeFile } from "node:fs/promises";

const output = "/Users/kcjiang/Documents/旅遊行程app/artifacts/reference-match";
const photo = (label, color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="100%" height="100%" fill="${color}"/><circle cx="132" cy="44" r="18" fill="#fff4cb"/><path d="M42 130h96M58 112h64M70 94h40M82 76h16M90 58v72" stroke="#18313b" stroke-width="8" stroke-linecap="round"/><text x="90" y="164" text-anchor="middle" font-size="14" fill="#18313b">${label}</text></svg>`)}`;

const trip = {
  id: "polish-trip",
  title: "2026苦力怕陰陽寮員工旅行・福岡七日慢遊",
  startDate: "2026-07-24",
  endDate: "2026-07-26",
  dates: "2026/07/24 - 2026/07/26",
  members: ["小美", "阿哲", "我"],
  exchangeRates: { TWD: 1, JPY: 0.22 },
  days: [{
    title: "福岡出發", date: "2026-07-24", items: [
      { id: "route", time: "07:36", place: "渡邊通 → 筑前前原", type: "交通", note: "中途會在姪濱站停 2 分鐘，不需換車", content: "福岡地下鐵七隈線，直接轉乘 JR 筑肥線。", attachments: [imageAttachment("交通", "#a9d0df")] },
      { id: "lunch", time: "12:30", place: "海鮮白濱屋午餐", type: "餐廳", note: "福岡市西區・約 60 分", content: "預訂海鮮定食", attachments: [imageAttachment("午餐", "#e8c99c")] },
      { id: "walk", time: "15:00", place: "糸島海岸散步", type: "散步", note: "糸島地區・約 90 分", attachments: [imageAttachment("散步", "#cbb18b")] }
    ]
  }, { title: "博多市區", date: "2026-07-25", items: [] }, { title: "回程", date: "2026-07-26", items: [] }],
  bookings: [{
    id: "train", type: "交通", name: "特急ゆふいんの森 6 號", date: "2026-07-24", time: "17:17", place: "由布院 → 博多", code: "65775",
    transport: { mode: "火車", company: "JR 九州", number: "ゆふいんの森 6 號", departureDate: "2026-07-24", departureTime: "17:17", departurePlace: "由布院", arrivalTime: "19:26", arrivalPlace: "博多" },
    attachments: [],
    personalTickets: [
      { id: "ticket-me", ticketHolderName: "我", ticketHolderUserId: "", visibility: "shared", ticketUrl: "https://example.com/ticket-me", attachments: [] },
      { id: "ticket-family", ticketHolderName: "媽媽", ticketHolderUserId: "", visibility: "shared", ticketUrl: "https://example.com/ticket-family", attachments: [] }
    ]
  }],
  todos: [{ id: "shopping-photo", group: "購物清單", text: "MUJI 敏感肌用化妝水（保濕型）", quantity: "3", unit: "瓶", amount: "390", currency: "TWD", place: "無印良品", done: false, attachments: [imageAttachment("化妝水", "#d9e7d7")] }],
  expenses: []
};

function imageAttachment(label, color) {
  return { id: `photo-${label}`, name: `${label}.svg`, type: "image/svg+xml", dataUrl: photo(label, color) };
}

const targets = await fetch("http://127.0.0.1:9224/json/list").then((response) => response.json());
const target = targets.find((entry) => entry.type === "page");
if (!target) throw new Error("No Chrome page target");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function setSection(section) {
  await send("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await delay(450);
  const state = { isLanding: false, isHome: false, isTrip: true, activeTripId: trip.id, activeDayIndex: 0, activeTripSection: section, activeBookingGroup: "全部", activeTodoGroup: "購物清單", activeExpenseDate: "" };
  await send("Runtime.evaluate", { expression: `localStorage.setItem("trip-notebook-v2", ${JSON.stringify(JSON.stringify({ trips: [trip] }))}); sessionStorage.setItem("trip-notebook-view-state-v1", ${JSON.stringify(JSON.stringify(state))}); location.reload();` });
  await delay(900);
}

async function capture(section, width, height, name) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 680, screenWidth: width, screenHeight: height });
  await setSection(section);
  await delay(700);
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(`${output}/${name}`, Buffer.from(result.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("ServiceWorker.disable");
for (const [section, prefix] of [["itinerary", "itinerary"], ["bookings", "bookings"], ["todos", "todos"]]) {
  await capture(section, 390, 844, `${prefix}-mobile-390.png`);
  await capture(section, 1440, 1000, `${prefix}-desktop-1440.png`);
}
socket.close();
