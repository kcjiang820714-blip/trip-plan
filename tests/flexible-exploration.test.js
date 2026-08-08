import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  if (start < 0) return "";

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
    if (["'", "\"", "`"].includes(character)) {
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

function loadFlexibleExplorationHelpers() {
  const sources = ["normalizeFlexibleStops", "formatFlexibleExploreSummary", "normalizeItem"]
    .map(functionSource)
    .join("\n");
  return new Function(
    "createId",
    "normalizeAttachment",
    "normalizeTransportSegment",
    `${sources}\nreturn { normalizeFlexibleStops, formatFlexibleExploreSummary, normalizeItem };`
  )(
    () => "generated-item",
    (attachment) => attachment,
    (segment) => segment
  );
}

test("彈性探索資料正規化會補齊欄位、保留有效景點並輸出摘要", () => {
  const { normalizeItem, formatFlexibleExploreSummary } = loadFlexibleExplorationHelpers();

  const legacyItem = normalizeItem({ id: "legacy" });
  assert.equal(legacyItem.endTime, "", "舊行程應安全補上空白結束時間");
  assert.deepEqual(legacyItem.flexibleStops, [], "舊行程應安全補上空白景點清單");

  const item = normalizeItem({
    id: "explore-1",
    flexibleStops: [
      {
        id: "temple",
        name: "  清水寺  ",
        intro: "  可看本堂舞台  ",
        location: "  日本京都府京都市東山區清水1丁目294  ",
        photo: { id: "photo-1", dataUrl: "data:image/jpeg;base64,abc" },
        ignored: "不能保留"
      },
      { id: "blank", name: "   ", intro: "不應出現" },
      { name: "二年坂", intro: null }
    ]
  });

  assert.deepEqual(item.flexibleStops, [
    {
      id: "temple",
      name: "清水寺",
      intro: "可看本堂舞台",
      location: "日本京都府京都市東山區清水1丁目294",
      photo: { id: "photo-1", dataUrl: "data:image/jpeg;base64,abc" }
    },
    { id: "generated-item", name: "二年坂", intro: "", location: "", photo: null }
  ]);
  assert.equal(formatFlexibleExploreSummary(item.flexibleStops), "2 個景點可彈性安排");
});

function loadFlexibleFormHelpers(fields) {
  const sources = ["renderFlexibleStopEditors", "collectFlexibleStops", "syncFlexibleExplorationFields"]
    .map(functionSource)
    .join("\n");
  return new Function(
    ...Object.keys(fields),
    `${sources}\nreturn { renderFlexibleStopEditors, collectFlexibleStops, syncFlexibleExplorationFields };`
  )(...Object.values(fields));
}

function createControl() {
  return { disabled: false, hidden: false, required: false, readOnly: false, value: "" };
}

test("彈性探索編輯器保留景點介紹，並在切換類型時只啟用專用欄位", () => {
  const startTimeLabel = { hidden: false };
  const photoLabel = createControl();
  const flexibleStopList = {
    innerHTML: "",
    querySelectorAll: () => [
      {
        dataset: { flexibleStopId: "temple" },
        querySelector: (selector) => ({
          '[data-flexible-stop-field="name"]': { value: " 清水寺 " },
          '[data-flexible-stop-field="intro"]': { value: " 可看本堂舞台 " },
          '[data-flexible-stop-field="location"]': { value: " 京都府清水寺 " }
        })[selector],
        flexibleStopPhoto: { id: "photo-1", dataUrl: "data:image/jpeg;base64,abc" }
      },
      {
        dataset: { flexibleStopId: "blank" },
        querySelector: (selector) => ({
          '[data-flexible-stop-field="name"]': { value: "   " },
          '[data-flexible-stop-field="intro"]': { value: "不應儲存" },
          '[data-flexible-stop-field="location"]': { value: "不應儲存" }
        })[selector]
      }
    ]
  };
  const fields = {
    flexibleStopList,
    escapeHtml: (value) => String(value),
    getAttachmentSource: (attachment) => attachment?.dataUrl || attachment?.publicUrl || "",
    typeInput: { value: "彈性探索" },
    flexibleExplorationFields: createControl(),
    flexibleEndTimeInput: createControl(),
    flexibleEndHourInput: createControl(),
    flexibleEndMinuteInput: createControl(),
    timeInput: { closest: () => startTimeLabel },
    timeHourInput: createControl(),
    timeMinuteInput: createControl(),
    placeInput: createControl(),
    placeInputLabel: { textContent: "地點", append: () => {} },
    flightFields: createControl(),
    transportFields: createControl(),
    attractionFields: createControl(),
    itemPhotoInput: { disabled: false, closest: () => photoLabel },
    itemExistingAttachments: { ...createControl(), children: [] }
  };
  const { renderFlexibleStopEditors, collectFlexibleStops, syncFlexibleExplorationFields } = loadFlexibleFormHelpers(fields);

  renderFlexibleStopEditors([{ id: "temple", name: "清水寺", intro: "可看本堂舞台" }]);
  assert.match(flexibleStopList.innerHTML, /清水寺/, "編輯器應呈現景點名稱");
  assert.match(flexibleStopList.innerHTML, /可看本堂舞台/, "編輯器應呈現景點介紹");
  assert.match(flexibleStopList.innerHTML, /導航地點/, "每個景點應能設定獨立導航地點");
  assert.match(flexibleStopList.innerHTML, /type="file"[^>]*accept="image\/\*"/, "每個景點應能獨立上傳照片");
  assert.deepEqual(collectFlexibleStops(), [{
    id: "temple",
    name: "清水寺",
    intro: "可看本堂舞台",
    location: "京都府清水寺",
    photo: { id: "photo-1", dataUrl: "data:image/jpeg;base64,abc" }
  }], "儲存時應濾除空白景點，保留介紹、導航地點與該景點照片");

  syncFlexibleExplorationFields();
  assert.equal(fields.flexibleExplorationFields.hidden, false);
  assert.equal(fields.timeHourInput.required, true, "彈性探索仍必須填寫區段開始時間");
  assert.equal(fields.timeMinuteInput.required, true, "彈性探索仍必須填寫區段開始分鐘");
  assert.equal(fields.flexibleEndHourInput.required, true);
  assert.equal(fields.flexibleEndMinuteInput.required, true);
  assert.equal(fields.placeInputLabel.textContent, "區段名稱");
  assert.equal(fields.attractionFields.hidden, true, "彈性探索不應顯示一般景點介紹欄位");
  assert.equal(fields.flightFields.hidden, true, "彈性探索不應顯示飛機欄位");
  assert.equal(fields.transportFields.hidden, true, "彈性探索不應顯示交通欄位");
  assert.equal(photoLabel.hidden, true, "彈性探索不應顯示附件欄位");
});

function loadFlexibleTimelineHelpers() {
  const sources = ["formatFlexibleExploreTimeRange", "getFlexibleStopMapQuery", "renderFlexibleStopQuickList", "renderFlexibleExplorationDetails"]
    .map(functionSource)
    .join("\n");
  return new Function("escapeHtml", "googleMapsUrl", "getAttachmentSource", `${sources}\nreturn { formatFlexibleExploreTimeRange, getFlexibleStopMapQuery, renderFlexibleStopQuickList, renderFlexibleExplorationDetails };`)(
    (value) => String(value),
    (value) => `https://maps.test/?query=${encodeURIComponent(value)}`,
    (attachment) => attachment?.dataUrl || attachment?.publicUrl || ""
  );
}

test("彈性探索每個景點的照片與導航都獨立，不得使用區段標題", () => {
  const { formatFlexibleExploreTimeRange, getFlexibleStopMapQuery, renderFlexibleStopQuickList, renderFlexibleExplorationDetails } = loadFlexibleTimelineHelpers();
  const item = {
    type: "彈性探索",
    title: "東山半日散步",
    place: "東山半日散步",
    time: "14:00",
    endTime: "17:30",
    flexibleStops: [
      {
        id: "temple",
        name: "清水寺",
        intro: "看本堂舞台與音羽瀑布",
        location: "京都府京都市東山區清水1丁目294",
        photo: { id: "photo-1", name: "清水寺.jpg", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,abc" }
      },
      { id: "slope", name: "二年坂", intro: "逛老街小店", location: "", photo: null }
    ]
  };

  assert.equal(formatFlexibleExploreTimeRange(item), "14:00–17:30", "收合卡只應顯示區段起訖時間");
  assert.equal(getFlexibleStopMapQuery(item.flexibleStops[0]), "京都府京都市東山區清水1丁目294");
  assert.equal(getFlexibleStopMapQuery(item.flexibleStops[1]), "二年坂", "導航地點留白時應使用該景點名稱");
  const quickList = renderFlexibleStopQuickList(item);
  const details = renderFlexibleExplorationDetails(item);
  assert.match(quickList, /data-open-attachment="flexible-stop"/);
  assert.doesNotMatch(quickList, /data-flexible-stop-map/, "收合清單只用來快速查看景點，不應重複顯示導航按鈕");
  assert.match(details, /清水寺/);
  assert.match(details, /看本堂舞台與音羽瀑布/);
  assert.match(details, /二年坂/);
  assert.match(details, /逛老街小店/);
  assert.match(details, /data-open-attachment="flexible-stop"/);
  assert.match(details, /data-flexible-stop-map/, "展開後的景點介紹卡必須保留各自的導航按鈕");
  assert.match(details, />導航<\/a>/);
  assert.doesNotMatch(`${quickList}${details}`, /query=%E6%9D%B1%E5%B1%B1%E5%8D%8A%E6%97%A5%E6%95%A3%E6%AD%A5/, "任何景點導航都不能使用區段標題");
  assert.doesNotMatch(details, /checkbox|type="time"|14:00|17:30/i, "景點明細不應有勾選或個別時間欄位");
});

test("彈性探索版本會由新版 PWA 預快取提供", () => {
  const appVersion = htmlSource.match(/<script src="\.\/app\.js\?v=(\d+)"/)?.[1];
  const styleVersion = htmlSource.match(/<link rel="stylesheet" href="\.\/styles\.css\?v=(\d+)"/)?.[1];
  const cacheVersion = serviceWorkerSource.match(/const CACHE_NAME = "trip-notebook-v(\d+)"/)?.[1];

  assert.equal(cacheVersion, "166", "景點照片與導航上線時必須建立 v166 PWA 快取");
  assert.equal(appVersion, "166");
  assert.equal(styleVersion, "166");
  assert.match(serviceWorkerSource, new RegExp(`"\\.\/app\\.js\\?v=${appVersion}"`));
  assert.match(serviceWorkerSource, new RegExp(`"\\.\/styles\\.css\\?v=${styleVersion}"`));
});

test("彈性探索結束時間會初始化完整的小時與分鐘選單", () => {
  const inputNames = [
    "timeHourInput", "timeMinuteInput",
    "departureHourInput", "departureMinuteInput",
    "arrivalHourInput", "arrivalMinuteInput",
    "bookingHourInput", "bookingMinuteInput",
    "bookingCheckoutHourInput", "bookingCheckoutMinuteInput",
    "bookingArrivalHourInput", "bookingArrivalMinuteInput",
    "todoHourInput", "todoMinuteInput",
    "flexibleEndHourInput", "flexibleEndMinuteInput"
  ];
  const inputs = Object.fromEntries(inputNames.map((name) => [name, { name }]));
  const calls = [];
  const populateTimeOptions = new Function(
    "populateTimeSelectPair",
    ...inputNames,
    `${functionSource("populateTimeOptions")}\nreturn populateTimeOptions;`
  )(
    (hourSelect, minuteSelect) => calls.push([hourSelect, minuteSelect]),
    ...inputNames.map((name) => inputs[name])
  );

  populateTimeOptions();
  assert.ok(
    calls.some(([hourSelect, minuteSelect]) => hourSelect === inputs.flexibleEndHourInput && minuteSelect === inputs.flexibleEndMinuteInput),
    "彈性探索的結束時間必須交給既有時分選單初始化"
  );
});
