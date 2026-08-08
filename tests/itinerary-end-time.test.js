import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `找不到 ${name}()`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  let started = false;
  for (let index = start; index < appSource.length; index += 1) {
    const character = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      started = true;
    } else if (character === "}" && started && --depth === 0) {
      return appSource.slice(start, index + 1);
    }
  }
  return "";
}

function loadTimeHelpers() {
  const source = ["supportsItineraryEndTime", "formatItineraryTimeRange"]
    .map(functionSource)
    .join("\n");
  return new Function(`${source}\nreturn { supportsItineraryEndTime, formatItineraryTimeRange };`)();
}

test("一般行程可以儲存結束時間，交通與飛機維持專用時間欄位", () => {
  const { supportsItineraryEndTime } = loadTimeHelpers();

  for (const type of ["景點", "彈性探索", "餐廳", "午餐", "住宿", "購物", "散步", "其他"]) {
    assert.equal(supportsItineraryEndTime(type), true, `${type} 應可設定結束時間`);
  }
  assert.equal(supportsItineraryEndTime("交通"), false, "交通已有每段出發與抵達時間");
  assert.equal(supportsItineraryEndTime("飛機"), false, "飛機已有出發與抵達時間");
});

test("時間軸只在有結束時間時顯示起訖範圍，舊資料維持原顯示", () => {
  const { formatItineraryTimeRange } = loadTimeHelpers();

  assert.equal(formatItineraryTimeRange({ type: "景點", time: "09:00", endTime: "11:30" }), "09:00–11:30");
  assert.equal(formatItineraryTimeRange({ type: "彈性探索", time: "14:00", endTime: "17:30" }), "14:00–17:30");
  assert.equal(formatItineraryTimeRange({ type: "餐廳", time: "18:00", endTime: "" }), "18:00", "空白結束時間不得多顯示符號");
  assert.equal(formatItineraryTimeRange({ type: "交通", time: "08:00", endTime: "09:00" }), "08:00", "交通不使用通用結束時間");
  assert.equal(formatItineraryTimeRange({ type: "飛機", time: "07:00", endTime: "12:00" }), "07:00", "飛機不使用通用結束時間");
});

test("行程表單提供獨立開始與結束時間欄位", () => {
  assert.match(htmlSource, /id="itemStartTimeLabel"[\s\S]*?>\s*開始時間/);
  assert.match(htmlSource, /id="itemEndTimeLabel"[\s\S]*?id="flexibleEndTimeInput"[\s\S]*?id="flexibleEndHourInput"[\s\S]*?id="flexibleEndMinuteInput"/);
  const endLabelIndex = htmlSource.indexOf('id="itemEndTimeLabel"');
  const flexibleFieldsIndex = htmlSource.indexOf('id="flexibleExplorationFields"');
  assert.ok(endLabelIndex >= 0 && endLabelIndex < flexibleFieldsIndex, "結束時間不能被關在彈性探索專用區內");
});

test("一般行程送出時保留 endTime，交通與飛機不寫入通用結束時間", () => {
  const submitStart = appSource.indexOf('itemForm.addEventListener("submit"');
  const submitSource = appSource.slice(submitStart, appSource.indexOf("\n});", submitStart) + 4);

  assert.ok(submitStart >= 0, "找不到行程送出處理器");
  assert.match(submitSource, /endTime:\s*supportsItineraryEndTime\(typeInput\.value\)\s*\?\s*flexibleEndTimeInput\.value\.trim\(\)\s*:\s*""/);
});
