import assert from "node:assert/strict";
import test from "node:test";

import { fetchWeatherForecast } from "../weather-provider.js";

const tokyoLocation = { id: "tokyo", countryCode: "JP", name: "Tokyo", admin1: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 };
const parisLocation = { id: "paris", countryCode: "FR", name: "Paris", latitude: 48.8566, longitude: 2.3522 };

const jmaPayload = [{ timeSeries: [
  { timeDefines: ["2026-07-27T00:00:00+09:00"], areas: [{ area: { code: "130010" }, weatherCodes: ["100"], weathers: ["晴れ"] }] },
  { timeDefines: ["2026-07-27T00:00:00+09:00"], areas: [{ area: { code: "130010" }, pops: ["10"] }] },
  { timeDefines: ["2026-07-27T00:00:00+09:00"], areas: [{ area: { code: "44132" }, temps: ["30"] }] },
] }];
const openMeteoPayload = { daily: { time: ["2026-07-27"] }, hourly: { time: [] } };

function ok(json) {
  return { ok: true, json: async () => json };
}

test("日本地點優先抓 JMA，成功後標示日本氣象廳", async () => {
  const urls = [];
  const forecast = await fetchWeatherForecast(tokyoLocation, { fetchImpl: async (url) => { urls.push(url); return ok(jmaPayload); } });
  assert.match(urls[0], /jma\.go\.jp\/bosai\/forecast\/data\/forecast\/130000\.json$/);
  assert.equal(urls.length, 1);
  assert.equal(forecast.source, "日本氣象廳");
  assert.deepEqual(forecast.daily.time, ["2026-07-27"]);
});

test("JMA HTTP 或解析失敗時只讓該日本地點回退 Open-Meteo", async () => {
  const urls = [];
  const forecast = await fetchWeatherForecast(tokyoLocation, { fetchImpl: async (url) => {
    urls.push(url);
    return url.includes("jma.go.jp") ? { ok: false, status: 503 } : ok(openMeteoPayload);
  } });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /api\.open-meteo\.com/);
  assert.equal(forecast.source, "Open-Meteo（日本氣象廳備援失敗）");
  assert.deepEqual(forecast.daily, openMeteoPayload.daily);
});

test("JMA 對應或解析失敗時也只讓該日本地點回退 Open-Meteo", async () => {
  const unresolved = { ...tokyoLocation, name: "Unknown Japan Place", admin1: "Tokyo" };
  const unresolvedForecast = await fetchWeatherForecast(unresolved, { fetchImpl: async (url) => {
    assert.match(url, /api\.open-meteo\.com/);
    return ok(openMeteoPayload);
  } });
  assert.equal(unresolvedForecast.source, "Open-Meteo（日本氣象廳備援失敗）");

  const urls = [];
  const unparsableForecast = await fetchWeatherForecast(tokyoLocation, { fetchImpl: async (url) => {
    urls.push(url);
    return url.includes("jma.go.jp") ? ok({}) : ok(openMeteoPayload);
  } });
  assert.equal(urls.length, 2);
  assert.equal(unparsableForecast.source, "Open-Meteo（日本氣象廳備援失敗）");
});

test("非日本地點維持既有 Open-Meteo 請求與來源", async () => {
  const urls = [];
  const forecast = await fetchWeatherForecast(parisLocation, { fetchImpl: async (url) => { urls.push(url); return ok(openMeteoPayload); } });
  assert.equal(urls.length, 1);
  assert.match(urls[0], /api\.open-meteo\.com/);
  assert.equal(forecast.source, "Open-Meteo");
});
