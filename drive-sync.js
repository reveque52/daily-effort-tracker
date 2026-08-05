(() => {
  "use strict";

  const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const FILE_NAME = "daily-effort-tracker.json";
  const CLIENT_ID_KEY = "daily-effort-tracker.google-client-id";
  let tokenClient;
  let accessToken = "";

  const getClientId = () => localStorage.getItem(CLIENT_ID_KEY) || "";

  function setClientId(value) {
    const clientId = String(value || "").trim();
    if (clientId && !clientId.endsWith(".apps.googleusercontent.com")) {
      throw new Error("Geçerli bir Google OAuth Client ID girin.");
    }
    if (clientId) localStorage.setItem(CLIENT_ID_KEY, clientId);
    else localStorage.removeItem(CLIENT_ID_KEY);
    tokenClient = undefined;
    accessToken = "";
  }

  function authorize(options = {}) {
    const clientId = getClientId();
    if (!clientId) return Promise.reject(new Error("Önce Google OAuth Client ID’nizi kaydedin."));
    if (!window.google?.accounts?.oauth2) return Promise.reject(new Error("Google oturum kütüphanesi yüklenemedi."));
    if (accessToken) return Promise.resolve(accessToken);

    return new Promise((resolve, reject) => {
      const callback = (response) => {
        if (response.error) reject(new Error(response.error_description || response.error));
        else { accessToken = response.access_token; resolve(accessToken); }
      };
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback,
          error_callback: (error) => reject(new Error(error.message || error.type || "Google yetkilendirmesi tamamlanamadı."))
        });
      } else tokenClient.callback = callback;
      const prompt = options.silent ? "" : (accessToken ? "" : "consent");
      tokenClient.requestAccessToken({ prompt });
    });
  }

  async function driveFetch(url, options = {}) {
    const token = accessToken || await authorize();
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      if (response.status === 401) accessToken = "";
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message || `Google Drive hatası (${response.status}).`);
    }
    return response;
  }

  async function findBackup(options = {}) {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name='${FILE_NAME}' and trashed=false`,
      orderBy: "modifiedTime desc",
      pageSize: "1",
      fields: "files(id,name,modifiedTime)"
    });
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`, { keepalive: Boolean(options.keepalive) });
    return (await response.json()).files?.[0] || null;
  }

  async function backup(entries, options = {}) {
    await authorize({ silent: Boolean(options.silent) });
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2);
    let file = await findBackup(options);
    if (!file) {
      const created = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime", {
        method: "POST",
        keepalive: Boolean(options.keepalive),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" })
      });
      file = await created.json();
    }
    const uploaded = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}?uploadType=media&fields=id,name,modifiedTime`, {
      method: "PATCH",
      keepalive: Boolean(options.keepalive),
      headers: { "Content-Type": "application/json" },
      body: payload
    });
    return uploaded.json();
  }

  async function restore(options = {}) {
    await authorize({ silent: Boolean(options.silent) });
    const file = await findBackup(options);
    if (!file) throw new Error("Google Drive’da daha önce oluşturulmuş bir yedek bulunamadı.");
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
    const payload = await response.json();
    if (payload.version !== 1 || !Array.isArray(payload.entries)) throw new Error("Drive yedeğinin biçimi geçersiz.");
    return { file, entries: payload.entries, exportedAt: payload.exportedAt };
  }

  const hasAccessToken = () => Boolean(accessToken);

  window.DriveSync = Object.freeze({ getClientId, setClientId, hasAccessToken, authorize, backup, restore });
})();
