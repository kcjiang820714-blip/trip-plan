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

test("分類 breakdown 依換算金額排序、計算百分比，且不改寫輸入", () => {
  const buildExpenseCategoryBreakdown = new Function(
    `${functionSource("buildExpenseCategoryBreakdown")}
return buildExpenseCategoryBreakdown;`,
  )();
  const expenses = [
    { category: "交通", amountTwd: 300 },
    { category: "餐飲", amountTwd: 500 },
    { category: "交通", amountTwd: 200 },
    { category: "", amountTwd: 0 },
  ];
  const snapshot = structuredClone(expenses);

  assert.deepEqual(buildExpenseCategoryBreakdown(expenses), [
    { category: "交通", totalTwd: 500, count: 2, percent: 50 },
    { category: "餐飲", totalTwd: 500, count: 1, percent: 50 },
  ]);
  assert.deepEqual(buildExpenseCategoryBreakdown([]), []);
  assert.deepEqual(expenses, snapshot);
});

test("記帳 panel 保留設定並提供手機摘要、桌機主欄與右欄容器", () => {
  const panel = html.match(/<section class="trip-section-panel" id="expensesPanel"[\s\S]*?<\/section>\s*<\/section>\s*<section class="install-panel"/)?.[0] ?? "";

  assert.match(panel, /class="expense-mobile-header"/);
  assert.match(panel, /id="expenseMemberAvatars"/);
  assert.match(panel, /class="expense-overview"/);
  assert.match(panel, /class="expense-main-column"/);
  assert.match(panel, /class="expense-side-column"/);
  assert.match(panel, /class="expense-settings-details"/);
  assert.match(panel, /id="memberChips"/);
  assert.match(panel, /id="exchangeRateList"/);
});

test("記帳渲染包含三摘要、分類甜甜圈、日期明細與結算卡", () => {
  assert.match(app, /class="expense-summary-grid"/);
  assert.match(app, /class="expense-category-card"/);
  assert.match(app, /class="expense-category-donut"/);
  assert.match(app, /class="expense-settlement-card"/);
  assert.match(app, /class="expense-date-group"/);
  assert.match(app, /data-edit-expense=/);
});

test("手機與桌機記帳版型符合核准斷點", () => {
  assert.match(css, /\.expense-mobile-header\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.expense-add-button\s*\{[^}]*width:\s*100%/s);
  const desktop = css.match(/@media \(min-width:\s*1100px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.match(desktop, /#expensesPanel\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+440px/s);
  assert.match(desktop, /\.expense-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(desktop, /\.expense-side-column\s*\{[^}]*display:\s*grid/s);
});
