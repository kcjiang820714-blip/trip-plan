import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

class FakeSelect {
  constructor() {
    this.options = [];
    this.value = "";
  }

  set innerHTML(value) {
    const placeholder = value.match(/<option value="">([^<]+)<\/option>/)?.[1] || "";
    this.options = [{ value: "", textContent: placeholder }];
    this.value = "";
    this.placeholder = placeholder;
  }

  append(option) {
    this.options.push(option);
  }

  addEventListener(type, listener) {
    this.listeners ??= new Map();
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }

  dispatchChange() {
    for (const listener of this.listeners?.get("change") || []) listener({ target: this });
  }
}

function loadTimeSelectHelpers() {
  const start = appSource.indexOf("function populateTimeSelectPair");
  const end = appSource.indexOf("\nfunction openTripDialog", start);
  const helperSource = appSource.slice(start, end);
  return new Function(
    "document",
    `${helperSource}; return { populateTimeSelectPair, setTimeSelectPair, syncHiddenTimeInput };`
  )({
    createElement: () => ({ value: "", textContent: "" })
  });
}

function registerTimeInputListeners(inputs) {
  const start = appSource.indexOf("[\n  [departureTimeInput, departureHourInput, departureMinuteInput]");
  const end = appSource.indexOf("\ntransportModeInput.addEventListener", start);
  const listenerSource = appSource.slice(start, end);
  return new Function("syncHiddenTimeInput", ...Object.keys(inputs), listenerSource)(
    loadTimeSelectHelpers().syncHiddenTimeInput,
    ...Object.values(inputs)
  );
}

test("交通預訂抵達時分選單可實際選擇、同步 hidden 值並回填舊時間", () => {
  const { populateTimeSelectPair, setTimeSelectPair, syncHiddenTimeInput } = loadTimeSelectHelpers();
  const hourSelect = new FakeSelect();
  const minuteSelect = new FakeSelect();
  const hiddenInput = { value: "" };

  populateTimeSelectPair(hourSelect, minuteSelect);
  assert.equal(hourSelect.options.length, 25, "小時選單應含提示與 00 到 23 共 25 個選項");
  assert.equal(minuteSelect.options.length, 61, "分鐘選單應含提示與 00 到 59 共 61 個選項");
  assert.equal(hourSelect.options[0].value, "", "第一個小時選項應為提示");
  assert.equal(hourSelect.options[1].value, "00");
  assert.equal(hourSelect.options.at(-1).value, "23");
  assert.equal(minuteSelect.options[0].value, "", "第一個分鐘選項應為提示");
  assert.equal(minuteSelect.options[1].value, "00");
  assert.equal(minuteSelect.options.at(-1).value, "59");

  setTimeSelectPair(hourSelect, minuteSelect, "18:42");
  assert.equal(hourSelect.value, "18", "編輯舊預訂時應回填小時");
  assert.equal(minuteSelect.value, "42", "編輯舊預訂時應回填分鐘");
});

test("交通預訂抵達時分選單透過真實 change 事件同步 hidden 時間", () => {
  const inputs = Object.fromEntries(
    [
      "departureTimeInput", "departureHourInput", "departureMinuteInput",
      "arrivalTimeInput", "arrivalHourInput", "arrivalMinuteInput",
      "bookingTimeInput", "bookingHourInput", "bookingMinuteInput",
      "bookingCheckoutTimeInput", "bookingCheckoutHourInput", "bookingCheckoutMinuteInput",
      "bookingArrivalTimeInput", "bookingArrivalHourInput", "bookingArrivalMinuteInput",
      "todoTimeInput", "todoHourInput", "todoMinuteInput"
    ].map((name) => [name, new FakeSelect()])
  );

  registerTimeInputListeners(inputs);
  const hour = inputs.bookingArrivalHourInput;
  const minute = inputs.bookingArrivalMinuteInput;
  const hidden = inputs.bookingArrivalTimeInput;
  assert.equal(hour.listeners?.get("change")?.length, 1, "抵達小時應註冊 change 監聽器");
  assert.equal(minute.listeners?.get("change")?.length, 1, "抵達分鐘應註冊 change 監聽器");

  hour.value = "09";
  hour.dispatchChange();
  assert.equal(hidden.value, "", "只選小時時不應產生不完整時間");
  minute.value = "35";
  minute.dispatchChange();
  assert.equal(hidden.value, "09:35", "依序觸發時與分的 change 後應同步 HH:MM");
});

test("PWA 預快取必須使用網頁目前載入的 app 與樣式版本", () => {
  const appVersion = htmlSource.match(/<script src="\.\/app\.js\?v=(\d+)"/)?.[1];
  const styleVersion = htmlSource.match(/<link rel="stylesheet" href="\.\/styles\.css\?v=(\d+)"/)?.[1];
  const cacheVersion = serviceWorkerSource.match(/const CACHE_NAME = "trip-notebook-v(\d+)"/)?.[1];

  assert.ok(appVersion && styleVersion && cacheVersion, "應能讀取目前頁面與快取的版本號");
  assert.match(serviceWorkerSource, new RegExp(`"\\.\/app\\.js\\?v=${appVersion}"`), "預快取的 app.js 必須與網頁一致");
  assert.match(serviceWorkerSource, new RegExp(`"\\.\/styles\\.css\\?v=${styleVersion}"`), "預快取的 styles.css 必須與網頁一致");
  assert.ok(Number(cacheVersion) > 128, "修正後必須更新快取名稱，已安裝 App 才會捨棄舊檔案");
  assert.match(
    serviceWorkerSource,
    /keys\.filter\(\(key\) => key\.startsWith\("trip-notebook-"\) && key !== CACHE_NAME\)/,
    "啟用新版快取時只能刪除本 App 的舊快取，不能刪同網域其他快取"
  );
});

test("新版樣式會同時更新 CSS query 與 service worker 快取世代", () => {
  const styleVersion = htmlSource.match(/<link rel="stylesheet" href="\.\/styles\.css\?v=(\d+)"/)?.[1];
  const cacheVersion = serviceWorkerSource.match(/const CACHE_NAME = "trip-notebook-v(\d+)"/)?.[1];

  assert.ok(styleVersion && cacheVersion, "應能讀取樣式與快取版本號");
  assert.ok(Number(styleVersion) > 115, "新版 CSS 必須使用比 v115 更高的 query 版本");
  assert.ok(Number(cacheVersion) > 142, "新版 CSS 必須建立比 v142 更新的 service worker 快取");
  assert.match(serviceWorkerSource, new RegExp(`"\\.\\/styles\\.css\\?v=${styleVersion}"`), "網頁與預快取必須指向同一個新版 CSS");
});
