import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const ADMIN_EMAIL = "selcuk.dere@fit-global.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

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

function bearerToken(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError("Geçerli Supabase oturumu gerekli.", 401);
  return match[1];
}

function clientIp(req: Request) {
  const value = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]
    || req.headers.get("x-real-ip")
    || "";
  const normalized = value.trim().replace(/^\[|\]$/g, "");
  return normalized && normalized.length <= 64 && /^[0-9a-f:.]+$/i.test(normalized) ? normalized : null;
}

function sessionId(value: unknown) {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
    throw new HttpError("Oturum kimliği geçersiz.");
  }
  return id;
}

function safeText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Yalnızca POST desteklenir." }, 405);

  try {
    const projectUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = secretKey();
    if (!projectUrl || !serviceKey) throw new HttpError("Supabase servis ayarları eksik.", 500);

    const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(bearerToken(req));
    if (userError || !userData.user) throw new HttpError("Supabase oturumu doğrulanamadı.", 401);

    const body = await req.json().catch(() => ({}));
    const action = safeText(body?.action, 30).toLowerCase();
    const user = userData.user;
    const email = String(user.email || "").trim().toLowerCase();
    const now = new Date().toISOString();

    if (action === "list") {
      if (email !== ADMIN_EMAIL) throw new HttpError("Bu denetim kayıtlarını görüntüleme yetkiniz yok.", 403);
      const limit = Math.min(500, Math.max(1, Number(body?.limit) || 250));
      let query = admin
        .from("user_access_logs")
        .select("id,user_id,email,signed_in_at,last_seen_at,signed_out_at,ip_address,user_agent,entry_path,exit_reason")
        .order("signed_in_at", { ascending: false })
        .limit(limit);
      const from = safeText(body?.from, 40);
      const to = safeText(body?.to, 40);
      const search = safeText(body?.search, 120).replace(/[%_,()]/g, " ").trim();
      if (from) query = query.gte("signed_in_at", from);
      if (to) query = query.lt("signed_in_at", to);
      if (search) query = query.ilike("email", `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return json({ logs: data || [], serverTime: now });
    }

    const id = sessionId(body?.sessionId);
    if (action === "start") {
      const { data: existing, error: existingError } = await admin
        .from("user_access_logs")
        .select("id,user_id")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing && existing.user_id !== user.id) throw new HttpError("Oturum kimliği başka bir kullanıcıya ait.", 409);

      if (existing) {
        const { error } = await admin.from("user_access_logs").update({
          last_seen_at: now,
          signed_out_at: null,
          exit_reason: null,
        }).eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await admin.from("user_access_logs").insert({
          id,
          user_id: user.id,
          email,
          signed_in_at: now,
          last_seen_at: now,
          ip_address: clientIp(req),
          user_agent: safeText(req.headers.get("user-agent"), 1000),
          entry_path: safeText(body?.path, 500),
        });
        if (error) throw error;
      }
      return json({ ok: true, sessionId: id, trackedAt: now });
    }

    if (action === "heartbeat" || action === "end") {
      const patch: Record<string, unknown> = { last_seen_at: now };
      if (action === "end") {
        patch.signed_out_at = now;
        patch.exit_reason = safeText(body?.reason, 80) || "page_closed";
      }
      const { error } = await admin.from("user_access_logs").update(patch).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      return json({ ok: true, sessionId: id, trackedAt: now });
    }

    throw new HttpError("Log işlemi desteklenmiyor.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error("access-log error", error);
    return json({ error: error instanceof Error ? error.message : "Log işlemi tamamlanamadı." }, status);
  }
});
