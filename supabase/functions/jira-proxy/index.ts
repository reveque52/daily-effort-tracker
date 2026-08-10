import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const issueFields = ["summary", "issuetype", "assignee", "reporter", "priority", "status", "resolution", "created", "updated", "duedate"];

class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type JiraCredentials = {
  baseUrl: string;
  email: string;
  apiToken: string;
  updatedAt?: string;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function secretKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (keys.default) return String(keys.default);
  } catch { /* legacy key fallback below */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function normalizeBaseUrl(value: unknown) {
  const url = new URL(String(value || "").trim());
  if (url.protocol !== "https:" || url.username || url.password || (url.pathname !== "/" && url.pathname !== "")) {
    throw new HttpError("JIRA adresi geçerli bir HTTPS origin olmalıdır.");
  }
  return url.origin;
}

function normalizeIssueKey(value: unknown) {
  const key = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) throw new HttpError("Geçerli bir JIRA issue key girin.");
  return key;
}

function mapIssue(issue: any, baseUrl: string) {
  const fields = issue?.fields || {};
  return {
    jiraIssueId: String(issue?.id || ""),
    issueType: String(fields.issuetype?.name || "Task"),
    name: String(issue?.key || ""),
    description: String(fields.summary || issue?.key || "JIRA maddesi"),
    url: `${baseUrl}/browse/${encodeURIComponent(issue?.key || "")}`,
    assignee: String(fields.assignee?.displayName || ""),
    reporter: String(fields.reporter?.displayName || ""),
    priority: String(fields.priority?.name || ""),
    status: String(fields.status?.name || "Open"),
    resolution: String(fields.resolution?.name || "Unresolved"),
    jiraCreated: String(fields.created || ""),
    jiraUpdated: String(fields.updated || ""),
    dueDate: String(fields.duedate || ""),
  };
}

function mapUser(user: any) {
  const avatars = user?.avatarUrls || {};
  return {
    jiraAccountId: String(user?.accountId || ""),
    fullName: String(user?.displayName || ""),
    email: String(user?.emailAddress || ""),
    avatarUrl: String(avatars["48x48"] || avatars["32x32"] || avatars["24x24"] || ""),
    active: user?.active !== false,
    accountType: String(user?.accountType || ""),
    timeZone: String(user?.timeZone || ""),
    locale: String(user?.locale || ""),
  };
}

function jiraDocumentToText(value: unknown) {
  if (typeof value === "string") return value.trim();
  const parts: string[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
    if (node.type === "hardBreak") parts.push("\n");
    (Array.isArray(node.content) ? node.content : []).forEach(visit);
    if (["paragraph", "heading", "listItem"].includes(node.type)) parts.push("\n");
  };
  visit(value);
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function mapWorklog(worklog: any, issue: any, baseUrl: string) {
  const issueItem = mapIssue(issue, baseUrl);
  const seconds = Number(worklog?.timeSpentSeconds) || 0;
  return {
    worklogId: String(worklog?.id || ""),
    issueId: String(issue?.id || worklog?.issueId || ""),
    issueKey: issueItem.name,
    summary: issueItem.description,
    issue: issueItem,
    date: String(worklog?.started || "").slice(0, 10),
    hours: Math.round((seconds / 3600) * 10000) / 10000,
    description: jiraDocumentToText(worklog?.comment) || issueItem.description,
    authorAccountId: String(worklog?.author?.accountId || ""),
    authorName: String(worklog?.author?.displayName || ""),
    createdAt: String(worklog?.created || ""),
    updatedAt: String(worklog?.updated || ""),
    url: issueItem.url,
  };
}

function worklogRange(fromValue: unknown, toValue: unknown) {
  const from = String(fromValue || "").trim();
  const to = String(toValue || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError("Başlangıç ve bitiş tarihleri geçersiz.");
  const fromMs = Date.parse(`${from}T00:00:00.000+03:00`);
  const toExclusiveMs = Date.parse(`${to}T00:00:00.000+03:00`) + 86400000;
  if (!Number.isFinite(fromMs) || !Number.isFinite(toExclusiveMs) || fromMs >= toExclusiveMs) throw new HttpError("Geçerli bir tarih aralığı seçin.");
  if ((toExclusiveMs - fromMs) / 86400000 > 366) throw new HttpError("Tek seferde en fazla 366 günlük JIRA eforu alınabilir.");
  return { from, to, fromMs, toExclusiveMs };
}

function buildWorklog(body: any) {
  const issueKey = normalizeIssueKey(body?.issueKey);
  const date = String(body?.date || "").trim();
  const description = String(body?.description || "").trim();
  const hours = Number(body?.hours);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError("Worklog tarihi geçersiz.");
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new HttpError("Worklog süresi 0–24 saat arasında olmalıdır.");
  if (!description || description.length > 1000) throw new HttpError("Worklog açıklaması 1–1000 karakter arasında olmalıdır.");
  return {
    issueKey,
    payload: {
      timeSpentSeconds: Math.round(hours * 3600),
      started: `${date}T09:00:00.000+0300`,
      comment: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] },
    },
  };
}

