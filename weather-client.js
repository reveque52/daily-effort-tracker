(() => {
  "use strict";

  const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

  function describeWeather(code) {
    const value = Number(code);
    if (value === 0) return "Açık";
    if ([1, 2].includes(value)) return "Parçalı bulutlu";
    if (value === 3) return "Kapalı";
    if ([45, 48].includes(value)) return "Sisli";
    if ([51, 53, 55, 56, 57].includes(value)) return "Çisenti";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "Yağmurlu";
    if ([71, 73, 75, 77, 85, 86].includes(value)) return "Karlı";
    if ([95, 96, 99].includes(value)) return "Gök gürültülü";
    return "Değişken";
  }

  function weatherIcon(code, isDay = true) {
    const value = Number(code);
    if (value === 0) return isDay ? "☀️" : "🌙";
    if ([1, 2].includes(value)) return isDay ? "🌤️" : "☁️";
    if (value === 3) return "☁️";
    if ([45, 48].includes(value)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(value)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(value)) return "🌨️";
    if ([95, 96, 99].includes(value)) return "⛈️";
    return "🌡️";
  }

  function normalizeLocation(input) {
    const latitude = Number(input?.latitude);
    const longitude = Number(input?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Geçerli bir konum seçin.");
    return {
      name: String(input?.name || "Seçili konum").trim().slice(0, 80) || "Seçili konum",
      detail: String(input?.detail || "").trim().slice(0, 120),
      latitude,
      longitude,
      timezone: String(input?.timezone || "auto").trim() || "auto"
    };
  }

  async function requestJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Hava durumu servisi ${response.status} hatası verdi.`);
    const data = await response.json();
    if (data?.error) throw new Error(data.reason || "Hava durumu servisi isteği reddetti.");
    return data;
  }

  async function searchLocations(query) {
    const value = String(query || "").trim();
    if (value.length < 2) throw new Error("Konum aramak için en az 2 karakter girin.");
    const params = new URLSearchParams({ name: value, count: "6", language: "tr", format: "json" });
    const data = await requestJson(`${GEOCODING_ENDPOINT}?${params}`);
    return (data.results || []).map((item) => normalizeLocation({
      name: item.name,
      detail: [item.admin1, item.country].filter(Boolean).join(", "),
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone
    }));
  }

  async function getCurrentWeather(locationInput) {
    const location = normalizeLocation(locationInput);
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: location.timezone || "auto",
      forecast_days: "1"
    });
    const data = await requestJson(`${FORECAST_ENDPOINT}?${params}`);
    if (!data.current) throw new Error("Güncel hava durumu verisi bulunamadı.");
    return {
      location,
      temperature: Number(data.current.temperature_2m),
      apparentTemperature: Number(data.current.apparent_temperature),
      humidity: Number(data.current.relative_humidity_2m),
      windSpeed: Number(data.current.wind_speed_10m),
      weatherCode: Number(data.current.weather_code),
      isDay: Number(data.current.is_day) !== 0,
      maximum: Number(data.daily?.temperature_2m_max?.[0]),
      minimum: Number(data.daily?.temperature_2m_min?.[0]),
      precipitationProbability: Number(data.daily?.precipitation_probability_max?.[0])
    };
  }

  window.WeatherClient = Object.freeze({
    GEOCODING_ENDPOINT,
    FORECAST_ENDPOINT,
    describeWeather,
    weatherIcon,
    normalizeLocation,
    searchLocations,
    getCurrentWeather
  });
})();
