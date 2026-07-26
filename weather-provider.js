import { buildJmaForecastUrl, isJapanLocation, parseJmaForecast, resolveJmaForecastArea } from "./jma-weather.js?v=156";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeatherForecast(location, { fetchImpl = fetch } = {}) {
  if (isJapanLocation(location)) {
    const jmaArea = resolveJmaForecastArea(location);
    if (!jmaArea) return fetchOpenMeteoForecast(location, fetchImpl, "Open-Meteo（日本氣象廳備援失敗）");
    try {
      const jmaForecast = await fetchJmaForecast(jmaArea, fetchImpl);
      if (!jmaForecast) throw new Error("JMA forecast payload is not usable");
      return { ...jmaForecast, source: "日本氣象廳" };
    } catch {
      return fetchOpenMeteoForecast(location, fetchImpl, "Open-Meteo（日本氣象廳備援失敗）");
    }
  }
  return fetchOpenMeteoForecast(location, fetchImpl, openMeteoSourceName(location));
}

async function fetchJmaForecast(area, fetchImpl) {
  const url = buildJmaForecastUrl(area.forecastAreaCode);
  if (!url) return null;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseJmaForecast(await response.json(), area);
}

async function fetchOpenMeteoForecast(location, fetchImpl, source) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    hourly: "weather_code,temperature_2m,precipitation_probability,wind_speed_10m",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  if (location.model) params.set("models", location.model);
  const response = await fetchImpl(`${OPEN_METEO_BASE_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { source, daily: data.daily || {}, hourly: data.hourly || {} };
}

function openMeteoSourceName(location) {
  return location?.model === "meteoswiss_icon_ch2" ? "Open-Meteo MeteoSwiss" : "Open-Meteo";
}
