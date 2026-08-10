(function (global) {
  "use strict";

  const PROJECT_URL = "https://yspvrxngxjpxlxcfqhqt.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_Z1rezgsFXSpAYPJjOuYJNQ_aY1W0Hwu";
  const TABLES = Object.freeze({
    entries: "efforts",
    tasks: "tasks",
    people: "people",
    jiraItems: "jira_items",
    reminders: "reminders"
  });
  const LEADER_ROLES = new Set(["owner", "leader"]);

  let client = null;
  let authSubscription = null;

  function getClient() {
    if (client) return client;
    if (!global.supabase?.createClient) throw new Error("Supabase istemcisi yüklenemedi.");
    client = global.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
    return client;
  }

  function redirectUrl() {
    const url = new URL(global.location.href);
    url.hash = "";
    url.search = "";
    return url.toString();
  }

  function throwIfError(error) {
    if (error) throw new Error(error.message || "Supabase işlemi tamamlanamadı.");
  }

  async function getSession() {
    const { data, error } = await getClient().auth.getSession();
    throwIfError(error);
    return data.session || null;
  }

  async function signUp(email, password) {
    const { data, error } = await getClient().auth.signUp({
      email: String(email || "").trim(),
      password,
      options: { emailRedirectTo: redirectUrl() }
    });
    throwIfError(error);
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email: String(email || "").trim(),
      password
    });
    throwIfError(error);
    return data;
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    throwIfError(error);
  }

  async function sendPasswordReset(email) {
    const { data, error } = await getClient().auth.resetPasswordForEmail(String(email || "").trim(), {
      redirectTo: redirectUrl()
    });
    throwIfError(error);
    return data;
  }

  async function updatePassword(password) {
    const { data, error } = await getClient().auth.updateUser({ password });
    throwIfError(error);
    return data;
  }

  function onAuthStateChange(callback) {
    authSubscription?.unsubscribe?.();
    const { data } = getClient().auth.onAuthStateChange((event, session) => callback(event, session));
    authSubscription = data.subscription;
    return () => authSubscription?.unsubscribe?.();
  }

  async function getContext() {
    const session = await getSession();
    if (!session?.user) throw new Error("Supabase'e giriş yapmanız gerekiyor.");

    const { data, error } = await getClient()
      .from("organization_members")
      .select("organization_id,role,organizations(name)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwIfError(error);
    if (!data?.organization_id) throw new Error("Hesabınız için organizasyon oluşturulamadı.");

    return {
      user: session.user,
      organizationId: data.organization_id,
      organizationName: data.organizations?.name || "Kişisel çalışma alanı",
      role: data.role || "member",
      isLeader: LEADER_ROLES.has(data.role)
    };
  }

  function normalizePayload(row) {
    const payload = row?.payload && typeof row.payload === "object" ? { ...row.payload } : {};
    if (!payload.id) payload.id = row.id;
    return payload;
  }

  async function pullBundle() {
    const context = await getContext();
    const bundle = {};
    let lastModifiedAt = null;

    for (const [bundleKey, table] of Object.entries(TABLES)) {
      const { data, error } = await getClient()
        .from(table)
        .select("id,payload,updated_at")
        .eq("organization_id", context.organizationId)
        .order("updated_at", { ascending: true });
      throwIfError(error);
      bundle[bundleKey] = (data || []).map(normalizePayload);
      for (const row of data || []) {
        if (!lastModifiedAt || row.updated_at > lastModifiedAt) lastModifiedAt = row.updated_at;
      }
    }

    return { ...bundle, context, lastModifiedAt };
  }

  function sourceTimestamp(item) {
    const candidate = item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at;
    const parsed = candidate ? new Date(candidate) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
  }

  async function syncTable(context, table, items) {
    const localItems = Array.isArray(items) ? items : [];
    const { data: remoteRows, error: listError } = await getClient()
      .from(table)
      .select("id,created_by")
      .eq("organization_id", context.organizationId);
    throwIfError(listError);

    const remoteById = new Map((remoteRows || []).map((row) => [String(row.id), row]));
    const localIds = new Set();
    let skipped = 0;
    const rows = localItems.map((item) => {
      const id = String(item?.id || "").trim();
      if (!id) throw new Error(`${table} tablosunda kimliği olmayan kayıt var.`);
      localIds.add(id);
      const existing = remoteById.get(id);
      if (existing && !context.isLeader && existing.created_by !== context.user.id) {
        skipped += 1;
        return null;
      }
      return {
        organization_id: context.organizationId,
        id,
        created_by: existing?.created_by || context.user.id,
        payload: item,
        source_updated_at: sourceTimestamp(item)
      };
    }).filter(Boolean);

    if (rows.length) {
      const { error } = await getClient().from(table).upsert(rows, { onConflict: "organization_id,id" });
      throwIfError(error);
    }

    const removableIds = (remoteRows || [])
      .filter((row) => !localIds.has(String(row.id)) && (context.isLeader || row.created_by === context.user.id))
      .map((row) => row.id);
    if (removableIds.length) {
      const { error } = await getClient()
        .from(table)
        .delete()
        .eq("organization_id", context.organizationId)
        .in("id", removableIds);
      throwIfError(error);
    }

    return { saved: rows.length, removed: removableIds.length, skipped };
  }

  async function pushBundle(bundle) {
    const context = await getContext();
    const totals = { saved: 0, removed: 0, skipped: 0 };

    for (const [bundleKey, table] of Object.entries(TABLES)) {
      const result = await syncTable(context, table, bundle?.[bundleKey]);
      totals.saved += result.saved;
      totals.removed += result.removed;
      totals.skipped += result.skipped;
    }

    const syncedAt = new Date().toISOString();
    const { error } = await getClient().from("user_settings").upsert({
      user_id: context.user.id,
      organization_id: context.organizationId,
      payload: { lastCloudSyncAt: syncedAt }
    }, { onConflict: "user_id" });
    throwIfError(error);

    return { ...totals, syncedAt, context };
  }

  async function getRemoteSummary() {
    const pulled = await pullBundle();
    const counts = Object.fromEntries(Object.keys(TABLES).map((key) => [key, pulled[key].length]));
    return {
      counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      lastModifiedAt: pulled.lastModifiedAt,
      context: pulled.context
    };
  }

  async function invokeJira(pathname, options = {}) {
    const session = await getSession();
    if (!session?.user) throw new Error("JIRA bağlantısı için önce Supabase hesabınıza giriş yapın.");
    let body = options.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); }
      catch { throw new Error("JIRA isteğinin gövdesi geçersiz."); }
    }
    const { data, error } = await getClient().functions.invoke("jira-proxy", {
      body: {
        pathname: String(pathname || ""),
        method: String(options.method || "GET").toUpperCase(),
        body: body && typeof body === "object" ? body : {}
      }
    });
    if (error) {
      let message = error.message || "Supabase JIRA servisine ulaşılamadı.";
      try {
        const details = await error.context?.json?.();
        if (details?.error) message = details.error;
      } catch { /* Supabase istemci hatası kullanılır. */ }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  global.SupabaseCloud = Object.freeze({
    PROJECT_URL,
    TABLES,
    getClient,
    getSession,
    getContext,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    onAuthStateChange,
    pullBundle,
    pushBundle,
    getRemoteSummary,
    invokeJira
  });
})(window);