async function jiraFetch(credentials: JiraCredentials, pathname: string, options: RequestInit = {}) {
  const response = await fetch(`${credentials.baseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Basic ${btoa(`${credentials.email}:${credentials.apiToken}`)}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return {};
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.errorMessages?.filter(Boolean).join(" ") || payload?.errors && Object.values(payload.errors).join(" ") || payload?.message || `JIRA API hatası (${response.status}).`;
    throw new HttpError(String(message), response.status >= 500 ? 502 : response.status);
  }
  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Yalnızca POST desteklenir." }, 405);

  try {
    const projectUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = secretKey();
    if (!projectUrl || !serviceKey) throw new HttpError("Supabase güvenli servis anahtarı bulunamadı.", 503);
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError("Supabase oturumu gerekli.", 401);

    const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new HttpError("Supabase oturumu geçersiz veya süresi dolmuş.", 401);
    const user = userData.user;
    const input = await req.json().catch(() => ({}));
    const pathname = String(input?.pathname || "").trim();
    const method = String(input?.method || "GET").trim().toUpperCase();
    const body = input?.body && typeof input.body === "object" ? input.body : {};
    const requestUrl = new URL(pathname, "https://jira-proxy.invalid");
    if (requestUrl.origin !== "https://jira-proxy.invalid" || !requestUrl.pathname.startsWith("/")) throw new HttpError("Geçersiz JIRA servis yolu.");

    const loadCredentials = async (): Promise<JiraCredentials | null> => {
      const { data, error } = await admin.rpc("get_jira_credentials", { target_user_id: user.id });
      if (error) throw new HttpError(`JIRA bağlantı bilgileri okunamadı: ${error.message}`, 500);
      const row = Array.isArray(data) ? data[0] : null;
      if (!row?.api_token) return null;
      return { baseUrl: String(row.base_url), email: String(row.account_email), apiToken: String(row.api_token), updatedAt: String(row.updated_at || "") };
    };

    if (requestUrl.pathname === "/credentials/status") {
      const credentials = await loadCredentials();
      return json(credentials ? { configured: true, baseUrl: credentials.baseUrl, email: credentials.email, updatedAt: credentials.updatedAt } : { configured: false });
    }

    if (requestUrl.pathname === "/credentials/save") {
      const credentials: JiraCredentials = {
        baseUrl: normalizeBaseUrl(body.baseUrl),
        email: String(body.email || "").trim().toLowerCase(),
        apiToken: String(body.apiToken || "").trim(),
      };
      if (!credentials.email.includes("@") || credentials.email.length > 254) throw new HttpError("JIRA e-posta adresi geçersiz.");
      if (credentials.apiToken.length < 20 || credentials.apiToken.length > 4096) throw new HttpError("JIRA API tokenı geçersiz.");
      const account = await jiraFetch(credentials, "/rest/api/3/myself");
      const { data, error } = await admin.rpc("save_jira_credentials", {
        target_user_id: user.id,
        jira_base_url: credentials.baseUrl,
        jira_email: credentials.email,
        jira_api_token: credentials.apiToken,
      });
      if (error) throw new HttpError(`JIRA bağlantısı kaydedilemedi: ${error.message}`, 500);
      return json({ ...(data || {}), account: { accountId: account.accountId || "", displayName: account.displayName || credentials.email } });
    }

    if (requestUrl.pathname === "/credentials/delete") {
      const { data, error } = await admin.rpc("delete_jira_credentials", { target_user_id: user.id });
      if (error) throw new HttpError(`JIRA bağlantısı silinemedi: ${error.message}`, 500);
      return json({ ok: true, removed: Boolean(data) });
    }

    const credentials = await loadCredentials();
    if (!credentials) throw new HttpError("Bu Supabase hesabı için JIRA bağlantısı tanımlanmamış.", 428);

    if (requestUrl.pathname === "/oauth/status") {
      const account = await jiraFetch(credentials, "/rest/api/3/myself");
      return json({ configured: true, connected: true, mode: "api_token", site: credentials.baseUrl, account: { accountId: account.accountId || "", displayName: account.displayName || credentials.email } });
    }
    if (requestUrl.pathname === "/oauth/logout") return json({ ok: true, sharedCredential: false });
    if (requestUrl.pathname === "/health") {
      const account = await jiraFetch(credentials, "/rest/api/3/myself");
      return json({ ok: true, site: credentials.baseUrl, mode: "api_token", account: { accountId: account.accountId || "", displayName: account.displayName || credentials.email } });
    }

    if (requestUrl.pathname === "/users" && method === "GET") {
      const limit = Math.min(Math.max(Number(requestUrl.searchParams.get("maxResults")) || 1000, 1), 1000);
      const users: any[] = [];
      for (let startAt = 0; users.length < limit;) {
        const pageSize = Math.min(100, limit - users.length);
        const page = await jiraFetch(credentials, `/rest/api/3/users/search?${new URLSearchParams({ startAt: String(startAt), maxResults: String(pageSize) })}`);
        const rows = Array.isArray(page) ? page : [];
        users.push(...rows);
        if (rows.length < pageSize) break;
        startAt += rows.length;
      }
      const items = users.map(mapUser).filter((item) => item.jiraAccountId && item.fullName && item.active && (!item.accountType || item.accountType === "atlassian")).sort((a, b) => a.fullName.localeCompare(b.fullName, "tr", { sensitivity: "base" }));
      return json({ items, total: items.length, site: credentials.baseUrl });
    }

    const transitionMatch = requestUrl.pathname.match(/^\/issues\/([^/]+)\/transitions$/);
    if (transitionMatch && method === "POST") {
      const issueKey = normalizeIssueKey(decodeURIComponent(transitionMatch[1]));
      const targetStatus = String(body.targetStatus || "").trim();
      if (!targetStatus || targetStatus.length > 80) throw new HttpError("Hedef JIRA statüsü geçersiz.");
      const available = await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`);
      const transition = (available.transitions || []).find((item: any) => String(item?.to?.name || "").trim().toLocaleLowerCase("tr-TR") === targetStatus.toLocaleLowerCase("tr-TR"));
      if (!transition?.id) throw new HttpError(`${issueKey} için “${targetStatus}” statüsüne doğrudan geçiş yok.`, 409);
      await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, { method: "POST", body: JSON.stringify({ transition: { id: String(transition.id) } }) });
      const issue = await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(issueFields.join(","))}`);
      return json({ ok: true, transitionId: String(transition.id), targetStatus, item: mapIssue(issue, credentials.baseUrl) });
    }

    const singleIssueMatch = requestUrl.pathname.match(/^\/issues\/([^/]+)$/);
    if (singleIssueMatch && method === "GET") {
      const issueKey = normalizeIssueKey(decodeURIComponent(singleIssueMatch[1]));
      const issue = await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${encodeURIComponent(issueFields.join(","))}`);
      return json({ item: mapIssue(issue, credentials.baseUrl) });
    }

    if (requestUrl.pathname === "/issues" && method === "GET") {
      const jql = String(requestUrl.searchParams.get("jql") || "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC").trim();
      if (!jql || jql.length > 1000) throw new HttpError("JQL sorgusu 1–1000 karakter arasında olmalıdır.");
      const maxResults = Math.min(Math.max(Number(requestUrl.searchParams.get("maxResults")) || 100, 1), 100);
      const result = await jiraFetch(credentials, "/rest/api/3/search/jql", { method: "POST", body: JSON.stringify({ jql, maxResults, fields: issueFields }) });
      return json({ items: (result.issues || []).map((issue: any) => mapIssue(issue, credentials.baseUrl)), nextPageToken: result.nextPageToken || "" });
    }

    const worklogMatch = requestUrl.pathname.match(/^\/worklogs(?:\/([^/]+))?$/);
    if (worklogMatch && method === "GET" && !worklogMatch[1]) {
      const range = worklogRange(requestUrl.searchParams.get("from"), requestUrl.searchParams.get("to"));
      const account = await jiraFetch(credentials, "/rest/api/3/myself");
      const jql = `worklogAuthor = currentUser() AND worklogDate >= "${range.from}" AND worklogDate <= "${range.to}" ORDER BY updated DESC`;
      const issues: any[] = [];
      let nextPageToken = "";
      for (let page = 0; page < 20; page += 1) {
        const result = await jiraFetch(credentials, "/rest/api/3/search/jql", { method: "POST", body: JSON.stringify({ jql, maxResults: 100, fields: issueFields, ...(nextPageToken ? { nextPageToken } : {}) }) });
        issues.push(...(result.issues || []));
        nextPageToken = String(result.nextPageToken || "");
        if (!nextPageToken) break;
      }
      if (nextPageToken) throw new HttpError("JIRA sonucu 2000 kaydı aştı; daha kısa bir tarih aralığı seçin.");
      const imported: any[] = [];
      for (let batchStart = 0; batchStart < issues.length; batchStart += 5) {
        const batch = issues.slice(batchStart, batchStart + 5);
        const worklogs = await Promise.all(batch.map(async (issue) => {
          const found: any[] = [];
          for (let startAt = 0, total = 1; startAt < total;) {
            const params = new URLSearchParams({ startAt: String(startAt), maxResults: "100", startedAfter: String(range.fromMs), startedBefore: String(range.toExclusiveMs) });
            const result = await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(issue.key)}/worklog?${params}`);
            const rows = Array.isArray(result.worklogs) ? result.worklogs : [];
            total = Number(result.total) || rows.length;
            startAt += rows.length;
            rows.forEach((row: any) => {
              const mapped = mapWorklog(row, issue, credentials.baseUrl);
              if (mapped.authorAccountId === account.accountId && mapped.date >= range.from && mapped.date <= range.to && mapped.worklogId) found.push(mapped);
            });
            if (!rows.length) break;
          }
          return found;
        }));
        worklogs.forEach((rows) => imported.push(...rows));
      }
      const items = Array.from(new Map(imported.map((item) => [item.worklogId, item])).values()).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.issueKey.localeCompare(b.issueKey, "en", { numeric: true }));
      return json({ items, issues: Array.from(new Map(issues.map((issue) => [issue.key, mapIssue(issue, credentials.baseUrl)])).values()), account: { accountId: account.accountId || "", displayName: account.displayName || credentials.email }, from: range.from, to: range.to });
    }

    if (worklogMatch && ["POST", "PUT", "DELETE"].includes(method)) {
      const worklogId = decodeURIComponent(worklogMatch[1] || "");
      const built = method === "DELETE" ? { issueKey: normalizeIssueKey(body.issueKey), payload: null } : buildWorklog(body);
      if (method !== "POST" && !/^\d+$/.test(worklogId)) throw new HttpError("Worklog kimliği geçersiz.");
      const result = await jiraFetch(credentials, `/rest/api/3/issue/${encodeURIComponent(built.issueKey)}/worklog${worklogId ? `/${encodeURIComponent(worklogId)}` : ""}`, { method, ...(method === "DELETE" ? {} : { body: JSON.stringify(built.payload) }) });
      return json({ ok: true, worklogId: String(result.id || worklogId), issueKey: built.issueKey });
    }

    throw new HttpError("JIRA servis yolu desteklenmiyor.", 404);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return json({ error: error instanceof Error ? error.message : "JIRA işlemi tamamlanamadı." }, status);
  }
});
