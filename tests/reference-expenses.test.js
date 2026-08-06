import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const exchangeRateSql = readFileSync(new URL("../supabase-expense-exchange-rate.sql", import.meta.url), "utf8");

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

function cssBlock(source, openingBrace) {
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }

  throw new Error("CSS 區塊不完整");
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

test("付款人頭像色碼與頁首成員頭像一致，未知付款人安全使用預設色", () => {
  const expenseMemberAvatarClass = new Function(
    `function expenseMemberNames(trip) { return trip.members; }
${functionSource("expenseMemberAvatarClass")}
return expenseMemberAvatarClass;`,
  )();
  const trip = { members: ["晨", "智", "娘"] };

  assert.equal(expenseMemberAvatarClass(trip, "晨"), "expense-avatar-1");
  assert.equal(expenseMemberAvatarClass(trip, "智"), "expense-avatar-2");
  assert.equal(expenseMemberAvatarClass(trip, "娘"), "expense-avatar-3");
  assert.equal(expenseMemberAvatarClass(trip, "未知付款人"), "expense-avatar-1");
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
  const desktopExpenseButton = [...css.matchAll(/@media \(min-width:\s*1100px\)\s*\{/g)]
    .map((match) => cssBlock(css, match.index + match[0].length - 1))
    .find((block) => /\.expense-add-button\s*\{[^}]*position:\s*absolute/s.test(block))
    ?.match(/\.expense-add-button\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(desktopExpenseButton, /display:\s*inline-flex/);
  assert.match(desktopExpenseButton, /position:\s*absolute/);
  assert.match(desktopExpenseButton, /top:\s*75px/);
  assert.match(desktopExpenseButton, /right:\s*0/);
});

test("桌機新增支出按鈕與分類圖例保持完整且置中", () => {
  const desktopBlocks = [...css.matchAll(/@media \(min-width:\s*1100px\)\s*\{/g)]
    .map((match) => cssBlock(css, match.index + match[0].length - 1));
  const desktopExpenseButton = desktopBlocks
    .find((block) => /\.expense-add-button\s*\{[^}]*position:\s*absolute/s.test(block))
    ?.match(/\.expense-add-button\s*\{([^}]*)\}/s)?.[1] ?? "";
  const desktopLegend = desktopBlocks
    .find((block) => /\.expense-category-card \.expense-category-legend > div\s*\{/s.test(block)) ?? "";
  const desktopLegendLabel = desktopLegend.match(/\.expense-category-card \.expense-category-legend span\s*\{([^}]*)\}/s)?.[1] ?? "";

  assert.match(desktopExpenseButton, /align-items:\s*center/);
  assert.match(desktopExpenseButton, /justify-content:\s*center/);
  assert.match(desktopLegend, /\.expense-category-card-body\s*\{[^}]*grid-template-columns:\s*124px\s+minmax\(0,\s*1fr\)/s);
  assert.match(desktopLegend, /\.expense-category-donut-large\s*\{[^}]*max-width:\s*124px/s);
  assert.match(desktopLegend, /\.expense-category-card \.expense-category-legend > div\s*\{[^}]*grid-template-columns:\s*minmax\(44px,\s*1fr\)\s+auto\s+auto/s);
  assert.match(desktopLegendLabel, /overflow:\s*visible/);
  assert.match(desktopLegendLabel, /white-space:\s*normal/);
});

test("手機總支出摘要以上下分區保護 TWD 金額與圓餅圖", () => {
  const mobileSummary = [...css.matchAll(/@media \(max-width:\s*679px\)\s*\{/g)]
    .map((match) => cssBlock(css, match.index + match[0].length - 1))
    .find((block) => /\.expense-mobile-summary-card\s*\{[^}]*grid-template-areas/s.test(block)) ?? "";
  const mobileTotal = mobileSummary.match(/\.expense-mobile-total\s*\{([^}]*)\}/s)?.[1] ?? "";
  const mobileCategory = mobileSummary.match(/\.expense-mobile-category\s*\{([^}]*)\}/s)?.[1] ?? "";

  assert.match(mobileSummary, /\.expense-mobile-summary-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(mobileSummary, /\.expense-mobile-summary-card\s*\{[^}]*grid-template-areas:\s*"total"\s*"category"/s);
  assert.match(mobileTotal, /border-right:\s*0/);
  assert.match(mobileCategory, /grid-template-columns:\s*96px\s+minmax\(0,\s*1fr\)/);
});

test("每日匯率將 TWD 基準反算為 app 使用的外幣兌台幣匯率", () => {
  const buildTwdExchangeRates = new Function(
    `const DEFAULT_EXCHANGE_RATES = { TWD: 1, JPY: 0.22, KRW: 0.024, USD: 32, EUR: 35, CHF: 36 };
${functionSource("buildTwdExchangeRates")}
return buildTwdExchangeRates;`,
  )();

  assert.deepEqual(buildTwdExchangeRates({ JPY: 4.5, KRW: 41.6666667, USD: 0.03125, EUR: 0.0285714, CHF: 0.0277778 }), {
    TWD: 1,
    JPY: 1 / 4.5,
    KRW: 1 / 41.6666667,
    USD: 32,
    EUR: 1 / 0.0285714,
    CHF: 1 / 0.0277778,
  });
});

test("支出有鎖定匯率時優先換算，舊支出仍使用旅程目前匯率", () => {
  const convertToTwd = new Function(
    `const DEFAULT_EXCHANGE_RATES = { TWD: 1, JPY: 0.22, KRW: 0.024, USD: 32, EUR: 35, CHF: 36 };
${functionSource("normalizeExchangeRates")}
${functionSource("convertToTwd")}
return convertToTwd;`,
  )();
  const trip = { exchangeRates: { JPY: 0.25 } };

  assert.equal(convertToTwd(1000, "JPY", trip, 0.22), 220);
  assert.equal(convertToTwd(1000, "JPY", trip), 250);
});

test("每日匯率更新有單次請求保護、失敗保留舊資料與更新中繼資料", () => {
  const updateSource = functionSource("updateDailyExchangeRates");

  assert.match(updateSource, /https:\/\/open\.er-api\.com\/v6\/latest\/TWD/);
  assert.match(updateSource, /exchangeRateUpdatePromise/);
  assert.match(updateSource, /exchangeRatesUpdatedAt/);
  assert.match(updateSource, /exchangeRatesSource/);
  assert.match(updateSource, /catch\s*\(/);
  assert.match(updateSource, /existingRates/);
  assert.match(updateSource, /canManageTrip\(trip\)/);
});

test("匯率區顯示每日更新狀態與僅供管理者使用的立即更新按鈕", () => {
  assert.match(html, /id="exchangeRateStatus"/);
  assert.match(html, /id="updateExchangeRatesButton"/);
  assert.match(app, /updateExchangeRatesButton\.addEventListener\("click"/);
  assert.match(app, /updateExchangeRatesButton\.disabled\s*=\s*!canManageTrip/);
  assert.match(app, /上次成功資料仍在使用/);
  assert.match(css, /\.exchange-rate-status/);
});

test("雲端支出同步會保留鎖定匯率，並提供可重複執行的欄位遷移", () => {
  assert.match(exchangeRateSql, /alter\s+table\s+public\.trip_expenses\s+add\s+column\s+if\s+not\s+exists\s+exchange_rate\s+numeric\s*;/i);
  assert.doesNotMatch(exchangeRateSql, /exchange_rate\s+numeric\s+not\s+null/i);
  assert.match(functionSource("fromCloudExpense"), /exchangeRate:\s*row\.exchange_rate/);
  assert.match(functionSource("toCloudExpensePayload"), /exchange_rate:\s*expense\.exchangeRate\s*\?\?\s*null/);
  assert.match(app, /select\("id,trip_id,created_by,date,name,amount,currency,category,payer,share_with,note,exchange_rate,created_at,updated_at"\)/);
});

test("normalizeLibrary 保留有效匯率更新 metadata，並將無效值安全設為 null", () => {
  const normalizeLibrary = new Function(
    `const DEFAULT_EXCHANGE_RATES = { TWD: 1 };
function normalizeTripDates() { return { startDate: "", endDate: "", dayCount: 1, label: "" }; }
function normalizeDay(day) { return day; }
function createBlankDays() { return [{}]; }
function normalizeTripSegments(value) { return value || []; }
function normalizePdfImages(value) { return value || {}; }
function normalizeSharedMembers(value) { return value || []; }
function normalizeMembers(value) { return value || []; }
function normalizeExchangeRates(value) { return value || DEFAULT_EXCHANGE_RATES; }
function normalizeWeatherLocations(value) { return value || {}; }
function normalizeWeatherForecasts(value) { return value || {}; }
function normalizeBooking(value) { return value; }
function normalizeTodo(value) { return value; }
function normalizeExpense(value) { return value; }
function createId() { return "generated"; }
${functionSource("normalizeExchangeRateTimestamp")}
${functionSource("normalizeExchangeRateMetadata")}
${functionSource("normalizeLibrary")}
return normalizeLibrary;`,
  )();

  const valid = normalizeLibrary({
    trips: [{
      id: "trip-1",
      days: [{}],
      exchangeRatesUpdatedAt: "2026-07-23T01:02:03.000Z",
      exchangeRatesSource: " ExchangeRate-API ",
      exchangeRatesAutoAttemptedAt: "2026-07-23T00:00:00.000Z"
    }]
  }).trips[0];
  assert.deepEqual(
    {
      exchangeRatesUpdatedAt: valid.exchangeRatesUpdatedAt,
      exchangeRatesSource: valid.exchangeRatesSource,
      exchangeRatesAutoAttemptedAt: valid.exchangeRatesAutoAttemptedAt
    },
    {
      exchangeRatesUpdatedAt: "2026-07-23T01:02:03.000Z",
      exchangeRatesSource: "ExchangeRate-API",
      exchangeRatesAutoAttemptedAt: "2026-07-23T00:00:00.000Z"
    }
  );

  const invalid = normalizeLibrary({
    trips: [{ id: "trip-2", days: [{}], exchangeRatesUpdatedAt: "not-a-date", exchangeRatesSource: " ", exchangeRatesAutoAttemptedAt: 42 }]
  }).trips[0];
  assert.equal(invalid.exchangeRatesUpdatedAt, null);
  assert.equal(invalid.exchangeRatesSource, null);
  assert.equal(invalid.exchangeRatesAutoAttemptedAt, null);
});
