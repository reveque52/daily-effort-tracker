((global) => {
  "use strict";

  const ENDPOINT_KEY = "daily-effort-tracker.jira-api-endpoint";
  const DEFAULT_ENDPOINT = String(global.location?.hostname || "").endsWith("github.io") ? "supabase:jira-proxy" : "/api/jira";

  function usesSupabase(endpoint = getEndpoint()) {
    return String(endpoint || "").toLowerCase() === "supabase:jira-proxy";
  }

  function getEndpoint() {
    const saved = global.localStorage.getItem(ENDPOINT_KEY) || "";
    const githubPages = String(global.location?.hostname || "").endsWith("github.io");
    if (githubPages && (!saved || saved.startsWith("/"))) return "supabase:jira-proxy";
    return saved || DEFAULT_ENDPOINT;
  }

  function setEndpoint(value) {
    const endpoint = String(value || "").trim().replace(/\/$/, "");
    if (!endpoint) {
      global.localStorage.removeItem(ENDPOINT_KEY);
      return DEFAULT_ENDPOINT;
    }
    if (!usesSupabase(endpoint) && !endpoint.startsWith("/") && !/^https:\/\//i.test(endpoint)) throw new Error("JIRA servis adresi Supabase, HTTPS veya aynı origin üzerinde göreli bir adres olmalıdır.");
    global.localStorage.setItem(ENDPOINT_KEY, endpoint);
    return endpoint;
  }

  async function request(pathname, options = {}) {
    if (usesSupabase()) {
      if (!global.SupabaseCloud?.invokeJira) throw new Error("Supabase JIRA istemcisi yüklenemedi.");
      return global.SupabaseCloud.invokeJira(pathname, options);
    }
    const response = await global.fetch(`${getEndpoint()}${pathname}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `JIRA servisi hata verdi (${response.status}).`);
    return payload;
  }

  function health() {
    return request("/health", { method: "GET" });
  }

  function getOAuthStatus() {
    return request("/oauth/status", { method: "GET" });
  }

  function getOAuthStartUrl(returnTo = global.location.href) {
    if (usesSupabase()) throw new Error("Supabase bağlantısında Atlassian yönlendirmesi kullanılmaz; JIRA API tokenınızı bağlantı ayarlarından kaydedin.");
    const endpoint = new URL(getEndpoint(), global.location.href);
    return `${endpoint.toString().replace(/\/$/, "")}/oauth/start?${new URLSearchParams({ returnTo: String(returnTo || global.location.href) })}`;
  }

  function signInWithJira() {
    global.location.assign(getOAuthStartUrl());
  }

  function signOutFromJira() {
    return request("/oauth/logout", { method: "POST", body: "{}" });
  }

  function getCredentialStatus() {
    return request("/credentials/status", { method: "GET" });
  }

  function saveCredentials(credentials) {
    return request("/credentials/save", { method: "POST", body: JSON.stringify(credentials || {}) });
  }

  function removeCredentials() {
    return request("/credentials/delete", { method: "DELETE", body: "{}" });
  }

  function syncUsers(maxResults = 1000) {
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    return request(`/users?${params}`, { method: "GET" });
  }

  function syncIssues(jql, maxResults = 100) {
    const params = new URLSearchParams({ jql: String(jql || "").trim(), maxResults: String(maxResults) });
    return request(`/issues?${params}`, { method: "GET" });
  }

  function getIssue(issueKey) {
    const key = String(issueKey || "").trim().toUpperCase();
    return request(`/issues/${encodeURIComponent(key)}`, { method: "GET" });
  }

  function transitionIssue(issueKey, targetStatus) {
    const key = String(issueKey || "").trim().toUpperCase();
    return request(`/issues/${encodeURIComponent(key)}/transitions`, {
      method: "POST",
      body: JSON.stringify({ targetStatus: String(targetStatus || "").trim() })
    });
  }

  function syncWorklogs(from, to) {
    const params = new URLSearchParams({ from: String(from || "").trim(), to: String(to || "").trim() });
    return request(`/worklogs?${params}`, { method: "GET" });
  }

  function createWorklog(entry, issueKey) {
    return request("/worklogs", {
      method: "POST",
      body: JSON.stringify({ issueKey, date: entry.date, hours: entry.hours, description: entry.task || entry.description })
    });
  }

  function updateWorklog(entry, issueKey, worklogId) {
    return request(`/worklogs/${encodeURIComponent(worklogId)}`, {
      method: "PUT",
      body: JSON.stringify({ issueKey, date: entry.date, hours: entry.hours, description: entry.task || entry.description })
    });
  }

  function deleteWorklog(issueKey, worklogId) {
    return request(`/worklogs/${encodeURIComponent(worklogId)}`, {
      method: "DELETE",
      body: JSON.stringify({ issueKey })
    });
  }

  global.JiraCloudClient = Object.freeze({ getEndpoint, setEndpoint, usesSupabase, health, getOAuthStatus, getOAuthStartUrl, signInWithJira, signOutFromJira, getCredentialStatus, saveCredentials, removeCredentials, syncUsers, syncIssues, getIssue, transitionIssue, syncWorklogs, createWorklog, updateWorklog, deleteWorklog });
})(window);
