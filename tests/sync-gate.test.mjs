import test from "node:test";
import assert from "node:assert/strict";
import { createSyncCoordinator } from "../sync-gate.js";

test("同一使用者的同步會共用同一個 promise", async () => {
  let resolveWork;
  let calls = 0;
  const coordinator = createSyncCoordinator();
  const work = () => {
    calls += 1;
    return new Promise((resolve) => { resolveWork = resolve; });
  };

  const first = coordinator.request("user-a", work);
  const second = coordinator.request("user-a", work);

  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveWork();
  await first;
  assert.equal(coordinator.snapshot().phase, "success");
});

test("重試後舊世代不再是目前同步", async () => {
  let resolveFirst;
  let firstIsCurrent;
  const coordinator = createSyncCoordinator();
  const first = coordinator.request("user-a", ({ isCurrent }) => {
    firstIsCurrent = isCurrent;
    return new Promise((resolve) => { resolveFirst = resolve; });
  });

  await Promise.resolve();
  const retry = coordinator.request("user-a", () => Promise.resolve(), { retry: true });

  assert.equal(firstIsCurrent(), false);
  resolveFirst();
  await Promise.all([first, retry]);
  assert.equal(coordinator.snapshot().phase, "success");
});

test("invalidate 後未完成同步不再是目前世代", async () => {
  let resolveWork;
  let isCurrent;
  const coordinator = createSyncCoordinator();
  const request = coordinator.request("user-a", (context) => {
    isCurrent = context.isCurrent;
    return new Promise((resolve) => { resolveWork = resolve; });
  });

  await Promise.resolve();
  coordinator.invalidate();

  assert.equal(isCurrent(), false);
  resolveWork();
  await request;
  assert.deepEqual(coordinator.snapshot(), {
    phase: "idle",
    userId: null,
    attemptId: 2,
    error: "",
  });
});

test("目前世代失敗時保留安全的錯誤訊息", async () => {
  const coordinator = createSyncCoordinator();
  const error = new Error("網路中斷");

  await assert.rejects(
    coordinator.request("user-a", () => Promise.reject(error)),
    error,
  );

  assert.deepEqual(coordinator.snapshot(), {
    phase: "error",
    userId: "user-a",
    attemptId: 1,
    error: "網路中斷",
  });
});
