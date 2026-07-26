import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJmaForecastUrl,
  isJapanLocation,
  mapJmaWeatherToWmo,
  parseJmaForecast,
  resolveJmaForecastArea,
} from "../jma-weather.js";

const tokyoPayload = [{
  publishingOffice: "気象庁",
  timeSeries: [
    {
      timeDefines: ["2026-07-26T17:00:00+09:00", "2026-07-27T00:00:00+09:00"],
      areas: [{
        area: { name: "東京地方", code: "130010" },
        weatherCodes: ["203", "200"],
        weathers: ["くもり 夜のはじめ頃 雨 所により 雷を伴う", "くもり"],
      }],
    },
    {
      timeDefines: ["2026-07-26T18:00:00+09:00", "2026-07-27T06:00:00+09:00"],
      areas: [{ area: { name: "東京地方", code: "130010" }, pops: ["40", "70"] }],
    },
    {
      timeDefines: ["2026-07-26T18:00:00+09:00", "2026-07-27T09:00:00+09:00"],
      areas: [{ area: { name: "東京", code: "44132" }, temps: ["25", "31"] }],
    },
  ],
}];

test("只以明確 JP 國碼判定日本地點", () => {
  assert.equal(isJapanLocation({ countryCode: "JP" }), true);
  assert.equal(isJapanLocation({ countryCode: " jp " }), true);
  assert.equal(isJapanLocation({ countryCode: "TW", group: "日本" }), false);
  assert.equal(isJapanLocation({ group: "日本" }), false);
});

test("東京、大阪、福岡以行政區或座標唯一對應官方預報區", () => {
  assert.deepEqual(resolveJmaForecastArea({ countryCode: "JP", admin1: "Tokyo" }), {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", prefecture: "東京都",
  });
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "Osaka" }).forecastAreaCode, "270000");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", latitude: 33.5904, longitude: 130.4017 }).forecastAreaCode, "400000");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "東京大阪" }), null);
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", latitude: 0, longitude: 0 }), null);
});

test("建立的 URL 只使用六碼官方預報區碼", () => {
  assert.equal(buildJmaForecastUrl("130000"), "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json");
  assert.equal(buildJmaForecastUrl("130010"), null);
  assert.equal(buildJmaForecastUrl("130000?x=1"), null);
});

test("官方形狀 JSON 依 JST 產出每日天氣、高低溫與最大降雨機率", () => {
  assert.deepEqual(parseJmaForecast(tokyoPayload, {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", targetTimezone: "Asia/Tokyo",
  }), {
    daily: {
      time: ["2026-07-26", "2026-07-27"],
      weather_code: [95, 3],
      temperature_2m_max: [25, 31],
      temperature_2m_min: [25, 31],
      precipitation_probability_max: [40, 70],
      wind_speed_10m_max: [null, null],
    },
    hourly: { time: [] },
  });
});

test("JMA 天氣文字按雷雨、雪、雨、霧、多雲、晴映射，未知值不猜測", () => {
  assert.equal(mapJmaWeatherToWmo("晴れ 時々 くもり"), 3);
  assert.equal(mapJmaWeatherToWmo("雨 所により 雷を伴う"), 95);
  assert.equal(mapJmaWeatherToWmo("雪"), 73);
  assert.equal(mapJmaWeatherToWmo("霧"), 45);
  assert.equal(mapJmaWeatherToWmo("無効"), null);
});

test("缺欄位、區碼不符、序列長度不一致與無目標日期均安全回傳 null", () => {
  assert.equal(parseJmaForecast({}, { forecastAreaCode: "130000", areaCode: "130010" }), null);
  assert.equal(parseJmaForecast(tokyoPayload, { forecastAreaCode: "130000", areaCode: "999999" }), null);
  const badLengths = structuredClone(tokyoPayload);
  badLengths[0].timeSeries[1].areas[0].pops = ["40"];
  assert.equal(parseJmaForecast(badLengths, { forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132" }), null);
  assert.equal(parseJmaForecast(tokyoPayload, {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", targetDate: "2026-08-01",
  }), null);
});

test("帶時區的 JMA 時間在不同裝置時區仍以 JST 分日", () => {
  const output = parseJmaForecast(tokyoPayload, {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", targetTimezone: "Asia/Tokyo",
  });
  assert.deepEqual(output.daily.time, ["2026-07-26", "2026-07-27"]);
});
