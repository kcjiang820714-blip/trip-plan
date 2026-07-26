// Official source, retrieved 2026-07-27: https://www.jma.go.jp/bosai/common/const/area.json
// Values are endpoint codes mapped to the official forecast-area (class10) codes.
export const JMA_OFFICE_FORECAST_AREAS = {
  "011000": ["011000"], "012000": ["012010", "012020"], "013000": ["013010", "013020", "013030"], "014030": ["014030"], "014100": ["014010", "014020"], "015000": ["015010", "015020"], "016000": ["016010", "016020", "016030"], "017000": ["017010", "017020"],
  "020000": ["020010", "020020", "020030"], "030000": ["030010", "030020", "030030"], "040000": ["040010", "040020"], "050000": ["050010", "050020"], "060000": ["060010", "060020", "060030", "060040"], "070000": ["070010", "070020", "070030"],
  "080000": ["080010", "080020"], "090000": ["090010", "090020"], "100000": ["100010", "100020"], "110000": ["110010", "110020", "110030"], "120000": ["120010", "120020", "120030"], "130000": ["130010", "130020", "130030", "130040"], "140000": ["140010", "140020"],
  "150000": ["150010", "150020", "150030", "150040"], "160000": ["160010", "160020"], "170000": ["170010", "170020"], "180000": ["180010", "180020"], "190000": ["190010", "190020"], "200000": ["200010", "200020", "200030"], "210000": ["210010", "210020"], "220000": ["220010", "220020", "220030", "220040"], "230000": ["230010", "230020"], "240000": ["240010", "240020"],
  "250000": ["250010", "250020"], "260000": ["260010", "260020"], "270000": ["270000"], "280000": ["280010", "280020"], "290000": ["290010", "290020"], "300000": ["300010", "300020"], "310000": ["310010", "310020"], "320000": ["320010", "320020", "320030"], "330000": ["330010", "330020"], "340000": ["340010", "340020"], "350000": ["350010", "350020", "350030", "350040"],
  "360000": ["360010", "360020"], "370000": ["370000"], "380000": ["380010", "380020", "380030"], "390000": ["390010", "390020", "390030"], "400000": ["400010", "400020", "400030", "400040"], "410000": ["410010", "410020"], "420000": ["420010", "420020", "420030", "420040"], "430000": ["430010", "430020", "430030", "430040"], "440000": ["440010", "440020", "440030", "440040"], "450000": ["450010", "450020", "450030", "450040"], "460040": ["460040"], "460100": ["460010", "460020", "460030"], "471000": ["471010", "471020", "471030"], "472000": ["472000"], "473000": ["473000"], "474000": ["474010", "474020"],
};

