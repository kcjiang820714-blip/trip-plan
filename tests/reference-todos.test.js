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

test("待辦總進度包含全部分類，且不改寫輸入資料", () => {
  const getTodoProgress = new Function(
    `${functionSource("getTodoProgress")}
return getTodoProgress;`,
  )();
  const todos = [
    { id: "passport", group: "行前準備", done: true },
    { id: "charger", group: "行李打包", done: false },
    { id: "snacks", group: "購物清單", done: true },
    { id: "alarm", group: "旅途中提醒", done: false },
  ];
  const snapshot = structuredClone(todos);

  assert.deepEqual(getTodoProgress(todos), {
    total: 4,
    done: 2,
    pending: 2,
    percent: 50,
  });
  assert.deepEqual(getTodoProgress([]), {
    total: 0,
    done: 0,
    pending: 0,
    percent: 0,
  });
  assert.deepEqual(todos, snapshot);
});

test("待辦依目前分類分成出發前、本日與可選，並維持原順序", () => {
  const buildTodoSections = new Function(
    `${functionSource("todoPrimaryDate")}
${functionSource("todoSchedule")}
${functionSource("buildTodoSections")}
return buildTodoSections;`,
  )();
  const todos = [
    { id: "future", group: "行李打包", dueDate: "2026-07-25", done: false },
    { id: "today-reminder", group: "行李打包", date: "2026-07-23", done: false },
    { id: "optional", group: "行李打包", done: false },
    { id: "today-prep", group: "行李打包", dueDate: "2026-07-23", done: true },
    { id: "other-group", group: "購物清單", dueDate: "2026-07-23", done: false },
  ];
  const snapshot = structuredClone(todos);
  const sections = buildTodoSections(todos, "行李打包", "2026-07-23");

  assert.deepEqual(sections.departure.map((todo) => todo.id), ["future"]);
  assert.deepEqual(sections.today.map((todo) => todo.id), ["today-reminder", "today-prep"]);
  assert.deepEqual(sections.optional.map((todo) => todo.id), ["optional"]);
  assert.deepEqual(todos, snapshot);
});

