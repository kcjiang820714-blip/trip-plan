// JMA forecast JSON reference: https://www.data.jma.go.jp/developer/weatherdataguide/appendix/2-1-c.html
// Each entry keeps the endpoint code separate from its forecast-area and temperature-area codes.
export const JMA_FORECAST_AREAS = [
  {
    forecastAreaCode: "130000", areaCode: "130010", temperatureAreaCode: "44132", prefecture: "東京都",
    aliases: ["東京", "Tokyo", "東京都"], admin1Aliases: ["Tokyo", "東京都"],
    bounds: { minLat: 35.4, maxLat: 35.9, minLon: 138.9, maxLon: 139.95 },
  },
  {
    forecastAreaCode: "270000", areaCode: "270000", temperatureAreaCode: "62078", prefecture: "大阪府",
    aliases: ["大阪", "Osaka", "大阪府"], admin1Aliases: ["Osaka", "大阪府"],
    bounds: { minLat: 34.45, maxLat: 34.82, minLon: 135.28, maxLon: 135.7 },
  },
  {
    forecastAreaCode: "400000", areaCode: "400010", temperatureAreaCode: "82182", prefecture: "福岡県",
    aliases: ["福岡", "Fukuoka", "福岡県"], admin1Aliases: ["Fukuoka", "福岡県"],
    bounds: { minLat: 33.4, maxLat: 33.75, minLon: 130.1, maxLon: 130.7 },
  },
  {
    forecastAreaCode: "260000", areaCode: "260010", temperatureAreaCode: "61286", prefecture: "京都府",
    aliases: ["京都", "Kyoto", "京都府"], admin1Aliases: ["Kyoto", "京都府"],
    bounds: { minLat: 34.85, maxLat: 35.2, minLon: 135.55, maxLon: 136.0 },
  },
  {
    forecastAreaCode: "016000", areaCode: "016010", temperatureAreaCode: "14163", prefecture: "北海道",
    aliases: ["札幌", "Sapporo", "北海道"], admin1Aliases: ["Hokkaido", "北海道"],
    bounds: { minLat: 42.85, maxLat: 43.25, minLon: 141.05, maxLon: 141.65 },
  },
];

const JMA_FORECAST_BASE_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast";
const WMO_SEVERITY = [95, 73, 63, 45, 3, 0];

export function isJapanLocation(location) {
  return String(location?.countryCode || location?.country_code || "").trim().toUpperCase() === "JP";
}

export function resolveJmaForecastArea(location) {
  if (!isJapanLocation(location)) return null;
  const savedCode = String(location?.jmaForecastAreaCode || "").trim();
  if (savedCode) {
    const saved = JMA_FORECAST_AREAS.filter((area) => area.forecastAreaCode === savedCode);
    if (saved.length === 1) return publicArea(saved[0]);
  }

  const candidates = new Set([location?.admin1, location?.country, location?.group, location?.name]
    .flatMap(normalizeLocationText));
  const textualMatches = JMA_FORECAST_AREAS.filter((area) =>
    [...area.aliases, ...area.admin1Aliases].some((alias) => candidates.has(normalizeText(alias))),
  );
  if (textualMatches.length === 1) return publicArea(textualMatches[0]);
  if (textualMatches.length > 1) return null;

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const coordinateMatches = JMA_FORECAST_AREAS.filter(({ bounds }) =>
    latitude >= bounds.minLat && latitude <= bounds.maxLat && longitude >= bounds.minLon && longitude <= bounds.maxLon,
  );
  return coordinateMatches.length === 1 ? publicArea(coordinateMatches[0]) : null;
}

export function buildJmaForecastUrl(forecastAreaCode) {
  const code = String(forecastAreaCode || "").trim();
  return JMA_FORECAST_AREAS.some((area) => area.forecastAreaCode === code)
    ? `${JMA_FORECAST_BASE_URL}/${code}.json`
    : null;
}

export function mapJmaWeatherToWmo(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (/[雷]/u.test(text)) return 95;
  if (/[雪]/u.test(text)) return 73;
  if (/[雨]/u.test(text)) return 63;
  if (/[霧]/u.test(text)) return 45;
  if (/(くもり|曇)/u.test(text)) return 3;
  if (/[晴]/u.test(text)) return 0;
  const numeric = Number(text);
  if (!Number.isInteger(numeric)) return null;
  if (numeric >= 300 && numeric < 400) return 63;
  if (numeric >= 400 && numeric < 500) return 73;
  if (numeric >= 200 && numeric < 300) return 3;
  if (numeric >= 100 && numeric < 200) return 0;
  return null;
}

