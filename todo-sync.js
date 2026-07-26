export function mergeUnpublishedPrivateTodos(localTrips = [], cloudTrips = [], currentUserId, pendingTodoIds = new Set()) {
  const unpublishedTodosByTripId = new Map();

  for (const trip of localTrips) {
    if (!trip?.cloudId) continue;
    const unpublishedPrivateTodos = (trip.todos || []).filter((todo) => (
      todo?.visibility === "private" &&
      todo.ownerId === currentUserId &&
      (!todo.cloudId || pendingTodoIds.has(todo.id))
    ));
    if (unpublishedPrivateTodos.length > 0) unpublishedTodosByTripId.set(trip.cloudId, unpublishedPrivateTodos);
  }

  return cloudTrips.map((trip) => {
    const unpublishedPrivateTodos = unpublishedTodosByTripId.get(trip.cloudId) || [];
    if (unpublishedPrivateTodos.length === 0) return trip;
    const cloudTodoIds = new Set((trip.todos || []).flatMap((todo) => [todo.cloudId, todo.id]).filter(Boolean));
    const todosToKeep = unpublishedPrivateTodos.filter((todo) => !cloudTodoIds.has(todo.cloudId || todo.id));
    if (todosToKeep.length === 0) return trip;
    return { ...trip, todos: [...(trip.todos || []), ...todosToKeep] };
  });
}

export async function upsertTodoImmediately({ client, trip, todo, currentUserId, toPayload, upsertCloudRow }) {
  if (!trip?.cloudId || !todo) return null;

  const cloudId = await upsertCloudRow(client, "trip_todos", todo.cloudId, toPayload(trip, todo));
  if (cloudId) {
    todo.cloudId = cloudId;
    todo.ownerId = todo.ownerId || currentUserId;
  }
  return cloudId;
}
