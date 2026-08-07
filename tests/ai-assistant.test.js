"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { createAssistantServer, buildOpenAiPayload, extractOutputText, DEFAULT_MODEL } = require("../server");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

(async () => {
  const requestPayload = buildOpenAiPayload({ message: "Haftayı özetle", context: { weeklyHours: 8 }, history: [], model: DEFAULT_MODEL });
  assert.equal(requestPayload.model, "gpt-5.6-sol");
  assert.equal(requestPayload.store, false);
  assert.equal(requestPayload.reasoning.effort, "low");
  assert.match(requestPayload.instructions, /salt okunurdur/i);
  assert.equal(extractOutputText({ output: [{ content: [{ type: "output_text", text: "Hazır" }] }] }), "Hazır");

  let upstreamRequest;
  const server = createAssistantServer({
    rootDir: path.join(__dirname, ".."),
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      upstreamRequest = JSON.parse(options.body);
      return new Response(JSON.stringify({ id: "resp-test", output: [{ content: [{ type: "output_text", text: "Bu hafta 8 saat efor girdiniz." }] }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    assert.equal(health.configured, true);
    assert.equal(health.model, "gpt-5.6-sol");

    const staticResponse = await fetch(`${baseUrl}/`);
    assert.equal(staticResponse.status, 200);
    assert.match(await staticResponse.text(), /Günlük Efor Takibi/);

    const assistantResponse = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Origin": baseUrl },
      body: JSON.stringify({ message: "Haftayı özetle", context: { overview: { weeklyHours: 8 } }, history: [] })
    });
    assert.equal(assistantResponse.status, 200);
    const assistantPayload = await assistantResponse.json();
    assert.equal(assistantPayload.answer, "Bu hafta 8 saat efor girdiniz.");
    assert.equal(upstreamRequest.store, false);
    assert.match(upstreamRequest.input[0].content[0].text, /weeklyHours/);
  } finally {
    await close(server);
  }

  const unconfiguredServer = createAssistantServer({ rootDir: path.join(__dirname, ".."), apiKey: "" });
  const unconfiguredPort = await listen(unconfiguredServer);
  try {
    const response = await fetch(`http://127.0.0.1:${unconfiguredPort}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Merhaba" })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /OPENAI_API_KEY/);
  } finally {
    await close(unconfiguredServer);
  }

  console.log("✓ AI istemcisi, güvenli backend proxy, Responses API gövdesi ve anahtarsız hata akışı");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