export function parseJmaForecast(payload, { forecastAreaCode, areaCode = forecastAreaCode, temperatureAreaCode = "", targetTimezone = "Asia/Tokyo", targetDate = "" } = {}) {
  try {
    if (!Array.isArray(payload) || !/^\d{6}$/.test(String(forecastAreaCode || "")) || !String(areaCode || "")) return null;
    const timeSeries = payload[0]?.timeSeries;
    if (!Array.isArray(timeSeries)) return null;

    const weatherSeries = findSeries(timeSeries, areaCode, "weatherCodes");
    const popSeries = findSeries(timeSeries, areaCode, "pops");
    const temperatureSeries = findTemperatureSeries(timeSeries, temperatureAreaCode || areaCode);
    if (!weatherSeries || !popSeries || !temperatureSeries) return null;

    const weatherDates = checkedDates(weatherSeries.timeDefines, targetTimezone);
    const popDates = checkedDates(popSeries.timeDefines, targetTimezone);
    const temperatureDates = checkedDates(temperatureSeries.timeDefines, targetTimezone);
    if (!weatherDates || !popDates || !temperatureDates || !sameLength(weatherSeries.area.weatherCodes, weatherDates) || !sameLength(popSeries.area.pops, popDates)) return null;

    const temperatures = temperatureValues(temperatureSeries.area, temperatureDates);
    if (!temperatures) return null;
    const dates = [...new Set(weatherDates)];
    if (dates.length === 0 || (targetDate && !dates.includes(targetDate))) return null;

    const daily = dates.map((date) => ({
      date,
      weatherCode: strongestWeather(weatherSeries.area.weatherCodes
        .map((code, index) => weatherDates[index] === date ? mapJmaWeatherToWmo(weatherSeries.area.weathers?.[index] || code) : null)),
      precipitation: maximumNumber(popSeries.area.pops
        .filter((value, index) => popDates[index] === date).map(toNumberOrNull)),
      temperatures: temperatures.filter((entry) => entry.date === date).map((entry) => entry.value),
    }));

    return {
      daily: {
        time: daily.map((entry) => entry.date),
        weather_code: daily.map((entry) => entry.weatherCode),
        temperature_2m_max: daily.map((entry) => maximumNumber(entry.temperatures)),
        temperature_2m_min: daily.map((entry) => minimumNumber(entry.temperatures)),
        precipitation_probability_max: daily.map((entry) => entry.precipitation),
        wind_speed_10m_max: daily.map(() => null),
      },
      hourly: { time: [] },
    };
  } catch {
    return null;
  }
}

function publicArea({ forecastAreaCode, areaCode, temperatureAreaCode, prefecture }) {
  return { forecastAreaCode, areaCode, temperatureAreaCode, prefecture };
}

function normalizeLocationText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return [normalized, ...String(value).split(/[\s,，]+/u).map(normalizeText).filter(Boolean)];
}

function normalizeText(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

function findSeries(timeSeries, areaCode, field) {
  for (const series of timeSeries) {
    if (!Array.isArray(series?.timeDefines) || !Array.isArray(series?.areas)) continue;
    const matches = series.areas.filter((area) => area?.area?.code === areaCode && Array.isArray(area[field]));
    if (matches.length === 1) return { ...series, area: matches[0] };
  }
  return null;
}

function findTemperatureSeries(timeSeries, temperatureAreaCode) {
  for (const series of timeSeries) {
    if (!Array.isArray(series?.timeDefines) || !Array.isArray(series?.areas)) continue;
    const matches = series.areas.filter((area) => area?.area?.code === temperatureAreaCode && (Array.isArray(area.temps) || Array.isArray(area.tempsMin) || Array.isArray(area.tempsMax)));
    if (matches.length === 1) return { ...series, area: matches[0] };
  }
  return null;
}

function checkedDates(timeDefines, targetTimezone) {
  if (!Array.isArray(timeDefines) || timeDefines.length === 0) return null;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: targetTimezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dates = timeDefines.map((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = Object.fromEntries(formatter.formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  });
  return dates.every(Boolean) ? dates : null;
}

function temperatureValues(area, dates) {
  const values = [];
  for (const field of ["temps", "tempsMin", "tempsMax"]) {
    if (!Array.isArray(area[field])) continue;
    if (!sameLength(area[field], dates)) return null;
    area[field].forEach((value, index) => values.push({ date: dates[index], value: toNumberOrNull(value) }));
  }
  return values.length ? values : null;
}

function sameLength(values, dates) {
  return Array.isArray(values) && values.length === dates.length;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "--") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function maximumNumber(values) {
  const numbers = values.filter((value) => value !== null);
  return numbers.length ? Math.max(...numbers) : null;
}

function minimumNumber(values) {
  const numbers = values.filter((value) => value !== null);
  return numbers.length ? Math.min(...numbers) : null;
}

function strongestWeather(codes) {
  return WMO_SEVERITY.find((code) => codes.includes(code)) ?? null;
}
