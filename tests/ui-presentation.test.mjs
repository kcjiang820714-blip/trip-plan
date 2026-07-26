import assert from "node:assert/strict";
import test from "node:test";
import { bookingGroupIcon, bookingTypeMeta, expenseCategoryMeta, getTodoProgress, renderTodoProgressRing } from "../ui-presentation.js";

const todos = [
  { group: "行前準備", done: true },
  { group: "行前準備", done: false },
  { group: "行李打包", done: false },
  { group: "行李打包", done: true }
];

test("getTodoProgress only counts the active group", () => {
  assert.deepEqual(getTodoProgress(todos, "行前準備"), { total: 2, done: 1, pending: 1, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, "行李打包"), { total: 2, done: 1, pending: 1, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, "不存在"), { total: 0, done: 0, pending: 0, percent: 0 });
});

test("getTodoProgress counts all todos only for all or empty groups", () => {
  assert.deepEqual(getTodoProgress(todos, "全部"), { total: 4, done: 2, pending: 2, percent: 50 });
  assert.deepEqual(getTodoProgress(todos, ""), { total: 4, done: 2, pending: 2, percent: 50 });
});

test("booking and expense category icons use the agreed visible mapping", () => {
  assert.equal(bookingGroupIcon("全部"), "☰");
  assert.equal(bookingGroupIcon("票券"), "🎟️");
  assert.equal(bookingGroupIcon("交通"), "🚆");
  assert.equal(bookingGroupIcon("住宿"), "🛏️");
  assert.equal(bookingGroupIcon("餐廳"), "🍽️");
  assert.equal(bookingTypeMeta("交通").icon, "🚆");
  assert.equal(expenseCategoryMeta("票券").icon, "🎟️");
  assert.equal(expenseCategoryMeta("餐飲").icon, "🍽️");
});

test("renderTodoProgressRing keeps percent and count in one centered content wrapper", () => {
  const markup = renderTodoProgressRing({ total: 2, done: 1, pending: 1, percent: 50 });
  assert.match(markup, /class="todo-progress-ring-content"/);
  assert.match(markup, />50%<\/strong>/);
  assert.match(markup, />1 \/ 2<\/small>/);
});
