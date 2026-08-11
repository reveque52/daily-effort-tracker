"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const requests = [];
const context = {
  window: {},
  URLSearchParams,
  fetch: async (url) => {
    requests.push(String(url));
    if (String(url).includes("geocoding-api")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [{ name: "Pendik", admin1: "İstanbul", country: "Türkiye", latitude: 40.88, longitude: 29.23, timezone: "Europe/Istanbul" }] })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        current: { temperature_2m: 27.4, apparent_temperature: 32.6, relative_humidity_2m: 74, weather_code: 2, is_day: 1, wind_speed_10m: 13.2 },
        daily: { temperature_2m_max: [30.1], temperature_2m_min: [22.2], precipitation_probability_max: [10] }
      })
    };
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "weather-client.js"), "utf8"), context);

(async () => {
  const client = context.window.WeatherClient;
  assert.equal(client.describeWeather(0), "Açık");
  assert.equal(client.describeWeather(2), "Parçalı bulutlu");
  assert.equal(client.weatherIcon(61, true), "🌧️");

  const locations = await client.searchLocations("Pendik");
  assert.equal(locations.length, 1);
  assert.equal(locations[0].name, "Pendik");
  assert.equal(locations[0].detail, "İstanbul, Türkiye");

  const weather = await client.getCurrentWeather(locations[0]);
  assert.equal(weather.temperature, 27.4);
  assert.equal(weather.apparentTemperature, 32.6);
  assert.equal(weather.maximum, 30.1);
  assert.equal(weather.humidity, 74);
  assert.ok(requests.some((url) => url.includes("language=tr") && url.includes("name=Pendik")));
  assert.ok(requests.some((url) => url.includes("current=temperature_2m") && url.includes("daily=temperature_2m_max")));
  console.log("✓ konum arama, WMO hava durumu eşlemesi ve güncel tahmin istemcisi");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
