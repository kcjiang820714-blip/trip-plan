import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JMA_MUNICIPALITY_AREAS } from "../jma-municipality-areas.js";

import {
  JMA_FORECAST_AREAS,
  JMA_CLASS10_FORECAST_AREAS,
  JMA_OFFICE_FORECAST_AREAS,
  buildJmaForecastUrl,
  isJapanLocation,
  mapJmaWeatherToWmo,
  parseJmaForecast,
  resolveJmaForecastArea,
} from "../jma-weather.js";

const prefecturalCapitals = [
  ["Sapporo", "016000"], ["Aomori", "020000"], ["Morioka", "030000"], ["Sendai", "040000"], ["Akita", "050000"], ["Yamagata", "060000"], ["Fukushima", "070000"], ["Mito", "080000"], ["Utsunomiya", "090000"], ["Maebashi", "100000"], ["Saitama", "110000"], ["Chiba", "120000"], ["Tokyo", "130000"], ["Yokohama", "140000"], ["Niigata", "150000"], ["Toyama", "160000"], ["Kanazawa", "170000"], ["Fukui", "180000"], ["Kofu", "190000"], ["Nagano", "200000"], ["Gifu", "210000"], ["Shizuoka", "220000"], ["Nagoya", "230000"], ["Tsu", "240000"], ["Otsu", "250000"], ["Kyoto", "260000"], ["Osaka", "270000"], ["Kobe", "280000"], ["Nara", "290000"], ["Wakayama", "300000"], ["Tottori", "310000"], ["Matsue", "320000"], ["Okayama", "330000"], ["Hiroshima", "340000"], ["Yamaguchi", "350000"], ["Tokushima", "360000"], ["Takamatsu", "370000"], ["Matsuyama", "380000"], ["Kochi", "390000"], ["Fukuoka", "400000"], ["Saga", "410000"], ["Nagasaki", "420000"], ["Kumamoto", "430000"], ["Oita", "440000"], ["Miyazaki", "450000"], ["Kagoshima", "460100"], ["Naha", "471000"],
];

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

test("東京、大阪、福岡以精確城市或座標唯一對應官方預報區", () => {
  assert.deepEqual(resolveJmaForecastArea({ countryCode: "JP", name: "Tokyo" }), {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", prefecture: "東京",
  });
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "Osaka" }).forecastAreaCode, "270000");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", latitude: 33.5904, longitude: 130.4017 }).forecastAreaCode, "400000");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "東京大阪" }), null);
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", latitude: 0, longitude: 0 }), null);
});

test("官方市町村資料讓新地點不帶 jmaAreaCode 仍能唯一對應 class10", () => {
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "Asahikawa" })?.areaCode, "012010");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "Niseko" })?.areaCode, "016030");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "宮古島市" })?.areaCode, "473000");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "Nishihara" }), null);
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: "不存在的城市", latitude: 35.0, longitude: 135.0 }), null);
});

test("完整市町村名稱優先於短別名，且 1805 筆官方名稱不會解析到錯誤 class10", () => {
  const cases = [["Fukushima Town", "017010"], ["Fukushima City", "070010"], ["Asahikawa City", "012010"], ["Niseko Town", "016030"], ["Amami City", "460040"], ["Yonaguni Town", "474020"], ["Naha City", "471010"], ["Yakushima Town", "460030"]];
  for (const [name, areaCode] of cases) assert.equal(resolveJmaForecastArea({ countryCode: "JP", name })?.areaCode, areaCode, name);
  for (const [japaneseName, englishName, areaCode] of JMA_MUNICIPALITY_AREAS) {
    for (const name of [japaneseName, englishName]) {
      const resolved = resolveJmaForecastArea({ countryCode: "JP", name });
      assert.ok(!resolved || resolved.areaCode === areaCode, `${name}: ${resolved?.areaCode}`);
    }
  }
});

test("完整官方端點表涵蓋 47 都道府縣及所有 JMA 預報拆分區", () => {
  assert.equal(prefecturalCapitals.length, 47);
  for (const [city, forecastAreaCode] of prefecturalCapitals) {
    assert.equal(resolveJmaForecastArea({ countryCode: "JP", name: city })?.forecastAreaCode, forecastAreaCode, city);
  }
  assert.equal(Object.keys(JMA_OFFICE_FORECAST_AREAS).length, 56);
  assert.deepEqual(JMA_OFFICE_FORECAST_AREAS["130000"], ["130010", "130020", "130030", "130040"]);
  assert.deepEqual(JMA_OFFICE_FORECAST_AREAS["400000"], ["400010", "400020", "400030", "400040"]);
  assert.deepEqual(JMA_OFFICE_FORECAST_AREAS["474000"], ["474010", "474020"]);
  assert.ok(JMA_FORECAST_AREAS.length >= 51);
});

