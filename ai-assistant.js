((global) => {
  "use strict";

  const ENDPOINT_KEY = "daily-effort-tracker.ai-endpoint";
  const DEFAULT_ENDPOINT = "/api/assistant";

  function normalizeEndpoint(value) {
    const endpoint = String(value || "").trim() || DEFAULT_ENDPOINT;
    if (endpoint.startsWith("/")) return endpoint;
    const url = new URL(endpoint);
    if (!/^https?:$/.test(url.protocol)) throw new Error("AI servis adresi http veya https olmalıdır.");
    return url.toString().replace(/\/$/, "");
  }

  function getEndpoint() {
    return global.localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT;
  }

  function setEndpoint(value) {
    const endpoint = normalizeEndpoint(value);
    if (endpoint === DEFAULT_ENDPOINT) global.localStorage.removeItem(ENDPOINT_KEY);
    else global.localStorage.setItem(ENDPOINT_KEY, endpoint);
    return endpoint;
  }

  async function ask({ message, context, history = [] }) {
    const controller = new AbortController();
    const timeout = global.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await global.fetch(getEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, history }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `AI servisi yanıt vermedi (${response.status}).`);
      if (!payload.answer) throw new Error("AI servisinden geçerli bir yanıt alınamadı.");
      return payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("AI isteği zaman aşımına uğradı.");
      throw error;
    } finally {
      global.clearTimeout(timeout);
    }
  }

  global.AiAssistantClient = Object.freeze({ DEFAULT_ENDPOINT, getEndpoint, setEndpoint, ask });
})(window);
