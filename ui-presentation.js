const allGroups = new Set(["", "全部"]);

export function getTodoProgress(todos = [], activeGroup = "") {
  const visibleTodos = allGroups.has(activeGroup) ? todos : todos.filter((todo) => todo.group === activeGroup);
  const total = visibleTodos.length;
  const done = visibleTodos.filter((todo) => Boolean(todo.done)).length;
  return { total, done, pending: total - done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function renderTodoProgressRing(progress) {
  return `<div class="todo-progress-ring" style="--todo-progress: ${progress.percent}" aria-label="已完成 ${progress.percent}%"><div class="todo-progress-ring-content"><strong>${progress.percent}%</strong><small>${progress.done} / ${progress.total}</small></div></div>`;
}

const bookingIcons = { 全部: "☰", 票券: "🎟️", 交通: "🚆", 住宿: "🛏️", 餐廳: "🍽️" };

export function bookingGroupIcon(group) {
  return bookingIcons[group] || "⋯";
}

export function bookingTypeMeta(type) {
  const group = bookingIcons[type] ? type : "票券";
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
