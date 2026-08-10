(() => {
  "use strict";

  const SCOPES = ["https://www.googleapis.com/auth/calendar.events.readonly"];
  const MAX_PAGES = 5;
  let tokenClient;
  let tokenClientId = "";
  let accessToken = "";

  const getClientId = () => window.DriveSync?.getClientId?.() || "";
  const hasAccessToken = () => Boolean(accessToken);

  function initialize() {
    return { configured: Boolean(getClientId()), connected: hasAccessToken() };
  }

  function authorize() {
    const clientId = getClientId();
    if (!clientId) return Promise.reject(new Error("Önce ana menüdeki Google Drive ayarlarından OAuth Client ID’nizi kaydedin."));
    if (!window.google?.accounts?.oauth2) return Promise.reject(new Error("Google oturum kütüphanesi henüz yüklenemedi. Sayfayı yenileyip tekrar deneyin."));
    if (accessToken) return Promise.resolve(accessToken);

    return new Promise((resolve, reject) => {
      const callback = (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        accessToken = response.access_token || "";
        resolve(accessToken);
      };
      if (!tokenClient || tokenClientId !== clientId) {
        tokenClientId = clientId;
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES.join(" "),
          include_granted_scopes: true,
          callback,
          error_callback: (error) => reject(new Error(error.message || error.type || "Google yetkilendirmesi tamamlanamadı."))
        });
      } else {
        tokenClient.callback = callback;
      }
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
  }

  function signOut() {
    // Drive ve Takvim aynı OAuth Client ID'yi kullanabildiği için genel Google
    // iznini iptal etmiyoruz; yalnızca bu sayfadaki Takvim token'ını unutuyoruz.
    accessToken = "";
  }

  async function calendarFetch(url) {
    if (!accessToken) throw new Error("Google Takvim’e yeniden bağlanın.");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      if (response.status === 401) accessToken = "";
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message || `Google Takvim hatası (${response.status}).`);
    }
    return response.json();
  }

  async function fetchCalendarView(start, end) {
    if (!accessToken) throw new Error("Google Takvim’e bağlanın.");
    const events = [];
    let pageToken = "";
    let page = 0;
    do {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
        fields: "items(id,summary,description,start,end,location,htmlLink,status),nextPageToken"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const payload = await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
      events.push(...(payload.items || []).filter((event) => event.status !== "cancelled"));
      pageToken = payload.nextPageToken || "";
      page += 1;
    } while (pageToken && page < MAX_PAGES);
    return events;
  }

  window.GoogleCalendar = Object.freeze({ SCOPES, getClientId, hasAccessToken, initialize, authorize, signOut, fetchCalendarView });
})();
