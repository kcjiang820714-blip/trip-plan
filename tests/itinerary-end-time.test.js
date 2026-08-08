import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

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
  const source = [
    "escapeHtml",
    "supportsItineraryEndTime",
    "formatItineraryTimeRange",
    "getItineraryDurationMinutes",
    "formatItineraryDuration",
    "renderItineraryTimelineTime"
  ]
    .map(functionSource)
    .join("\n");
  return new Function(
    `${source}\nreturn { supportsItineraryEndTime, formatItineraryTimeRange, getItineraryDurationMinutes, formatItineraryDuration, renderItineraryTimelineTime };`
  )();
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

test("一般行程與彈性探索會計算停留時長，並正確處理跨午夜", () => {
  const { getItineraryDurationMinutes, formatItineraryDuration } = loadTimeHelpers();

  assert.equal(getItineraryDurationMinutes({ type: "景點", time: "07:35", endTime: "08:30" }), 55);
  assert.equal(formatItineraryDuration({ type: "彈性探索", time: "09:00", endTime: "10:30" }), "1 Hr 30 Min");
  assert.equal(formatItineraryDuration({ type: "餐廳", time: "12:00", endTime: "13:00" }), "1 Hr");
  assert.equal(formatItineraryDuration({ type: "購物", time: "14:00", endTime: "14:30" }), "30 Min");
  assert.equal(formatItineraryDuration({ type: "散步", time: "23:30", endTime: "01:00" }), "1 Hr 30 Min");
  assert.equal(formatItineraryDuration({ type: "景點", time: "08:30", endTime: "08:30" }), "0 Min");
  assert.equal(formatItineraryDuration({ type: "景點", time: "", endTime: "10:00" }), "");
  assert.equal(formatItineraryDuration({ type: "交通", time: "08:00", endTime: "09:00" }), "", "交通不可誤用通用停留時長");
  assert.equal(formatItineraryDuration({ type: "飛機", time: "07:00", endTime: "12:00" }), "", "飛機不可誤用通用停留時長");
});

test("有起訖時間的一般行程使用垂直時段，舊行程與交通維持單一時間", () => {
  const { renderItineraryTimelineTime } = loadTimeHelpers();
  const stacked = renderItineraryTimelineTime({ type: "景點", time: "07:35", endTime: "08:30" });
  const flexible = renderItineraryTimelineTime({ type: "彈性探索", time: "17:00", endTime: "19:30" });
  const legacy = renderItineraryTimelineTime({ type: "餐廳", time: "12:00", endTime: "" });
  const transport = renderItineraryTimelineTime({ type: "交通", time: "08:00", endTime: "09:00" });

  assert.match(stacked, /class="time itinerary-time-range is-stacked"/);
  assert.match(stacked, /class="itinerary-time-start">07:35<\/span>/);
  assert.match(stacked, /class="itinerary-time-connector"/);
  assert.match(stacked, /class="itinerary-time-end">08:30<\/span>/);
  assert.match(stacked, /class="itinerary-time-duration">55 Min<\/span>/);
  assert.match(flexible, /class="itinerary-time-duration">2 Hr 30 Min<\/span>/);
  assert.match(legacy, /class="time itinerary-time-range is-single is-single-itinerary-time"[^>]*>[\s\S]*12:00/);
  assert.doesNotMatch(legacy, /itinerary-time-connector|itinerary-time-duration/);
  assert.match(transport, /class="time itinerary-time-range is-single"[^>]*>[\s\S]*08:00/);
  assert.doesNotMatch(transport, /is-single-itinerary-time/, "交通不應套用一般行程的單一時間置中版型");
  assert.doesNotMatch(transport, /09:00|itinerary-time-connector|itinerary-time-duration/);
});

test("垂直時段在桌機與手機都保留狀態類別，時長不會造成水平溢出", () => {
  assert.match(styleSource, /\.itinerary-time-range\.is-stacked\s*\{[\s\S]*?display:\s*grid/);
  assert.match(styleSource, /\.itinerary-time-connector\s*\{[\s\S]*?height:\s*\d+px/);
  assert.match(styleSource, /\.itinerary-time-duration\s*\{[\s\S]*?white-space:\s*nowrap/);
  assert.match(styleSource, /@media\s*\(max-width:\s*679px\)[\s\S]*?\.itinerary-time-range\.is-stacked/);
  assert.match(styleSource, /@media\s*\(min-width:\s*1100px\)[\s\S]*?\.itinerary-time-range\.is-stacked/);
});

test("垂直起訖時間會置中對齊對應的行程卡", () => {
  assert.match(
    styleSource,
    /#tripView\[data-active-section="itinerary"\]\s+#itineraryPanel\s+\.itinerary-time-range\.is-stacked\s*\{[\s\S]*?align-self:\s*center/,
    "有起訖時間的左側時間欄必須對齊右側行程卡的垂直中央"
  );
  assert.match(
    styleSource,
    /@media\s*\(max-width:\s*679px\)[\s\S]*?\.item-summary:has\(\.itinerary-time-range\.is-stacked\)[\s\S]*?grid-template-columns:\s*72px\s+minmax\(0,\s*1fr\)\s+24px\s*!important[\s\S]*?grid-template-areas:\s*"time content arrow"/,
    "手機版的垂直時段要在左欄，並與右側內容同列置中"
  );
});

test("沒有結束時間的單一時間也會置中對齊行程卡", () => {
  assert.match(
    styleSource,
    /#tripView\[data-active-section="itinerary"\]\s+#itineraryPanel\s+\.itinerary-time-range\.is-single-itinerary-time\s*\{[\s\S]*?align-self:\s*center[\s\S]*?padding-top:\s*0/,
    "單一時間必須與有起訖時間的行程同樣置中，且不保留舊有頂部間距"
  );
  assert.match(
    styleSource,
    /@media\s*\(max-width:\s*679px\)[\s\S]*?\.item-summary:has\(\.itinerary-time-range\.is-single-itinerary-time\)[\s\S]*?grid-template-columns:\s*72px\s+minmax\(0,\s*1fr\)\s+24px\s*!important[\s\S]*?align-items:\s*center/,
    "手機版的單一時間也要留在左欄，並與卡片垂直置中"
  );
});

test("共用時間欄中心版本由 PWA v174 一致提供", () => {
  assert.match(htmlSource, /styles\.css\?v=174/);
  assert.match(htmlSource, /app\.js\?v=174/);
  assert.match(appSource, /serviceWorker\.register\("\.\/sw\.js\?v=174"\)/);
  assert.match(serviceWorkerSource, /const CACHE_NAME = "trip-notebook-v174"/);
  assert.match(serviceWorkerSource, /"\.\/styles\.css\?v=174"/);
  assert.match(serviceWorkerSource, /"\.\/app\.js\?v=174"/);
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
