"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { createAssistantServer, buildJiraWorklogPayload, mapJiraIssue, mapJiraWorklog, normalizeJiraWorklogRange } = require("../server");

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
  const built = buildJiraWorklogPayload({ issueKey: "dip-43", date: "2026-08-07", hours: 2.5, description: "Teknik hazırlık" });
  assert.equal(built.issueKey, "DIP-43");
  assert.equal(built.payload.timeSpentSeconds, 9000);
  assert.equal(built.payload.started, "2026-08-07T09:00:00.000+0300");
  assert.equal(built.payload.comment.content[0].content[0].text, "Teknik hazırlık");

  const mapped = mapJiraIssue({ id: "10001", key: "DIP-43", fields: { summary: "Technical Preparations", status: { name: "Open" } } }, "https://fit-global.atlassian.net");
  assert.equal(mapped.name, "DIP-43");
  assert.equal(mapped.description, "Technical Preparations");
  assert.equal(mapped.url, "https://fit-global.atlassian.net/browse/DIP-43");

  const mappedWorklog = mapJiraWorklog({
    id: "501", started: "2026-08-07T09:00:00.000+0300", timeSpentSeconds: 5400,
    author: { accountId: "account-1", displayName: "Test User" },
    comment: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "JIRA'dan gelen açıklama" }] }] }
  }, { id: "10001", key: "DIP-43", fields: { summary: "Technical Preparations" } }, "https://fit-global.atlassian.net");
  assert.equal(mappedWorklog.hours, 1.5);
  assert.equal(mappedWorklog.description, "JIRA'dan gelen açıklama");
  assert.equal(normalizeJiraWorklogRange("2026-08-01", "2026-08-31").to, "2026-08-31");
  assert.throws(() => normalizeJiraWorklogRange("2025-01-01", "2026-08-31"), /366/);

  const upstreamCalls = [];
  const server = createAssistantServer({
    rootDir: path.join(__dirname, ".."),
    jiraBaseUrl: "https://fit-global.atlassian.net",
    jiraEmail: "jira-user@example.com",
    jiraApiToken: "test-jira-token",
    fetchImpl: async (url, options = {}) => {
      upstreamCalls.push({ url, options });
      if (url.endsWith("/rest/api/3/myself")) return Response.json({ accountId: "account-1", displayName: "Test User" });
      if (url.endsWith("/rest/api/3/search/jql")) return Response.json({ issues: [{ id: "10001", key: "DIP-43", fields: { summary: "Technical Preparations", issuetype: { name: "Task" }, status: { name: "Open" } } }] });
      if (url.includes("/rest/api/3/issue/RD-179?fields=")) return Response.json({ id: "10179", key: "RD-179", fields: { summary: "Version Packaging", issuetype: { name: "Task" }, assignee: { displayName: "Test User" }, reporter: { displayName: "Reporter" }, priority: { name: "Low" }, status: { name: "In Progress" }, resolution: null, created: "2026-01-01T09:00:00.000+0300", updated: "2026-08-07T09:00:00.000+0300", duedate: "2026-12-31" } });
      if (url.includes("/rest/api/3/issue/DIP-43/worklog?")) return Response.json({
        startAt: 0,
        maxResults: 100,
        total: 2,
        worklogs: [
          { id: "601", started: "2026-08-06T09:00:00.000+0300", timeSpentSeconds: 7200, author: { accountId: "account-1", displayName: "Test User" }, created: "2026-08-06T10:00:00.000+0300", updated: "2026-08-06T10:00:00.000+0300", comment: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "Analiz" }] }] } },
          { id: "602", started: "2026-08-06T11:00:00.000+0300", timeSpentSeconds: 3600, author: { accountId: "another-account", displayName: "Other User" }, comment: "Başka kullanıcı" }
        ]
      });
      if (url.endsWith("/worklog") && options.method === "POST") return Response.json({ id: "501" });
      if (url.endsWith("/worklog/501") && options.method === "PUT") return Response.json({ id: "501" });
      if (url.endsWith("/worklog/501") && options.method === "DELETE") return new Response(null, { status: 204 });
      return Response.json({ errorMessages: ["Beklenmeyen JIRA isteği"] }, { status: 500 });
    }
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${baseUrl}/api/jira/health`).then((response) => response.json());
    assert.equal(health.ok, true);
    assert.equal(health.account.displayName, "Test User");
    assert.equal(health.site, "https://fit-global.atlassian.net");

    const issues = await fetch(`${baseUrl}/api/jira/issues?jql=${encodeURIComponent("assignee = currentUser()")}`).then((response) => response.json());
    assert.equal(issues.items.length, 1);
    assert.equal(issues.items[0].name, "DIP-43");
    const searchBody = JSON.parse(upstreamCalls.find((call) => call.url.endsWith("/search/jql")).options.body);
    assert.equal(searchBody.jql, "assignee = currentUser()");

    const singleIssue = await fetch(`${baseUrl}/api/jira/issues/rd-179`).then((response) => response.json());
    assert.equal(singleIssue.item.name, "RD-179");
    assert.equal(singleIssue.item.description, "Version Packaging");
    assert.equal(singleIssue.item.assignee, "Test User");
    assert.equal(singleIssue.item.priority, "Low");

    const imported = await fetch(`${baseUrl}/api/jira/worklogs?from=2026-08-01&to=2026-08-31`).then((response) => response.json());
    assert.equal(imported.items.length, 1);
    assert.equal(imported.items[0].worklogId, "601");
    assert.equal(imported.items[0].issueKey, "DIP-43");
    assert.equal(imported.items[0].description, "Analiz");
    assert.equal(imported.items[0].hours, 2);
    assert.equal(imported.account.accountId, "account-1");
    const importSearchCall = upstreamCalls.filter((call) => call.url.endsWith("/search/jql")).at(-1);
    assert.match(JSON.parse(importSearchCall.options.body).jql, /worklogAuthor = currentUser\(\).*worklogDate >= "2026-08-01".*worklogDate <= "2026-08-31"/);

    const worklogBody = { issueKey: "DIP-43", date: "2026-08-07", hours: 2, description: "Hazırlık" };
    const created = await fetch(`${baseUrl}/api/jira/worklogs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(worklogBody) }).then((response) => response.json());
    assert.equal(created.worklogId, "501");
    const updated = await fetch(`${baseUrl}/api/jira/worklogs/501`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...worklogBody, hours: 3 }) }).then((response) => response.json());
    assert.equal(updated.worklogId, "501");
    const deleted = await fetch(`${baseUrl}/api/jira/worklogs/501`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueKey: "DIP-43" }) }).then((response) => response.json());
    assert.equal(deleted.ok, true);

    const authHeaders = upstreamCalls.map((call) => call.options.headers?.Authorization).filter(Boolean);
    assert.ok(authHeaders.every((value) => value.startsWith("Basic ")));
    assert.ok(!JSON.stringify({ health, issues, imported, created, updated, deleted }).includes("test-jira-token"));
  } finally {
    await close(server);
  }

  const unconfigured = createAssistantServer({ rootDir: path.join(__dirname, ".."), jiraEmail: "", jiraApiToken: "" });
  const unconfiguredPort = await listen(unconfigured);
  try {
    const response = await fetch(`http://127.0.0.1:${unconfiguredPort}/api/jira/health`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /JIRA_EMAIL.*JIRA_API_TOKEN/);
  } finally {
    await close(unconfigured);
  }

  console.log("✓ JIRA Cloud bağlantı, issue senkronizasyonu ve worklog proxy akışı");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
