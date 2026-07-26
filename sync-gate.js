export function createSyncCoordinator({ onStateChange = () => {} } = {}) {
  let sequence = 0;
  let active = null;
  let state = { phase: "idle", userId: null, attemptId: 0, error: "" };

  const publish = (next) => {
    state = { ...next };
    onStateChange(state);
  };

  const isCurrent = (attemptId, userId) => (
    active?.attemptId === attemptId && active?.userId === userId
  );

  function request(userId, work, { retry = false } = {}) {
    if (!retry && active?.userId === userId && state.phase === "loading") {
      return active.promise;
    }

    const attemptId = ++sequence;
    const token = { attemptId, userId };
    let resolveRequest;
    let rejectRequest;
    const promise = new Promise((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });

    active = { ...token, promise };
    publish({ phase: "loading", userId, attemptId, error: "" });

    try {
      Promise.resolve(work({ ...token, isCurrent: () => isCurrent(attemptId, userId) })).then(
        () => {
          if (isCurrent(attemptId, userId)) {
            publish({ phase: "success", userId, attemptId, error: "" });
          }
          resolveRequest();
        },
        (error) => {
          if (isCurrent(attemptId, userId)) {
            publish({
              phase: "error",
              userId,
              attemptId,
              error: String(error?.message || "發生未預期的連線錯誤，請檢查網路後重新同步。"),
            });
          }
          rejectRequest(error);
        },
      );
    } catch (error) {
      if (isCurrent(attemptId, userId)) {
        publish({
          phase: "error",
          userId,
          attemptId,
          error: String(error?.message || "發生未預期的連線錯誤，請檢查網路後重新同步。"),
        });
      }
      rejectRequest(error);
    }

    return promise;
  }

  function invalidate() {
    active = null;
    publish({ phase: "idle", userId: null, attemptId: ++sequence, error: "" });
  }

  return { request, invalidate, snapshot: () => ({ ...state }) };
}
