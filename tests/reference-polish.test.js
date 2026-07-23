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

test("行程日期導覽只保留左右按鈕與中央當日標籤", () => {
  assert.match(html, /id="dayPreviousButton"/);
  assert.match(html, /id="dayCurrentLabel"/);
  assert.match(html, /id="dayNextButton"/);
  assert.match(app, /renderCompactDayNavigation\(trip, state\.activeDayIndex\)/);
  assert.match(css, /\.compact-day-navigation\s*\{[^}]*grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)\s+44px/s);
});

test("時間軸使用固定單色 SVG badge，而不是把分類名稱當成欄位", () => {
  const visual = new Function(`${functionSource("getItineraryItemVisual")}\nreturn getItineraryItemVisual;`)();
  assert.equal(visual({ type: "交通" }).icon, "transport");
  assert.equal(visual({ type: "餐廳" }).icon, "food");
  assert.equal(visual({ type: "景點" }).icon, "sight");
  assert.match(app, /function renderItineraryTypeIcon\(/);
  assert.match(css, /\.itinerary-type-marker svg\s*\{/);
});

test("預訂票券呈現只有一個主要出示按鈕，旅伴票券收在明細列", () => {
  assert.match(app, /function renderBookingTicketControls\(/);
  assert.match(app, /booking-ticket-primary/);
  assert.match(app, /booking-ticket-companions/);
  assert.match(css, /\.booking-ticket-primary\s*\{[^}]*min-height:\s*46px/s);
});

test("購物清單待辦可儲存圖片附件並提供替換與移除介面", () => {
  const normalizeTodo = new Function(`${functionSource("normalizeAttachment")}\n${functionSource("parseTodoDetails")}\n${functionSource("normalizeTodo")}\nreturn normalizeTodo;`)();
  const normalized = normalizeTodo({ id: "soap", cloudId: "cloud-soap", text: "化妝水", attachments: [{ id: "photo", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,x" }] });
  assert.equal(normalized.attachments.length, 1);
  assert.equal(normalized.cloudId, "cloud-soap");
  assert.match(html, /id="todoAttachmentInput"/);
  assert.match(html, /id="todoExistingAttachments"/);
  assert.match(app, /readTodoAttachments\(\)/);
  assert.match(app, /uploadOwnerAttachmentsBeforeLocalSave\(trip, "todo"/);
  assert.match(app, /data-open-attachment="todo"/);
});

test("全站有明確中文字體、字級與行高 token，長標題可換行不省略", () => {
  assert.match(css, /--font-ui:\s*[^;]*Noto Sans TC/);
  assert.match(css, /--text-body:/);
  assert.match(css, /--leading-body:/);
  assert.match(css, /\.trip-appbar h1\s*\{[\s\S]*?white-space:\s*normal/);
  assert.match(css, /\.trip-appbar h1\s*\{[\s\S]*?text-overflow:\s*clip/);
});