test("新增待辦可選擇出發前、本日或可選，並將選擇保存到待辦資料", () => {
  assert.match(html, /<select id="todoScheduleInput"[^>]*>/);
  assert.match(html, /<option value="departure">出發前<\/option>/);
  assert.match(html, /<option value="today">本日<\/option>/);
  assert.match(html, /<option value="optional"(?: selected)?>可選<\/option>/);

  const todoSubmit = app.match(/todoForm\.addEventListener\("submit", async \(event\) => \{[\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.match(todoSubmit, /schedule:\s*todoScheduleInput\.value/);
  assert.match(functionSource("normalizeTodo"), /schedule:/);
});

test("即將到期只取未完成且有日期的待辦，依日期排序並限制筆數", () => {
  const findUpcomingTodos = new Function(
    `${functionSource("todoPrimaryDate")}
${functionSource("findUpcomingTodos")}
return findUpcomingTodos;`,
  )();
  const todos = [
    { id: "later", dueDate: "2026-07-28", done: false },
    { id: "today", date: "2026-07-23", time: "18:00", done: false },
    { id: "optional", done: false },
    { id: "done", dueDate: "2026-07-24", done: true },
    { id: "tomorrow", dueDate: "2026-07-24", done: false },
    { id: "past", dueDate: "2026-07-22", done: false },
  ];
  const snapshot = structuredClone(todos);

  assert.deepEqual(
    findUpcomingTodos(todos, "2026-07-23", 2).map((todo) => todo.id),
    ["today", "tomorrow"],
  );
  assert.deepEqual(todos, snapshot);
});

test("待辦 panel 同時提供手機摘要、桌機主欄與右側工具", () => {
  const panel = html.match(/<section class="trip-section-panel" id="todosPanel"[\s\S]*?<\/section>\s*<section class="trip-section-panel" id="expensesPanel"/)?.[0] ?? "";

  assert.match(panel, /class="todo-mobile-header"/);
  assert.match(panel, /id="todoProgressSummary"/);
  assert.match(panel, /class="todo-progress-card"/);
  assert.match(panel, /class="todo-main-column"/);
  assert.match(panel, /id="todoGroups"/);
  assert.match(panel, /class="todo-side-column"/);
  assert.match(panel, /id="todoProgressSide"/);
  assert.match(panel, /id="todoQuickAddButton"/);
  assert.match(panel, /id="todoUpcomingList"/);
  assert.match(panel, /id="addTodoButton"/);
  assert.match(panel, /class="[^"]*todo-desktop-fab/);
});

test("待辦渲染保留分類、勾選與編輯權限入口，並產生三個分組", () => {
  const renderTodos = functionSource("renderTodos");

  assert.match(renderTodos, /getTodoProgress\(trip\.todos\)/);
  assert.match(renderTodos, /buildTodoSections\(trip\.todos,\s*state\.activeTodoGroup/);
  assert.match(renderTodos, /findUpcomingTodos\(trip\.todos/);
  assert.match(renderTodos, /todo-section-departure/);
  assert.match(renderTodos, /todo-section-today/);
  assert.match(renderTodos, /todo-section-optional/);
  assert.match(renderTodos, /data-toggle-todo=/);
  assert.match(renderTodos, /canEditTodo\(todo,\s*trip\)/);
  assert.match(renderTodos, /data-edit-todo=/);
});

test("手機待辦會顯示已選出發前與本日的項目，不以日期欄位決定可見性", () => {
  const renderTodos = functionSource("renderTodos");

  assert.match(renderTodos, /const mobileScheduledTodos = \[\.\.\.sections\.departure, \.\.\.sections\.today\];/);
  assert.match(renderTodos, /title: "出發前與本日", todos: mobileScheduledTodos/);
  assert.doesNotMatch(renderTodos, /mobileScheduledTodos = trip\.todos\.filter\(/);
});

test("手機購物待辦以不可換行金額單位呈現，長品名保留截斷空間", () => {
  const renderTodos = functionSource("renderTodos");
  const amountRuleIndex = css.indexOf(".todo-list-amount");
  const mobileRules = css.slice(
    css.lastIndexOf("@media (max-width: 679px) {", amountRuleIndex),
    css.indexOf("\n}\n", amountRuleIndex) + 3,
  );
  const mobileProductDetail = mobileRules.match(
    /\.todo-list-row:has\(\.todo-product-thumbnail\) \.todo-list-detail\s*\{([^}]*)\}/,
  )?.[1] ?? "";

  assert.match(renderTodos, /class="todo-list-amount"/);
  assert.match(mobileRules, /\.todo-list-amount\s*\{[^}]*white-space:\s*nowrap/s);
  assert.doesNotMatch(mobileProductDetail, /overflow-wrap:\s*anywhere/);
});

test("購物待辦同時有數量與金額時，渲染會保留數量和不可換行金額", () => {
  const todo = { id: "shopping-1", group: "購物清單", text: "長品名商品", quantity: 2, unit: "個", amount: 2090, currency: "JPY", attachments: [] };
  const todoGroups = { innerHTML: "" };
  const renderTodos = new Function(
    "currentTrip",
    "state",
    "getTodoProgress",
    "buildTodoSections",
    "findUpcomingTodos",
    "canUseCollaborativeTools",
    "todoSectionTitle",
    "todoProgressSummary",
    "todoSubTabs",
    "document",
    "todoQuickAddButton",
    "todoProgressMobile",
    "todoProgressSide",
    "todoUpcomingList",
    "todoGroups",
    "window",
    "getPrimaryImageAttachment",
    "escapeHtml",
    "getAttachmentSource",
    "todoPrimaryDate",
    "canEditTodo",
    `${functionSource("formatAmount")}
${functionSource("todoSecondColumnValue")}
${functionSource("renderTodos")}
return renderTodos;`,
  )(
    () => ({ todos: [todo] }),
    { activeTodoGroup: "購物清單" },
    () => ({ done: 0, total: 1, pending: 1, percent: 0 }),
    () => ({ departure: [todo], today: [], optional: [] }),
    () => [],
    () => true,
    { textContent: "" },
    { textContent: "" },
    { querySelectorAll: () => [] },
    { querySelector: () => ({ hidden: false }) },
    { hidden: false },
    { innerHTML: "" },
    { innerHTML: "" },
    { innerHTML: "" },
    todoGroups,
    { matchMedia: () => ({ matches: true }) },
    () => null,
    (value) => String(value),
    () => "",
    () => "",
    () => false,
  );

  renderTodos();

  assert.match(todoGroups.innerHTML, /<span class="todo-list-detail">2 個 · <span class="todo-list-amount">JPY 2,090<\/span><\/span>/);
});

test("待辦手機與桌機版型符合參考圖斷點", () => {
  assert.match(css, /\.todo-mobile-header\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.todo-add-button\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.todo-progress-ring\s*\{[^}]*conic-gradient/s);
  const mobile = css.match(/@media \(max-width:\s*679px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(css, /@media \(max-width:\s*679px\)[\s\S]*#tripView\[data-active-section="todos"\]\s+\.trip-appbar[\s\S]*display:\s*none/s);
  assert.match(css, /@media \(max-width:\s*679px\)[\s\S]*\.todo-section-departure\s*\{[^}]*display:\s*none/s);
  const desktop = css.match(/@media \(min-width:\s*1100px\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? "";
  assert.match(desktop, /#todosPanel\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+390px/s);
  assert.match(desktop, /\.todo-side-column\s*\{[^}]*display:\s*grid/s);
  assert.match(desktop, /\.todo-desktop-fab\s*\{[^}]*position:\s*fixed/s);
});
