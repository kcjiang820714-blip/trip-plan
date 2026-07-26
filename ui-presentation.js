const allGroups = new Set(["", "全部"]);
const todoGroups = new Set(["行前準備", "行李打包", "購物清單", "旅途中提醒"]);

export function filterTodosByGroup(todos = [], activeGroup = "") {
  return allGroups.has(activeGroup) ? todos : todos.filter((todo) => todo.group === activeGroup);
}

export function getDefaultTodoGroup(activeGroup = "") {
  return todoGroups.has(activeGroup) ? activeGroup : "行前準備";
}

export function getTodoProgress(todos = [], activeGroup = "") {
  const visibleTodos = filterTodosByGroup(todos, activeGroup);
  const total = visibleTodos.length;
  const done = visibleTodos.filter((todo) => Boolean(todo.done)).length;
  return { total, done, pending: total - done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function renderTodoProgressRing(progress) {
  return `<div class="todo-progress-ring" style="--todo-progress: ${progress.percent}" aria-label="已完成 ${progress.percent}%"><div class="todo-progress-ring-content"><strong>${progress.percent}%</strong><small>${progress.done} / ${progress.total}</small></div></div>`;
}

const bookingIcons = { 全部: "☰", 票券: "🎟️", 交通: "🚆", 住宿: "🛏️", 餐廳: "🍽️" };
const ticketBookingTypes = new Set(["票券", "機票", "景點票券", "活動"]);

export function bookingGroupIcon(group) {
  return bookingIcons[group] || "⋯";
}

export function bookingTypeMeta(type) {
  const normalized = String(type || "其他").trim() || "其他";
  const group = ticketBookingTypes.has(normalized) ? "票券" : normalized;
  if (!bookingIcons[group]) return { group, icon: "⋯", tone: "other" };
  const tone = group === "住宿" ? "green" : group === "餐廳" ? "coral" : "blue";
  return { group, icon: bookingGroupIcon(group), tone };
}

export function expenseCategoryMeta(category) {
  const normalized = String(category || "其他");
  if (normalized.includes("餐") || normalized.includes("食")) return { icon: "🍽️", tone: "food" };
  if (normalized.includes("交通") || normalized.includes("車")) return { icon: "🚆", tone: "transport" };
  if (normalized.includes("景點") || normalized.includes("門票") || normalized.includes("票")) return { icon: "🎟️", tone: "sight" };
  if (normalized.includes("購物")) return { icon: "🛍️", tone: "shopping" };
  if (normalized.includes("住宿")) return { icon: "🛏️", tone: "stay" };
  return { icon: "⋯", tone: "other" };
}