const CITY_AREA_ROWS = [
  ["札幌", "Sapporo", "016000", "016010", "14163", 43.0618, 141.3545], ["函館", "Hakodate", "017000", "017010", "23232", 41.7687, 140.7291], ["青森", "Aomori", "020000", "020010", "31312", 40.8244, 140.7400], ["盛岡", "Morioka", "030000", "030010", "33431", 39.7021, 141.1545], ["仙台", "Sendai", "040000", "040010", "34392", 38.2682, 140.8694], ["秋田", "Akita", "050000", "050010", "32402", 39.7186, 140.1024], ["山形", "Yamagata", "060000", "060010", "35426", 38.2554, 140.3396], ["福島", "Fukushima", "070000", "070010", "36127", 37.7608, 140.4747],
  ["水戶", "Mito", "080000", "080010", "40201", 36.3659, 140.4712], ["宇都宮", "Utsunomiya", "090000", "090010", "41277", 36.5551, 139.8828], ["前橋", "Maebashi", "100000", "100010", "42251", 36.3895, 139.0634], ["埼玉", "Saitama", "110000", "110010", "43241", 35.8617, 139.6455], ["千葉", "Chiba", "120000", "120010", "45212", 35.6074, 140.1065], ["東京", "Tokyo", "130000", "130010", "44132", 35.6762, 139.6503], ["橫濱", "Yokohama", "140000", "140010", "46106", 35.4437, 139.6380],
  ["新潟", "Niigata", "150000", "150010", "54232", 37.9026, 139.0233], ["富山", "Toyama", "160000", "160010", "55102", 36.6953, 137.2113], ["金澤", "Kanazawa", "170000", "170010", "56227", 36.5613, 136.6562], ["福井", "Fukui", "180000", "180010", "57066", 36.0641, 136.2196], ["甲府", "Kofu", "190000", "190010", "49142", 35.6639, 138.5684], ["長野", "Nagano", "200000", "200010", "48156", 36.6486, 138.1948], ["岐阜", "Gifu", "210000", "210010", "52586", 35.4233, 136.7607], ["靜岡", "Shizuoka", "220000", "220010", "50331", 34.9756, 138.3828], ["名古屋", "Nagoya", "230000", "230010", "51106", 35.1815, 136.9066], ["津", "Tsu", "240000", "240010", "53133", 34.7303, 136.5086],
  ["大津", "Otsu", "250000", "250010", "60216", 35.0179, 135.8546], ["京都", "Kyoto", "260000", "260010", "61286", 35.0116, 135.7681], ["舞鶴", "Maizuru", "260000", "260020", "61111", 35.4748, 135.3859], ["大阪", "Osaka", "270000", "270000", "62078", 34.6937, 135.5023], ["神戶", "Kobe", "280000", "280010", "63518", 34.6901, 135.1956], ["奈良", "Nara", "290000", "290010", "64036", 34.6851, 135.8048], ["和歌山", "Wakayama", "300000", "300010", "65042", 34.2260, 135.1675], ["鳥取", "Tottori", "310000", "310010", "69122", 35.5011, 134.2351], ["松江", "Matsue", "320000", "320010", "68132", 35.4681, 133.0484], ["岡山", "Okayama", "330000", "330010", "66408", 34.6551, 133.9195], ["廣島", "Hiroshima", "340000", "340010", "67437", 34.3853, 132.4553], ["山口", "Yamaguchi", "350000", "350020", "81286", 34.1785, 131.4737],
  ["德島", "Tokushima", "360000", "360010", "71106", 34.0658, 134.5593], ["高松", "Takamatsu", "370000", "370000", "72086", 34.3428, 134.0466], ["松山", "Matsuyama", "380000", "380010", "73166", 33.8417, 132.7661], ["高知", "Kochi", "390000", "390010", "74182", 33.5597, 133.5311], ["福岡", "Fukuoka", "400000", "400010", "82182", 33.5904, 130.4017], ["北九州", "Kitakyushu", "400000", "400020", "82056", 33.8834, 130.8752], ["佐賀", "Saga", "410000", "410010", "85142", 33.2494, 130.2988], ["長崎", "Nagasaki", "420000", "420010", "84496", 32.7503, 129.8777], ["熊本", "Kumamoto", "430000", "430010", "86141", 32.8031, 130.7079], ["大分", "Oita", "440000", "440010", "83216", 33.2396, 131.6093], ["宮崎", "Miyazaki", "450000", "450010", "87376", 31.9077, 131.4202], ["鹿兒島", "Kagoshima", "460100", "460010", "88317", 31.5966, 130.5571], ["那霸", "Naha", "471000", "471010", "91197", 26.2124, 127.6809],
  ["小笠原", "Ogasawara", "130000", "130040", "44301", 27.0944, 142.1917], ["大島", "Oshima", "130000", "130020", "44172", 34.7500, 139.3600], ["八丈島", "Hachijo", "130000", "130030", "44263", 33.1150, 139.8000], ["南大東", "Minamidaito", "472000", "472000", "92011", 25.8288, 131.2315], ["宮古島", "Miyakojima", "473000", "473000", "93041", 24.8055, 125.2811], ["石垣島", "Ishigaki", "474000", "474010", "94081", 24.3400, 124.1550], ["與那國", "Yonaguni", "474000", "474020", "94017", 24.4670, 123.0040], ["奄美", "Amami", "460040", "460040", "88837", 28.3772, 129.4938],
];

// Exact city aliases and deliberately small, non-overlapping coordinate boxes. Broad prefecture names are excluded.
export const JMA_FORECAST_AREAS = CITY_AREA_ROWS.map(([name, englishName, forecastAreaCode, areaCode, temperatureAreaCode, latitude, longitude]) => ({
  forecastAreaCode, areaCode, temperatureAreaCode, prefecture: name, aliases: [name, englishName], admin1Aliases: [],
  bounds: { minLat: latitude - 0.015, maxLat: latitude + 0.015, minLon: longitude - 0.015, maxLon: longitude + 0.015 },
}));

const JMA_FORECAST_BASE_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast";
const WMO_SEVERITY = [95, 73, 63, 45, 3, 0];

export function isJapanLocation(location) {
  return String(location?.countryCode || location?.country_code || "").trim().toUpperCase() === "JP";
}

export function resolveJmaForecastArea(location) {
  if (!isJapanLocation(location)) return null;
  const savedCode = String(location?.jmaForecastAreaCode || location?.jmaAreaCode || "").trim();
  if (savedCode) {
    const saved = JMA_FORECAST_AREAS.filter((area) => area.areaCode === savedCode);
    if (saved.length === 1) return publicArea(saved[0]);
  }

  const candidates = new Set(normalizeLocationText(location?.name));
  const textualMatches = JMA_FORECAST_AREAS.filter((area) =>
    area.aliases.some((alias) => candidates.has(normalizeText(alias))),
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
  return Object.hasOwn(JMA_OFFICE_FORECAST_AREAS, code)
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
    if (!Array.isArray(payload) || !Object.hasOwn(JMA_OFFICE_FORECAST_AREAS, forecastAreaCode) || !JMA_OFFICE_FORECAST_AREAS[forecastAreaCode].includes(areaCode)) return null;
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
