import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");

test("679px 以下保留四個面板的單欄手機操作規則", () => {
  const mobile = css.match(/@media \(max-width: 679px\) \{([\s\S]*)\}\s*$/)?.[1] ?? "";

  assert.match(mobile, /#itineraryPanel\s*\{[^}]*display:\s*flex/);
  assert.match(mobile, /\.travel-day-panel\s*\{[^}]*order:\s*2/);
  assert.match(mobile, /\.quick-ticket-panel\s*\{[^}]*order:\s*3/);
  assert.match(mobile, /\.timeline\s*\{[^}]*order:\s*4/);
  assert.match(mobile, /\.sub-tabs\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(mobile, /\.booking-cover\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(mobile, /\.todo-main-cell input\s*\{[^}]*width:\s*24px/);
  assert.match(mobile, /\.expense-settings-grid,[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("預訂可標示下一筆，記帳在摘要後有新增入口", () => {
  assert.match(app, /booking-next-upcoming/);
  assert.match(app, /is-next-upcoming/);
  assert.match(html, /<h2 id="expenseSummary">尚無支出<\/h2>\s*<\/div>\s*<button class="secondary-action expense-add-button" id="addExpenseButton"/);
});
