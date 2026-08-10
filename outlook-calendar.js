(() => {
  "use strict";

  const SCOPES = ["Calendars.ReadBasic"];
  let client = null;
  let clientSignature = "";
  let initializePromise = null;
  let settingsValue = { clientId: "", tenantId: "organizations" };

  function currentRedirectUri() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function readSettings() {
    return { ...settingsValue };
  }

  function saveSettings(clientId, tenantId) {
    const normalizedClientId = String(clientId || "").trim();
    const normalizedTenantId = String(tenantId || "organizations").trim() || "organizations";
    if (normalizedClientId && !/^[0-9a-f-]{36}$/i.test(normalizedClientId)) throw new Error("Geçerli bir Microsoft Application (client) ID girin.");
    if (!/^(organizations|common|consumers|[0-9a-f-]{36})$/i.test(normalizedTenantId)) throw new Error("Tenant ID bir GUID veya organizations/common/consumers olmalıdır.");
    settingsValue = { clientId: normalizedClientId, tenantId: normalizedTenantId };
    client = null;
    clientSignature = "";
    initializePromise = null;
    return readSettings();
  }

  async function initialize() {
    const settings = readSettings();
    if (!settings.clientId) return { configured: false, account: null };
    if (!window.msal?.createStandardPublicClientApplication) throw new Error("Microsoft kimlik doğrulama bileşeni yüklenemedi.");
    const signature = `${settings.clientId}:${settings.tenantId}:${currentRedirectUri()}`;
    if (client && signature === clientSignature) return { configured: true, account: client.getActiveAccount() || client.getAllAccounts()[0] || null };
    if (!initializePromise || signature !== clientSignature) {
      clientSignature = signature;
      initializePromise = (async () => {
        client = await window.msal.createStandardPublicClientApplication({
          auth: {
            clientId: settings.clientId,
            authority: `https://login.microsoftonline.com/${settings.tenantId}`,
            redirectUri: currentRedirectUri(),
            postLogoutRedirectUri: currentRedirectUri(),
            navigateToLoginRequestUrl: true
          },
          cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false }
        });
        const redirectResult = await client.handleRedirectPromise();
        const account = redirectResult?.account || client.getActiveAccount() || client.getAllAccounts()[0] || null;
        if (account) client.setActiveAccount(account);
        return account;
      })();
    }
    return { configured: true, account: await initializePromise };
  }

  async function signIn() {
    const state = await initialize();
    if (!state.configured) throw new Error("Önce Microsoft Application (client) ID ayarını kaydedin.");
    if (state.account) return state.account;
    await client.loginRedirect({ scopes: SCOPES, prompt: "select_account", redirectUri: currentRedirectUri() });
    return null;
  }

  async function signOut() {
    const state = await initialize();
    if (!state.account) return;
    await client.logoutRedirect({ account: state.account, postLogoutRedirectUri: currentRedirectUri() });
  }

  async function accessToken() {
    const state = await initialize();
    if (!state.configured) throw new Error("Outlook Takvim ayarları yapılmadı.");
    if (!state.account) {
      await signIn();
      return "";
    }
    try {
      const result = await client.acquireTokenSilent({ scopes: SCOPES, account: state.account });
      return result.accessToken;
    } catch (error) {
      if (error instanceof window.msal.InteractionRequiredAuthError) {
        await client.acquireTokenRedirect({ scopes: SCOPES, account: state.account, redirectUri: currentRedirectUri() });
        return "";
      }
      throw error;
    }
  }

  async function fetchCalendarView(startDate, endDate) {
    const token = await accessToken();
    if (!token) return [];
    const params = new URLSearchParams({
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
      "$select": "id,subject,bodyPreview,start,end,isAllDay,location,webLink,organizer,showAs,isCancelled",
      "$orderby": "start/dateTime",
      "$top": "100"
    });
    let nextUrl = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?${params.toString()}`;
    const events = [];
    let pageCount = 0;
    while (nextUrl && pageCount < 5) {
      const response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `Microsoft Graph hatası (${response.status})`);
      events.push(...(payload.value || []));
      nextUrl = payload["@odata.nextLink"] || "";
      pageCount += 1;
    }
    return events.filter((event) => !event.isCancelled);
  }

  function getAccount() {
    return client?.getActiveAccount?.() || client?.getAllAccounts?.()[0] || null;
  }

  window.OutlookCalendar = Object.freeze({
    initialize,
    signIn,
    signOut,
    fetchCalendarView,
    getAccount,
    getSettings: readSettings,
    saveSettings,
    getRedirectUri: currentRedirectUri,
    scopes: SCOPES.slice()
  });
})();