test("實際 forecast endpoint 將十勝與奄美併入可用 URL，且 142 個 class10 都可用保存區碼精確解析", () => {
  assert.deepEqual(JMA_OFFICE_FORECAST_AREAS["014100"], ["014010", "014020", "014030"]);
  assert.deepEqual(JMA_OFFICE_FORECAST_AREAS["460100"], ["460010", "460020", "460030", "460040"]);
  assert.equal(buildJmaForecastUrl("014030"), null);
  assert.equal(buildJmaForecastUrl("460040"), null);
  assert.equal(buildJmaForecastUrl("014100"), "https://www.jma.go.jp/bosai/forecast/data/forecast/014100.json");
  assert.equal(buildJmaForecastUrl("460100"), "https://www.jma.go.jp/bosai/forecast/data/forecast/460100.json");
  assert.equal(JMA_CLASS10_FORECAST_AREAS.length, 142);
  for (const area of JMA_CLASS10_FORECAST_AREAS) {
    assert.deepEqual(resolveJmaForecastArea({ countryCode: "JP", jmaAreaCode: area.areaCode }), area);
    assert.ok(buildJmaForecastUrl(area.forecastAreaCode));
  }
});

test("儲存的官方區碼追溯 fixture 與分區表一致", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/jma-official-area-source-2026-07-27.json", import.meta.url), "utf8"));
  assert.equal(fixture.sourceUrl, "https://www.jma.go.jp/bosai/common/const/area.json");
  assert.match(fixture.retrievedAt, /^2026-07-27T/);
  assert.equal(fixture.forecastEndpointCount, Object.keys(JMA_OFFICE_FORECAST_AREAS).length);
  assert.equal(fixture.class20MunicipalityCount, JMA_MUNICIPALITY_AREAS.length);
  for (const [officeCode, areaCodes] of Object.entries(fixture.officeSamples)) {
    assert.deepEqual(JMA_OFFICE_FORECAST_AREAS[officeCode], areaCodes);
  }
});

test("精簡官方行政區階層保留 142/375/1805 筆完整性", async () => {
  const hierarchy = JSON.parse(await readFile(new URL("./fixtures/jma-area-hierarchy-2026-07-27.json", import.meta.url), "utf8"));
  assert.equal(hierarchy.sourceUrl, "https://www.jma.go.jp/bosai/common/const/area.json");
  assert.equal(Object.keys(hierarchy.class10s).length, 142);
  assert.equal(Object.keys(hierarchy.class15s).length, 375);
  assert.equal(Object.keys(hierarchy.class20s).length, 1805);
});

test("廣域行政區不能覆蓋函館、小笠原、北九州與舞鶴的精確座標", () => {
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", admin1: "Hokkaido", latitude: 41.7687, longitude: 140.7291 })?.areaCode, "017010");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", admin1: "Tokyo", latitude: 27.0944, longitude: 142.1917 })?.areaCode, "130040");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", admin1: "Fukuoka", latitude: 33.8834, longitude: 130.8752 })?.areaCode, "400020");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", admin1: "Kyoto", latitude: 35.4748, longitude: 135.3859 })?.areaCode, "260020");
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", admin1: "Tokyo" }), null);
  assert.equal(resolveJmaForecastArea({ countryCode: "JP", group: "北海道" }), null);
});

test("官方拆分區的座標範圍互不重疊，邊界外不猜測", () => {
  for (let index = 0; index < JMA_FORECAST_AREAS.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < JMA_FORECAST_AREAS.length; compareIndex += 1) {
      const left = JMA_FORECAST_AREAS[index].bounds;
      const right = JMA_FORECAST_AREAS[compareIndex].bounds;
      assert.ok(left.maxLat < right.minLat || right.maxLat < left.minLat || left.maxLon < right.minLon || right.maxLon < left.minLon);
    }
  }
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
  assert.equal(parseJmaForecast(tokyoPayload, { forecastAreaCode: "400000", areaCode: "130010", temperatureAreaCode: "44132" }), null);
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
