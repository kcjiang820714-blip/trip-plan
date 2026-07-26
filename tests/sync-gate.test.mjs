import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as syncGateModule from "../sync-gate.js";

const { createSyncCoordinator } = syncGateModule;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("同步閘門提供必要 DOM、樣式與同步入口", async () => {
  const [html, styles, app] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="syncGate"/);
  assert.match(html, /正在與 Supabase 同步旅行資料…/);
  assert.match(html, /id="syncGateRetryButton"/);
  assert.match(html, /id="syncGateCard"[^>]*tabindex="-1"/);
  assert.match(styles, /\.sync-gate/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(app, /requestInitialCloudSync/);
  assert.match(app, /createSyncCoordinator/);
  assert.match(app, /syncGateCard\?\.focus\(\)/);
  assert.match(app, /saveCloudLibraryForInitialAttempt/);
});

test("空雲端首次上傳在切換使用者或登出後不會寫入舊世代", async () => {
  assert.equal(typeof syncGateModule.createAttemptGuard, "function");

  const coordinator = createSyncCoordinator();
  const uploadA = deferred();
  const uploadB = deferred();
  let currentUserId = "user-a";
  const committedUserIds = [];
  const runEmptyCloudInitialUpload = (userId, upload) => coordinator.request(userId, async ({ isCurrent }) => {
    const canCommit = syncGateModule.createAttemptGuard({
      userId,
      isCurrent,
      getCurrentUserId: () => currentUserId,
    });
    await upload.promise;
    if (!canCommit()) return;
    committedUserIds.push(userId);
  });

  const first = runEmptyCloudInitialUpload("user-a", uploadA);
  currentUserId = "user-b";
  const second = runEmptyCloudInitialUpload("user-b", uploadB);
  uploadA.resolve();
  await first;
  assert.deepEqual(committedUserIds, []);

  coordinator.invalidate();
  currentUserId = null;
  uploadB.resolve();
  await second;
  assert.deepEqual(committedUserIds, []);
});

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

test("retry 先成功後，舊 success 不會覆寫 retry 世代的 snapshot", async () => {
  const firstWork = deferred();
  const retryWork = deferred();
  const coordinator = createSyncCoordinator();
  const first = coordinator.request("user-a", () => firstWork.promise);
  const retry = coordinator.request("user-a", () => retryWork.promise, { retry: true });

  retryWork.resolve();
  await retry;
  assert.deepEqual(coordinator.snapshot(), {
    phase: "success",
    userId: "user-a",
    attemptId: 2,
    error: "",
  });

  firstWork.resolve();
  await first;
  assert.deepEqual(coordinator.snapshot(), {
    phase: "success",
    userId: "user-a",
    attemptId: 2,
    error: "",
  });
});

test("retry 成功後，舊 reject 不會覆寫 retry 世代的 snapshot", async () => {
  const firstWork = deferred();
  const retryWork = deferred();
  const coordinator = createSyncCoordinator();
  const first = coordinator.request("user-a", () => firstWork.promise);
  const retry = coordinator.request("user-a", () => retryWork.promise, { retry: true });

  retryWork.resolve();
  await retry;
  firstWork.reject(new Error("舊同步失敗"));
  await assert.rejects(first, /舊同步失敗/);

  assert.deepEqual(coordinator.snapshot(), {
    phase: "success",
    userId: "user-a",
    attemptId: 2,
    error: "",
  });
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

test("登出或切換使用者後，舊世代不得提交旅行資料", async () => {
  const userAWork = deferred();
  const userBWork = deferred();
  const coordinator = createSyncCoordinator();
  let commitLibraryCalls = 0;

  const userA = coordinator.request("user-a", async ({ isCurrent }) => {
    await userAWork.promise;
    if (!isCurrent()) return;
    commitLibraryCalls += 1;
  });
  const userB = coordinator.request("user-b", async ({ isCurrent }) => {
    await userBWork.promise;
    if (!isCurrent()) return;
    commitLibraryCalls += 1;
  }, { retry: true });

  userAWork.resolve();
  await userA;
  assert.equal(commitLibraryCalls, 0);

  userBWork.resolve();
  await userB;
  assert.equal(commitLibraryCalls, 1);
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
