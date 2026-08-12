(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const form = $("#effortForm");
  const taskForm = $("#taskForm");
  const personForm = $("#personForm");
  const jiraForm = $("#jiraForm");
  const reminderForm = $("#reminderForm");
  const effortEditModalForm = $("#effortEditModalForm");
  const fields = {
    id: $("#entryId"), date: $("#dateInput"), description: $("#descriptionInput"),
    hours: $("#hoursInput"), jiraId: $("#jiraItemInput")
  };
  const taskFields = {
    id: $("#taskId"), title: $("#taskTitleInput"), dueDate: $("#taskDueDateInput"),
    parentTaskId: $("#taskParentTaskInput"), assignee: $("#taskAssigneeInput"), taskType: $("#taskTypeInput"),
    priority: $("#taskPriorityInput"),
    year: $("#taskYearInput"), quarter: $("#taskQuarterInput"),
    status: $("#taskStatusInput"), descriptionHtml: $("#taskDescriptionInput"),
    documents: $("#taskDocumentsInput")
  };
  const personFields = {
    id: $("#personId"), fullName: $("#personFullNameInput"), email: $("#personEmailInput"),
    title: $("#personTitleInput"), role: $("#personRoleInput"), managerId: $("#personManagerInput")
  };
  const jiraFields = { name: $("#jiraNameInput") };
  const reminderFields = {
    id: $("#reminderId"), text: $("#reminderTextInput"), remindAt: $("#reminderDateInput"),
    importance: $("#reminderImportanceInput")
  };
  let entries = [];
  let tasks = [];
  let people = [];
  let jiraItems = [];
  let selectedTaskDetailId = null;
  const expandedTaskIds = new Set();
  let modalEffortEntries = [];
  let modalEffortMode = "edit";
  let savedTaskEditorRange = null;
  let taskExistingAttachments = [];
  let taskPendingDocuments = [];
  let aiConversation = [];
  let aiRequestPending = false;
  let jiraOAuthState = null;
  let jiraCredentialState = "unconfigured";
  let calendarEvents = [];
  let calendarViewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  let activeCalendarProvider = "google";
  let activeTheme = "violet";
  const APP_THEMES = Object.freeze({
    violet: { label: "Mor", menuLabel: "Mor tema" },
    ocean: { label: "Okyanus", menuLabel: "Okyanus teması" },
    forest: { label: "Orman", menuLabel: "Orman teması" },
    sunset: { label: "Günbatımı", menuLabel: "Günbatımı teması" },
    midnight: { label: "Gece", menuLabel: "Gece teması", dark: true },
    graphite: { label: "Kömür", menuLabel: "Kömür teması", dark: true }
  });
  let homeEffortChartPeriod = "week";
  const DEFAULT_WEATHER_LOCATION = Object.freeze({ name: "İstanbul", detail: "Türkiye", latitude: 41.0082, longitude: 28.9784, timezone: "Europe/Istanbul" });
  let weatherLocation = { ...DEFAULT_WEATHER_LOCATION };
  let weatherRequestId = 0;
  const selectedJiraRequestStatuses = new Set();
  const knownJiraRequestStatuses = new Set();
  const knownJiraRequestStatusLabels = new Map();
  const selectedJiraItemIds = new Set();
  const JIRA_WORKLOGGED_ISSUES_JQL = "worklogAuthor = currentUser() ORDER BY updated DESC";
  let draggedJiraRequestId = "";
  let jiraRequestTransitionPending = false;
  let jiraNavigatorSyncPromise = null;
  let supabaseSession = null;
  let supabaseBusy = false;
  let cloudDataReady = false;
  let cloudLoadedUserId = "";
  let cloudLoadPromise = null;
  let cloudSaveChain = Promise.resolve();
  let cloudSavePending = 0;
  let cloudSaveRevision = 0;
  let lastSupabaseSyncAt = null;
  let cloudUserSettings = {};
  let cloudSettingsSaveChain = Promise.resolve();
  let cloudSettingsSavePending = 0;
  let jiraAutoFitFrame = 0;
  let taskAssigneeSearchTimer = 0;
  let taskAssigneeSearchRequest = 0;
  let taskAssigneeRemoteUsers = [];
  let jiraAssigneeFilter = null;
  let jiraAssigneeFilterSearchTimer = 0;
  let jiraAssigneeFilterSearchRequest = 0;
  let jiraAssigneeFilterSyncRequest = 0;
  let jiraAssigneeFilterRemoteUsers = [];
  const effortJiraPickerSearchState = {
    main: { timer: 0, request: 0, remote: [] },
    modal: { timer: 0, request: 0, remote: [] }
  };
  const JIRA_TABLE_COLUMNS = Object.freeze([
    { id: "select", label: "Seç", min: 42, max: 42, locked: true },
    { id: "issueType", label: "Issue Type", min: 76, max: 170 },
    { id: "key", label: "Key", min: 72, max: 140 },
    { id: "summary", label: "Summary", min: 150, max: 420 },
    { id: "assignee", label: "Assignee", min: 95, max: 230 },
    { id: "reporter", label: "Reporter", min: 95, max: 230 },
    { id: "priority", label: "Priority", min: 70, max: 140 },
    { id: "status", label: "Status", min: 85, max: 180 },
    { id: "resolution", label: "Resolution", min: 90, max: 180 },
    { id: "created", label: "Created", min: 110, max: 190 },
    { id: "updated", label: "Updated", min: 110, max: 190 },
    { id: "dueDate", label: "Due date", min: 90, max: 160 },
    { id: "actions", label: "İşlemler", min: 125, max: 190 }
  ]);

  function loadJiraTableLayout(saved = {}) {
    const defaultOrder = JIRA_TABLE_COLUMNS.map((column) => column.id);
    const lockedIds = JIRA_TABLE_COLUMNS.filter((column) => column.locked).map((column) => column.id);
    const savedOrder = Array.isArray(saved.order) ? saved.order.filter((id) => defaultOrder.includes(id) && !lockedIds.includes(id)) : [];
    const order = [...lockedIds, ...savedOrder, ...defaultOrder.filter((id) => !lockedIds.includes(id) && !savedOrder.includes(id))];
    const savedVisible = Array.isArray(saved.visible) ? saved.visible.filter((id) => defaultOrder.includes(id) && !lockedIds.includes(id)) : defaultOrder.filter((id) => !lockedIds.includes(id));
    const visible = [...lockedIds, ...savedVisible];
    return { order, visible: visible.length > lockedIds.length ? visible : [...lockedIds, "key"], widths: saved.widths || {}, autoFit: saved.autoFit !== false };
  }

  let jiraTableLayout = loadJiraTableLayout();

  const DUMMY_JIRA = Object.freeze({
    id: "__dummy_jira__",
    issueType: "Temporary",
    name: "JIRA-YOK",
    description: "Henüz JIRA maddesi atanmadı",
    url: "",
    priority: "—",
    status: "Open"
  });

  const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const calendarMonthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
  const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
  const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  const isoToday = () => new Date().toLocaleDateString("en-CA");
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const formatHours = (value) => `${numberFormatter.format(Number(value) || 0)} sa`;
  const formatRoundedHours = (value) => `${Math.round(Number(value) || 0)} sa`;
  const formatEffortDays = (hours) => `${numberFormatter.format((Number(hours) || 0) / 8)} gün`;
  const isoFromDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
  const getJiraItem = (id) => id === DUMMY_JIRA.id ? DUMMY_JIRA : (id ? window.JiraStore.get(id) : null);

  function normalizeTheme(value) {
    const theme = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(APP_THEMES, theme) ? theme : "violet";
  }

  function setThemeStatus(message, state = "") {
    const status = $("#themeStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
  }

  async function applyTheme(value, { persist = false } = {}) {
    const theme = normalizeTheme(value);
    const meta = APP_THEMES[theme];
    activeTheme = theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = meta.dark ? "dark" : "light";
    if ($("#headerThemeMenuLabel")) $("#headerThemeMenuLabel").textContent = meta.menuLabel;
    if ($("#themeSelectionBadge")) $("#themeSelectionBadge").textContent = meta.label;
    document.querySelectorAll("[data-theme-option]").forEach((button) => {
      const selected = button.dataset.themeOption === theme;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    setThemeStatus(`${meta.label} tema etkin.`);

    if (!persist) return;
    setThemeStatus("Tema tercihi kaydediliyor…");
    try {
      await queueCloudUserSettings({ theme });
      setThemeStatus(`${meta.label} tema etkin ve hesabınıza kaydedildi.`, "success");
    } catch (error) {
      setThemeStatus(error.message || "Tema tercihi kaydedilemedi.", "error");
    }
  }
  function weatherLocationText(location = weatherLocation) {
    return [location.name, location.detail].filter(Boolean).join(", ");
  }

  function setWeatherLocationStatus(message, error = false) {
    const status = $("#weatherLocationStatus");
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  function applyWeatherLocationSetting(value) {
    try {
      weatherLocation = window.WeatherClient.normalizeLocation(value || DEFAULT_WEATHER_LOCATION);
    } catch {
      weatherLocation = { ...DEFAULT_WEATHER_LOCATION };
    }
    $("#weatherLocationLabel").textContent = weatherLocationText();
    loadWeather();
  }

  async function loadWeather() {
    const requestId = ++weatherRequestId;
    $("#refreshWeather").disabled = true;
    $("#weatherCondition").textContent = "Yükleniyor…";
    $("#weatherMeta").textContent = "Hava durumu alınıyor…";
    try {
      const weather = await window.WeatherClient.getCurrentWeather(weatherLocation);
      if (requestId !== weatherRequestId) return;
      $("#weatherLocationLabel").textContent = weatherLocationText(weather.location);
      $("#weatherIcon").textContent = window.WeatherClient.weatherIcon(weather.weatherCode, weather.isDay);
      $("#weatherTemperature").textContent = `${Math.round(weather.temperature)}°`;
      $("#weatherCondition").textContent = window.WeatherClient.describeWeather(weather.weatherCode);
      const details = [
        Number.isFinite(weather.apparentTemperature) ? `Hissedilen ${Math.round(weather.apparentTemperature)}°` : "",
        Number.isFinite(weather.maximum) && Number.isFinite(weather.minimum) ? `En yüksek ${Math.round(weather.maximum)}° · En düşük ${Math.round(weather.minimum)}°` : "",
        Number.isFinite(weather.humidity) ? `Nem %${Math.round(weather.humidity)}` : "",
        Number.isFinite(weather.windSpeed) ? `Rüzgâr ${Math.round(weather.windSpeed)} km/sa` : ""
      ].filter(Boolean);
      $("#weatherMeta").textContent = details.join(" · ");
    } catch (error) {
      if (requestId !== weatherRequestId) return;
      $("#weatherIcon").textContent = "⚠️";
      $("#weatherTemperature").textContent = "--°";
      $("#weatherCondition").textContent = "Alınamadı";
      $("#weatherMeta").textContent = error.message || "Hava durumu servisine ulaşılamadı.";
    } finally {
      if (requestId === weatherRequestId) $("#refreshWeather").disabled = false;
    }
  }

  async function selectWeatherLocation(location, save = true) {
    weatherLocation = window.WeatherClient.normalizeLocation(location);
    $("#weatherLocationLabel").textContent = weatherLocationText();
    $("#weatherLocationResults").replaceChildren();
    $("#weatherLocationMenu").open = false;
    loadWeather();
    if (!save) return;
    if (supabaseSession?.user && cloudDataReady) {
      await queueCloudUserSettings({ weatherLocation });
      setWeatherLocationStatus("Konum tercihi Supabase'e kaydedildi.");
    } else {
      setWeatherLocationStatus("Konum bu oturumda kullanılıyor. Kalıcı kayıt için Supabase hesabına giriş yapın.");
    }
  }

  function renderWeatherLocationResults(locations) {
    const results = $("#weatherLocationResults");
    results.replaceChildren();
    if (!locations.length) {
      setWeatherLocationStatus("Eşleşen konum bulunamadı.", true);
      return;
    }
    locations.forEach((location) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "weather-location-result";
      const name = document.createElement("strong");
      name.textContent = location.name;
      const detail = document.createElement("small");
      detail.textContent = location.detail || "Konum";
      button.append(name, detail);
      button.addEventListener("click", () => selectWeatherLocation(location));
      results.append(button);
    });
    setWeatherLocationStatus(`${locations.length} konum bulundu.`);
  }

  async function searchWeatherLocations(query) {
    setWeatherLocationStatus("Konum aranıyor…");
    $("#weatherLocationResults").replaceChildren();
    try {
      renderWeatherLocationResults(await window.WeatherClient.searchLocations(query));
    } catch (error) {
      setWeatherLocationStatus(error.message || "Konum aranamadı.", true);
    }
  }

  async function useDeviceWeatherLocation() {
    if (!navigator.geolocation) {
      setWeatherLocationStatus("Tarayıcınız konum özelliğini desteklemiyor.", true);
      return;
    }
    setWeatherLocationStatus("Konum izni bekleniyor…");
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 15 * 60 * 1000
      }));
      await selectWeatherLocation({
        name: "Mevcut konum",
        detail: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timezone: "auto"
      });
    } catch (error) {
      setWeatherLocationStatus(error.code === 1 ? "Konum izni verilmedi." : "Cihaz konumu alınamadı.", true);
    }
  }

  function normalizeJiraSearch(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i");
  }

  function jiraMatchesSearch(item, searchTerm) {
    if (!searchTerm) return true;
    return [item.issueType, item.name, item.description, item.assignee, item.reporter, item.priority, item.status, item.resolution]
      .some((value) => normalizeJiraSearch(value).includes(searchTerm));
  }

  function populateJiraSelect(select, includePrompt = false, searchValue = "", preferredValue = select.value) {
    const searchTerm = normalizeJiraSearch(searchValue);
    const allItems = window.JiraStore.list();
    const matchingItems = allItems.filter((item) => jiraMatchesSearch(item, searchTerm));
    const selectedItem = preferredValue && preferredValue !== DUMMY_JIRA.id
      ? allItems.find((item) => item.id === preferredValue)
      : null;
    const visibleItems = selectedItem && !matchingItems.some((item) => item.id === selectedItem.id)
      ? [selectedItem, ...matchingItems]
      : matchingItems;
    const options = [];
    if (includePrompt) {
      const prompt = document.createElement("option");
      prompt.value = "";
      prompt.textContent = "JIRA maddesi seçin";
      options.push(prompt);
    }
    if (!searchTerm || preferredValue === DUMMY_JIRA.id || jiraMatchesSearch(DUMMY_JIRA, searchTerm)) {
      const dummyOption = document.createElement("option");
      dummyOption.value = DUMMY_JIRA.id;
      dummyOption.textContent = `${DUMMY_JIRA.name} — ${DUMMY_JIRA.description}`;
      options.push(dummyOption);
    }
    visibleItems.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      const retainedSelection = searchTerm && item.id === selectedItem?.id && !jiraMatchesSearch(item, searchTerm);
      option.textContent = `${retainedSelection ? "✓ " : ""}${item.name} — ${item.description}${retainedSelection ? " (seçili)" : ""}`;
      options.push(option);
    });
    select.replaceChildren(...options);
    const fallbackValue = includePrompt ? "" : (options[0]?.value || "");
    select.value = options.some((option) => option.value === preferredValue) ? preferredValue : fallbackValue;
    return { matchCount: matchingItems.length, totalCount: allItems.length, retainedSelection: Boolean(selectedItem && !jiraMatchesSearch(selectedItem, searchTerm)) };
  }

  function effortJiraPickerConfig(kind) {
    if (kind === "modal") return {
      select: $("#modalJiraInput"), search: $("#modalJiraSearchInput"), count: $("#modalJiraSearchCount"),
      list: $("#modalJiraOptionList"), trigger: $("#modalJiraPickerButton"), value: $("#modalJiraPickerValue"),
      dropdown: $("#modalJiraPickerDropdown"), container: $("#modalJiraPicker")
    };
    return {
      select: fields.jiraId, search: $("#jiraItemSearchInput"), count: $("#jiraItemSearchCount"),
      list: $("#jiraItemOptionList"), trigger: $("#jiraItemPickerButton"), value: $("#jiraItemPickerValue"),
      dropdown: $("#jiraItemPickerDropdown"), container: $("#jiraItemPicker")
    };
  }

  function updateIntegratedJiraPickerLabel(kind) {
    const config = effortJiraPickerConfig(kind);
    const selectedItem = getJiraItem(config.select.value);
    const selectedOption = config.select.selectedOptions[0];
    config.value.textContent = selectedItem
      ? `${selectedItem.name} — ${selectedItem.description}`
      : (selectedOption?.textContent || "JIRA maddesi seçin");
  }

  function appendIntegratedJiraPickerOption(list, item, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `jira-picker-option${options.remote ? " jira-picker-option-remote" : ""}`;
    if (options.remote) button.dataset.remoteKey = item.name;
    else button.dataset.value = options.value || item.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(Boolean(options.selected)));
    const key = document.createElement("span");
    key.className = "jira-picker-option-key";
    key.textContent = item.name;
    const summary = document.createElement("span");
    summary.className = "jira-picker-option-summary";
    summary.textContent = item.description || "Summary bilgisi yok";
    button.append(key, summary);
    if (options.remote) {
      const badge = document.createElement("span");
      badge.className = "jira-picker-live-badge";
      badge.textContent = "JIRA canlı";
      button.append(badge);
    }
    list.append(button);
  }

  function renderIntegratedJiraOptionList(kind) {
    const config = effortJiraPickerConfig(kind);
    const state = effortJiraPickerSearchState[kind];
    const localOptions = [...config.select.options].filter((option) => option.value);
    const localKeys = new Set();
    config.list.replaceChildren();
    localOptions.forEach((option) => {
      const item = getJiraItem(option.value) || { id: option.value, name: option.textContent, description: "" };
      if (item.name) localKeys.add(String(item.name).toUpperCase());
      appendIntegratedJiraPickerOption(config.list, item, { value: option.value, selected: option.value === config.select.value });
    });
    state.remote
      .filter((item) => item?.name && !localKeys.has(String(item.name).toUpperCase()))
      .forEach((item) => appendIntegratedJiraPickerOption(config.list, item, { remote: true }));
    if (!config.list.children.length) {
      const empty = document.createElement("div");
      empty.className = "jira-picker-empty";
      empty.textContent = "Aramanızla eşleşen JIRA maddesi bulunamadı.";
      config.list.append(empty);
    }
  }

  function filterIntegratedJiraOptions(kind, preferredValue = effortJiraPickerConfig(kind).select.value, statusMessage = "") {
    const config = effortJiraPickerConfig(kind);
    const state = effortJiraPickerSearchState[kind];
    const searchValue = config.search.value;
    const result = populateJiraSelect(config.select, false, searchValue, preferredValue);
    const remoteCount = state.remote.filter((remote) => !window.JiraStore.list().some((item) => item.name.toUpperCase() === String(remote.name || "").toUpperCase())).length;
    const hasSearch = Boolean(normalizeJiraSearch(searchValue));
    config.count.textContent = statusMessage || (hasSearch
      ? `${result.matchCount + remoteCount} eşleşme · ${remoteCount} JIRA’dan${result.retainedSelection ? " · seçili madde korunuyor" : ""}`
      : `${result.totalCount} kayıtlı JIRA maddesi`);
    config.count.classList.remove("is-error");
    renderIntegratedJiraOptionList(kind);
    updateIntegratedJiraPickerLabel(kind);
    return result;
  }

  function filterEffortJiraOptions(preferredValue = fields.jiraId.value) {
    return filterIntegratedJiraOptions("main", preferredValue);
  }

  function filterModalJiraOptions(preferredValue = $("#modalJiraInput").value) {
    return filterIntegratedJiraOptions("modal", preferredValue);
  }

  async function searchIntegratedJiraIssues(kind, query) {
    const config = effortJiraPickerConfig(kind);
    const state = effortJiraPickerSearchState[kind];
    const search = String(query || "").trim();
    const requestId = ++state.request;
    if (search.length < 2) {
      state.remote = [];
      filterIntegratedJiraOptions(kind);
      return;
    }
    filterIntegratedJiraOptions(kind, config.select.value, "JIRA’da Key ve Summary aranıyor…");
    try {
      const response = await window.JiraCloudClient.searchIssues(search);
      if (requestId !== state.request || config.search.value.trim() !== search) return;
      state.remote = Array.isArray(response.items) ? response.items : [];
      filterIntegratedJiraOptions(kind, config.select.value, `${state.remote.length} canlı JIRA sonucu bulundu.`);
    } catch (error) {
      if (requestId !== state.request) return;
      state.remote = [];
      filterIntegratedJiraOptions(kind, config.select.value, `JIRA araması yapılamadı: ${error.message}`);
      config.count.classList.add("is-error");
    }
  }

  function scheduleIntegratedJiraSearch(kind) {
    const config = effortJiraPickerConfig(kind);
    const state = effortJiraPickerSearchState[kind];
    window.clearTimeout(state.timer);
    state.remote = [];
    const query = config.search.value.trim();
    filterIntegratedJiraOptions(kind, config.select.value, query.length >= 2 ? "JIRA’da aranacak…" : "");
    state.timer = window.setTimeout(() => searchIntegratedJiraIssues(kind, query), 300);
  }

  async function selectRemoteJiraIssue(kind, issueKey) {
    const config = effortJiraPickerConfig(kind);
    const jiraSnapshot = window.JiraStore.list();
    const entrySnapshot = readEntries();
    config.count.textContent = `${issueKey} JIRA’dan alınıyor…`;
    try {
      const response = await window.JiraCloudClient.getIssue(issueKey);
      const result = window.JiraStore.mergeAll([response.item]);
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA maddesi kaydedilemedi.");
      relinkMergedJiraEntries(result.value.idRemap);
      const imported = window.JiraStore.list().find((item) => item.name.toUpperCase() === issueKey.toUpperCase());
      if (!imported) throw new Error("JIRA maddesi uygulama listesine eklenemedi.");
      renderJiraItems();
      render();
      if (!await waitForDataSaves()) {
        window.CloudDataRuntime.suspend(() => {
          window.JiraStore.replaceAll(jiraSnapshot);
          getStore()?.replaceAll?.(entrySnapshot);
        });
        renderJiraItems();
        render();
        throw new Error("Supabase kaydı tamamlanamadı; JIRA maddesi eklenmedi.");
      }
      effortJiraPickerSearchState[kind].remote = [];
      config.search.value = "";
      filterIntegratedJiraOptions(kind, imported.id, `${imported.name} seçildi.`);
      setIntegratedJiraPickerOpen(kind, false);
      config.trigger.focus();
    } catch (error) {
      config.count.textContent = `JIRA maddesi alınamadı: ${error.message}`;
      config.count.classList.add("is-error");
    }
  }

  function setJiraCloudStatus(message, state = "") {
    const status = $("#jiraCloudStatus");
    status.textContent = message;
    status.dataset.state = state;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-busy", state === "busy");
    refreshJiraHeaderMenu();
  }

  function refreshJiraHeaderMenu() {
    const menu = $("#jiraHeaderMenu");
    if (!menu) return;
    const supabaseMode = window.JiraCloudClient.usesSupabase();
    const connected = Boolean(jiraOAuthState?.connected);
    const configured = connected || jiraCredentialState === "configured" || (!supabaseMode && Boolean(jiraOAuthState?.configured));
    const error = jiraCredentialState === "error" || $("#jiraCloudStatus")?.dataset.state === "error";
    const busy = $("#jiraCloudStatus")?.dataset.state === "busy";
    const label = $("#headerJiraMenuLabel");
    const badge = $("#headerJiraMenuBadge");

    menu.classList.toggle("is-connected", configured && !error);
    menu.classList.toggle("is-error", error);
    menu.classList.toggle("is-busy", busy && !error);
    label.textContent = error
      ? "Bağlantıyı kontrol et"
      : connected
        ? "JIRA bağlı"
        : configured
          ? "Ayarlar aktif"
          : supabaseMode && !supabaseSession?.user
            ? "Bulut girişi gerekli"
            : "Kurulum gerekli";
    badge.classList.toggle("hidden", configured && !error);
    badge.textContent = error ? "Kontrol et" : "Ayarla";
  }

  function renderJiraOAuthState(state = jiraOAuthState) {
    const badge = $("#jiraOAuthBadge");
    const supabaseMode = window.JiraCloudClient.usesSupabase();
    const connectedWithOAuth = Boolean(state?.connected && state?.mode === "oauth");
    const connectedWithToken = Boolean(state?.connected && state?.mode === "api_token");
    badge.dataset.state = connectedWithOAuth || connectedWithToken ? "connected" : (state?.configured ? "disconnected" : "unconfigured");
    badge.textContent = connectedWithOAuth
      ? (state.account?.displayName || "JIRA bağlı")
      : (connectedWithToken ? "API token bağlı" : (state?.configured ? "Oturum kapalı" : "OAuth kurulumu gerekli"));
    $("#connectJiraOAuth").textContent = supabaseMode ? "JIRA bağlantısını ayarla" : "JIRA ile giriş yap";
    $("#connectJiraOAuth").classList.toggle("hidden", connectedWithOAuth || connectedWithToken);
    $("#connectJiraOAuth").disabled = !supabaseMode && !state?.configured;
    $("#disconnectJiraOAuth").classList.toggle("hidden", !connectedWithOAuth);
    refreshJiraHeaderMenu();
  }

  function consumeJiraOAuthResult() {
    const url = new URL(window.location.href);
    const success = url.searchParams.get("jiraAuth") === "success";
    const error = url.searchParams.get("jiraAuthError");
    if (!success && !error) return "";
    url.searchParams.delete("jiraAuth");
    url.searchParams.delete("jiraAuthError");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    if (error) setJiraCloudStatus(`JIRA girişi tamamlanamadı: ${error}`, "error");
    else setJiraCloudStatus("JIRA hesabınız başarıyla bağlandı.", "success");
    return error ? "error" : "success";
  }

  async function refreshJiraOAuthStatus(announce = false) {
    try {
      jiraOAuthState = await window.JiraCloudClient.getOAuthStatus();
      renderJiraOAuthState();
      if (announce) {
        if (jiraOAuthState.connected) {
          const label = jiraOAuthState.account?.displayName || "JIRA kullanıcısı";
          setJiraCloudStatus(`${label} hesabı ${jiraOAuthState.site || "JIRA"} ile bağlantılı.`, "success");
        } else if (jiraOAuthState.configured) {
          setJiraCloudStatus("JIRA verilerine erişmek için kendi hesabınızla giriş yapın.");
        } else {
          setJiraCloudStatus("Backend üzerinde JIRA OAuth Client ID, Client Secret ve callback adresi tanımlanmalı.", "error");
        }
      }
      return jiraOAuthState;
    } catch (error) {
      jiraOAuthState = { configured: false, connected: false, mode: "none" };
      renderJiraOAuthState();
      if (announce) setJiraCloudStatus(`JIRA oturum durumu alınamadı: ${error.message}`, "error");
      return jiraOAuthState;
    }
  }

  function setJiraCredentialStatus(message, state = "") {
    const status = $("#jiraCredentialStatus");
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
    const badge = $("#jiraCredentialBadge");
    jiraCredentialState = state === "success" ? "configured" : state === "error" ? "error" : "unconfigured";
    badge.dataset.state = jiraCredentialState;
    badge.textContent = state === "success" ? "Vault’ta kayıtlı" : state === "error" ? "Bağlantı hatası" : "Kayıt gerekli";
    refreshJiraHeaderMenu();
  }

  function setJiraCredentialBusy(busy) {
    $("#saveJiraCredentials").disabled = busy;
    $("#removeJiraCredentials").disabled = busy;
    $("#jiraHeaderMenu").classList.toggle("is-busy", busy);
  }

  async function refreshJiraCredentialStatus() {
    if (!window.JiraCloudClient.usesSupabase()) {
      jiraCredentialState = "local";
      $("#jiraCredentialBadge").dataset.state = "local";
      $("#jiraCredentialBadge").textContent = "Yerel backend";
      $("#removeJiraCredentials").classList.add("hidden");
      $("#jiraCredentialStatus").textContent = "Yerel backend otomatik seçildi. JIRA OAuth ayarları sunucudaki .env dosyasından okunur.";
      refreshJiraHeaderMenu();
      return { configured: false };
    }
    if (!supabaseSession?.user) {
      $("#removeJiraCredentials").classList.add("hidden");
      setJiraCredentialStatus("JIRA bağlantı bilgilerini görmek veya kaydetmek için önce Supabase hesabınıza giriş yapın.");
      return { configured: false };
    }
    try {
      const result = await window.JiraCloudClient.getCredentialStatus();
      if (!result.configured) {
        $("#removeJiraCredentials").classList.add("hidden");
        setJiraCredentialStatus("Bu Supabase hesabı için henüz JIRA bağlantısı kaydedilmedi.");
        return result;
      }
      $("#jiraCredentialBaseUrl").value = result.baseUrl || "https://fit-global.atlassian.net";
      $("#jiraCredentialEmail").value = result.email || "";
      $("#jiraCredentialToken").value = "";
      $("#removeJiraCredentials").classList.remove("hidden");
      const savedAt = result.updatedAt ? ` · ${dateTimeFormatter.format(new Date(result.updatedAt))}` : "";
      setJiraCredentialStatus(`Bağlantı Supabase Vault içinde şifreli olarak kayıtlı${savedAt}. Token tarayıcıya geri gönderilmez.`, "success");
      return result;
    } catch (error) {
      setJiraCredentialStatus(`JIRA bağlantı bilgileri alınamadı: ${error.message}`, "error");
      return { configured: false };
    }
  }

  async function saveJiraCredentials() {
    const baseUrl = $("#jiraCredentialBaseUrl").value.trim();
    const email = $("#jiraCredentialEmail").value.trim();
    const apiToken = $("#jiraCredentialToken").value.trim();
    if (!supabaseSession?.user) {
      $("#supabaseHeaderMenu").open = true;
      setJiraCredentialStatus("Önce Supabase hesabınıza giriş yapın.", "error");
      return;
    }
    if (!baseUrl || !email || !apiToken) {
      setJiraCredentialStatus("JIRA adresi, Atlassian e-postası ve API token zorunludur.", "error");
      return;
    }
    setJiraCredentialBusy(true);
    setJiraCredentialStatus("JIRA bağlantısı doğrulanıyor ve token Supabase Vault’a kaydediliyor…");
    try {
      window.JiraCloudClient.setEndpoint("supabase:jira-proxy");
      const result = await window.JiraCloudClient.saveCredentials({ baseUrl, email, apiToken });
      $("#jiraCredentialToken").value = "";
      await refreshJiraCredentialStatus();
      await refreshJiraOAuthStatus();
      setJiraCloudStatus(`${result.account?.displayName || email} hesabıyla JIRA bağlantısı hazır.`, "success");
    } catch (error) {
      setJiraCredentialStatus(`JIRA bağlantısı kaydedilemedi: ${error.message}`, "error");
    } finally {
      setJiraCredentialBusy(false);
    }
  }

  async function removeJiraCredentials() {
    if (!confirm("Supabase Vault’taki kişisel JIRA bağlantınız kaldırılsın mı?")) return;
    setJiraCredentialBusy(true);
    try {
      await window.JiraCloudClient.removeCredentials();
      $("#jiraCredentialEmail").value = "";
      $("#jiraCredentialToken").value = "";
      $("#removeJiraCredentials").classList.add("hidden");
      setJiraCredentialStatus("Kayıtlı JIRA bağlantısı kaldırıldı.");
      jiraOAuthState = { configured: false, connected: false, mode: "none" };
      renderJiraOAuthState();
    } catch (error) {
      setJiraCredentialStatus(`JIRA bağlantısı kaldırılamadı: ${error.message}`, "error");
    } finally {
      setJiraCredentialBusy(false);
    }
  }

  function setJiraCloudBusy(busy) {
    ["#testJiraConnection", "#syncJiraIssues", "#refreshJiraNavigator"].forEach((selector) => {
      const button = $(selector);
      if (button) button.disabled = busy;
    });
    refreshJiraHeaderMenu();
  }

  function setJiraNavigatorSyncStatus(message, state = "") {
    const status = $("#jiraNavigatorSyncStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  async function testJiraCloudConnection() {
    setJiraCloudBusy(true);
    setJiraCloudStatus("FIT Global JIRA bağlantısı test ediliyor…", "busy");
    try {
      const result = await window.JiraCloudClient.health();
      setJiraCloudStatus(`${result.account?.displayName || "JIRA kullanıcısı"} olarak ${result.site} bağlantısı başarılı.`, "success");
      return true;
    } catch (error) {
      setJiraCloudStatus(`JIRA bağlantısı kurulamadı: ${error.message}`, "error");
      return false;
    } finally {
      setJiraCloudBusy(false);
    }
  }

  async function syncJiraCloudIssues(options = {}) {
    const navigatorSync = options.navigator === true;
    const jql = String(options.jql || $("#jiraSyncJql").value || "").trim();
    setJiraCloudBusy(true);
    setJiraCloudStatus(navigatorSync ? "Worklog girilen JIRA maddeleri alınıyor…" : "JIRA maddeleri JQL ile alınıyor…", "busy");
    if (navigatorSync) setJiraNavigatorSyncStatus("JIRA worklog geçmişiniz taranıyor…", "busy");
    const snapshot = window.JiraStore.list();
    const entrySnapshot = readEntries();
    try {
      const response = await window.JiraCloudClient.syncIssues(jql, 1000);
      const result = window.JiraStore.mergeAll(response.items || []);
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA maddeleri birleştirilemedi.");
      const relinked = relinkMergedJiraEntries(result.value.idRemap);
      renderJiraItems();
      render();
      if (!await waitForDataSaves()) {
        window.CloudDataRuntime.suspend(() => {
          window.JiraStore.replaceAll(snapshot);
          getStore()?.replaceAll?.(entrySnapshot);
        });
        renderJiraItems();
        render();
        throw new Error("Supabase kaydı tamamlanamadı; önceki JIRA listesi geri yüklendi.");
      }
      const successMessage = `${result.value.imported} JIRA işlendi: ${result.value.created} yeni, ${result.value.updated} güncellenen${relinked ? `, ${relinked} efor yeniden bağlandı` : ""}.${response.truncated ? " Sonuç 1000 maddeyle sınırlandı." : ""}`;
      setJiraCloudStatus(successMessage, "success");
      if (navigatorSync) setJiraNavigatorSyncStatus(`Worklog geçmişi güncellendi · ${successMessage}`, "success");
      backupAndReport("JIRA Cloud senkronizasyonu Drive’a gönderildi.");
      return result.value;
    } catch (error) {
      setJiraCloudStatus(`JIRA senkronizasyonu başarısız: ${error.message}`, "error");
      if (navigatorSync) setJiraNavigatorSyncStatus(`Otomatik JIRA yenilemesi yapılamadı: ${error.message}`, "error");
      return null;
    } finally {
      setJiraCloudBusy(false);
    }
  }

  function refreshJiraNavigatorFromWorklogs() {
    if (window.JiraCloudClient.usesSupabase() && !supabaseSession) {
      setJiraNavigatorSyncStatus("JIRA maddelerini otomatik yenilemek için önce Supabase hesabınıza giriş yapın.", "idle");
      return Promise.resolve(null);
    }
    if (jiraNavigatorSyncPromise) return jiraNavigatorSyncPromise;
    jiraNavigatorSyncPromise = syncJiraCloudIssues({ jql: JIRA_WORKLOGGED_ISSUES_JQL, navigator: true })
      .finally(() => { jiraNavigatorSyncPromise = null; });
    return jiraNavigatorSyncPromise;
  }

  async function fetchJiraIssueByKey(issueKey, options = {}) {
    const key = String(issueKey || "").trim().toUpperCase();
    const submitButton = $("#jiraSubmitButton");
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) {
      $("#jiraFormMessage").textContent = "RD-179 gibi geçerli bir JIRA Key girin.";
      $("#jiraFormMessage").classList.remove("success");
      return null;
    }
    submitButton.disabled = true;
    $("#jiraSubmitLabel").textContent = "JIRA’dan alınıyor…";
    $("#jiraFormMessage").textContent = `${key} JIRA Cloud’dan alınıyor…`;
    $("#jiraFormMessage").classList.remove("success");
    try {
      const response = await window.JiraCloudClient.getIssue(key);
      const result = window.JiraStore.mergeAll([response.item]);
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA maddesi kaydedilemedi.");
      const relinked = relinkMergedJiraEntries(result.value.idRemap);
      if (!options.keepInput) jiraFields.name.value = "";
      renderJiraItems();
      render();
      const action = result.value.created ? "uygulamaya eklendi" : "JIRA’daki son bilgilerle güncellendi";
      $("#jiraFormMessage").textContent = `${response.item.name} · ${response.item.description} ${action}${relinked ? `; ${relinked} efor bağlantısı korundu` : ""}.`;
      $("#jiraFormMessage").classList.add("success");
      setJiraCloudStatus(`${response.item.name} JIRA Cloud’dan başarıyla alındı.`, "success");
      backupAndReport(`${response.item.name} JIRA maddesi Drive’a gönderildi.`);
      return response.item;
    } catch (error) {
      $("#jiraFormMessage").textContent = `${key} alınamadı: ${error.message}`;
      $("#jiraFormMessage").classList.remove("success");
      return null;
    } finally {
      submitButton.disabled = false;
      $("#jiraSubmitLabel").textContent = "JIRA’dan getir";
    }
  }

  function setTimesheetJiraSyncStatus(message, state = "") {
    const status = $("#timesheetJiraSyncStatus");
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-busy", state === "busy");
  }

  async function syncTimesheetJiraWorklogs() {
    const range = getTimesheetRange();
    if (!range) {
      setTimesheetJiraSyncStatus("Önce geçerli bir Timesheet tarih aralığı seçin.", "error");
      return null;
    }
    const button = $("#syncJiraWorklogs");
    const from = isoFromDate(range.start);
    const to = isoFromDate(range.end);
    button.disabled = true;
    setTimesheetJiraSyncStatus(`${from} – ${to} arasındaki JIRA eforlarınız alınıyor…`, "busy");
    try {
      const response = await window.JiraCloudClient.syncWorklogs(from, to);
      const issueResult = window.JiraStore.mergeAll(response.issues || []);
      if (!issueResult.valid) throw new Error(Object.values(issueResult.errors || {}).join(" ") || "JIRA maddeleri birleştirilemedi.");
      relinkMergedJiraEntries(issueResult.value.idRemap);
      const jiraByKey = new Map(window.JiraStore.list().map((item) => [String(item.name || "").toLocaleUpperCase("en-US"), item]));
      let skipped = 0;
      const worklogs = (response.items || []).flatMap((item) => {
        const jiraItem = jiraByKey.get(String(item.issueKey || "").toLocaleUpperCase("en-US"));
        const hours = Number(item.hours);
        if (!jiraItem || !item.worklogId || !item.date || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
          skipped += 1;
          return [];
        }
        return [{
          date: item.date,
          project: jiraItem.name,
          task: String(item.description || item.summary || "JIRA worklog").slice(0, 1000),
          jiraId: jiraItem.id,
          hours,
          notes: "",
          jiraWorklogId: String(item.worklogId),
          jiraWorklogIssueKey: jiraItem.name,
          jiraSyncStatus: "synced",
          jiraSyncDirection: "imported",
          jiraSyncError: "",
          jiraSyncedAt: item.updatedAt || new Date().toISOString(),
          createdAt: item.createdAt || undefined
        }];
      });
      const result = getStore().mergeJiraWorklogs(worklogs);
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA eforları birleştirilemedi.");
      renderJiraItems();
      render();
      const counts = result.value;
      const accountName = response.account?.displayName || "JIRA kullanıcısı";
      setTimesheetJiraSyncStatus(
        `${accountName}: ${counts.created} yeni, ${counts.updated} güncellenen, ${counts.unchanged} zaten güncel efor${counts.conflicts ? ` · ${counts.conflicts} yerel değişiklik çakışması korundu` : ""}${skipped ? ` · ${skipped} geçersiz kayıt atlandı` : ""}.`,
        "success"
      );
      if (counts.created || counts.updated) backupAndReport("JIRA’dan alınan eforlar Drive’a gönderildi.");
      return counts;
    } catch (error) {
      setTimesheetJiraSyncStatus(`JIRA eforları alınamadı: ${error.message}`, "error");
      return null;
    } finally {
      button.disabled = false;
    }
  }

  function updateEntryJiraSync(entryId, changes) {
    const store = getStore();
    const current = store?.get?.(entryId);
    if (!current) return null;
    return store.update(entryId, { ...current, ...changes });
  }

  async function syncEffortToJira(entry, previousEntry = null) {
    if (!$("#jiraAutoWorklog").checked) return { skipped: true };
    const jiraItem = getJiraItem(entry.jiraId);
    if (!jiraItem || jiraItem.id === DUMMY_JIRA.id || jiraItem.name === DUMMY_JIRA.name) return { skipped: true };
    const issueKey = jiraItem.name;
    let worklogId = previousEntry?.jiraWorklogId || entry.jiraWorklogId || "";
    const previousIssueKey = previousEntry?.jiraWorklogIssueKey || entry.jiraWorklogIssueKey || "";
    const movingWorklog = Boolean(worklogId && previousIssueKey && previousIssueKey !== issueKey);
    const approvalMessage = movingWorklog
      ? `${previousIssueKey} üzerindeki mevcut worklog silinip ${issueKey} maddesine ${numberFormatter.format(entry.hours)} saat olarak gönderilsin mi?`
      : `${issueKey} maddesindeki JIRA worklog ${worklogId ? "güncellensin" : "oluşturulsun"} mı?\n\nTarih: ${entry.date}\nSüre: ${numberFormatter.format(entry.hours)} saat\nAçıklama: ${entry.task || entry.description}`;
    if (!confirm(approvalMessage)) {
      updateEntryJiraSync(entry.id, { jiraSyncStatus: "pending", jiraSyncDirection: "pushed", jiraSyncError: "JIRA gönderimi kullanıcı onayı bekliyor." });
      setJiraCloudStatus(`${issueKey} eforu yerelde kaydedildi; JIRA gönderimi onaylanmadı.`, "busy");
      return { skipped: true, approvalDeclined: true };
    }
    updateEntryJiraSync(entry.id, { jiraSyncStatus: "pending", jiraSyncDirection: "pushed", jiraSyncError: "" });
    try {
      if (worklogId && previousIssueKey && previousIssueKey !== issueKey) {
        await window.JiraCloudClient.deleteWorklog(previousIssueKey, worklogId);
        worklogId = "";
      }
      const result = worklogId
        ? await window.JiraCloudClient.updateWorklog(entry, issueKey, worklogId)
        : await window.JiraCloudClient.createWorklog(entry, issueKey);
      updateEntryJiraSync(entry.id, {
        jiraWorklogId: result.worklogId,
        jiraWorklogIssueKey: issueKey,
        jiraSyncStatus: "synced",
        jiraSyncDirection: "pushed",
        jiraSyncError: "",
        jiraSyncedAt: new Date().toISOString()
      });
      setJiraCloudStatus(`${issueKey} için JIRA worklog’u güncellendi.`, "success");
      return { ok: true, worklogId: result.worklogId };
    } catch (error) {
      updateEntryJiraSync(entry.id, { jiraSyncStatus: "failed", jiraSyncDirection: "pushed", jiraSyncError: String(error.message || error).slice(0, 500) });
      setJiraCloudStatus(`Efor yerelde kaydedildi; JIRA worklog gönderilemedi: ${error.message}`, "error");
      return { ok: false, error };
    }
  }

  function updateEffortJiraPickerLabel() {
    updateIntegratedJiraPickerLabel("main");
  }

  function renderEffortJiraOptionList() {
    renderIntegratedJiraOptionList("main");
  }

  function setIntegratedJiraPickerOpen(kind, open) {
    const config = effortJiraPickerConfig(kind);
    const state = effortJiraPickerSearchState[kind];
    config.trigger.setAttribute("aria-expanded", String(open));
    config.dropdown.classList.toggle("hidden", !open);
    if (open) {
      filterIntegratedJiraOptions(kind);
      requestAnimationFrame(() => config.search.focus());
      return;
    }
    window.clearTimeout(state.timer);
    state.request += 1;
    state.remote = [];
    config.search.value = "";
    filterIntegratedJiraOptions(kind, config.select.value);
  }

  function setEffortJiraPickerOpen(open) {
    setIntegratedJiraPickerOpen("main", open);
  }

  function setModalJiraPickerOpen(open) {
    setIntegratedJiraPickerOpen("modal", open);
  }

  function getStore() {
    return window.effortStore || window.EffortStore || window.dataStore;
  }

  function readEntries() {
    const store = getStore();
    if (store?.list) return store.list();
    if (store?.getAll) return store.getAll();
    return [];
  }

  function saveEntry(entry) {
    const store = getStore();
    if (entry.id && store?.update) return store.update(entry.id, { ...(store.get?.(entry.id) || {}), ...entry });
    if (!entry.id && store?.create) return store.create(entry);
    if (!entry.id && store?.add) return store.add(entry);
    return { valid: false, errors: { store: "Supabase veri katmanı hazır değil." }, value: null };
  }

  function removeEntry(id) {
    const store = getStore();
    if (store?.remove) return store.remove(id);
    if (store?.delete) return store.delete(id);
    return false;
  }

  async function deleteEffortEntry(entry) {
    if (!entry) return false;
    const jiraItem = getJiraItem(entry.jiraId);
    if (!confirm(`“${jiraItem?.name || entry.project}” efor kaydı silinsin mi?`)) return false;
    removeEntry(entry.id);
    render();
    await waitForCloudSaves();
    if ($("#jiraAutoWorklog").checked && entry.jiraWorklogId && entry.jiraWorklogIssueKey) {
      if (!confirm(`${entry.jiraWorklogIssueKey} üzerindeki bağlı JIRA worklog da silinsin mi?`)) {
        setJiraCloudStatus("Yerel efor silindi; JIRA worklog kullanıcı tercihiyle korundu.", "busy");
        return true;
      }
      try {
        await window.JiraCloudClient.deleteWorklog(entry.jiraWorklogIssueKey, entry.jiraWorklogId);
        setJiraCloudStatus(`${entry.jiraWorklogIssueKey} worklog’u JIRA’dan silindi.`, "success");
      } catch (error) {
        setJiraCloudStatus(`Yerel efor silindi ancak JIRA worklog silinemedi: ${error.message}`, "error");
      }
    }
    return true;
  }

  function render() {
    entries = Array.from(readEntries() || []).sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    const filterDate = $("#filterDateInput").value;
    const visible = filterDate ? entries.filter((entry) => entry.date === filterDate) : entries;
    const dailyDate = filterDate || fields.date.value || isoToday();
    const dailyTotal = entries.filter((entry) => entry.date === dailyDate).reduce((sum, entry) => sum + Number(entry.hours), 0);
    const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const today = parseDate(isoToday());
    const weekStart = addDays(today, -((today.getDay() + 6) % 7));
    const weekEnd = addDays(weekStart, 6);
    const weekStartIso = isoFromDate(weekStart);
    const weekEndIso = isoFromDate(weekEnd);
    const monthStartIso = isoFromDate(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    const monthEndIso = isoFromDate(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12));
    const weekTotal = entries
      .filter((entry) => entry.date >= weekStartIso && entry.date <= weekEndIso)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);
    const monthTotal = entries
      .filter((entry) => entry.date >= monthStartIso && entry.date <= monthEndIso)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);

    $("#dailyTotal").textContent = `${formatRoundedHours(dailyTotal)} çalışma`;
    $(".summary-card.accent").classList.toggle("day-complete", dailyTotal >= 8);
    $("#dailyDays").textContent = formatEffortDays(dailyTotal);
    $("#effortWeekHours").textContent = `${formatRoundedHours(weekTotal)} toplam çalışma`;
    $("#effortWeekDays").textContent = formatEffortDays(weekTotal);
    $("#effortMonthHours").textContent = `${formatRoundedHours(monthTotal)} toplam çalışma`;
    $("#effortMonthDays").textContent = formatEffortDays(monthTotal);
    $("#grandTotal").textContent = `${formatRoundedHours(total)} toplam çalışma`;
    $("#effortTotalDays").textContent = formatEffortDays(total);
    $("#entryCount").textContent = String(entries.length);
    $("#selectedDateLabel").textContent = dateFormatter.format(parseDate(dailyDate));
    $("#emptyState").classList.toggle("hidden", visible.length > 0);

    const list = $("#entryList");
    list.replaceChildren();
    const groupedByDate = new Map();
    visible.forEach((entry) => {
      if (!groupedByDate.has(entry.date)) groupedByDate.set(entry.date, []);
      groupedByDate.get(entry.date).push(entry);
    });
    groupedByDate.forEach((dayEntries, dateValue) => {
      const dayGroup = document.createElement("section");
      dayGroup.className = "entry-day-group";
      const heading = document.createElement("header");
      heading.className = "entry-day-heading";
      const dateTitle = document.createElement("h3");
      dateTitle.textContent = dateFormatter.format(parseDate(dateValue));
      const daySummary = document.createElement("span");
      const dayTotal = dayEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
      const dayComplete = dayTotal >= 8;
      dayGroup.classList.toggle("day-complete", dayComplete);
      daySummary.textContent = dayComplete
        ? `✓ Tamamlandı · ${formatEffortDays(dayTotal)} · ${dayEntries.length} kayıt`
        : `${formatEffortDays(dayTotal)} · ${dayEntries.length} kayıt · ${formatRoundedHours(dayTotal)} detay`;
      heading.append(dateTitle, daySummary);
      const progress = document.createElement("div");
      progress.className = "day-progress";
      const progressValue = document.createElement("span");
      progressValue.style.width = `${Math.min((dayTotal / 8) * 100, 100)}%`;
      progress.append(progressValue);
      const dayItems = document.createElement("div");
      dayItems.className = "entry-day-items";
      dayEntries.forEach((entry) => {
        const card = $("#entryTemplate").content.firstElementChild.cloneNode(true);
        card.dataset.id = entry.id;
        const jiraItem = getJiraItem(entry.jiraId);
        card.querySelector("h3").textContent = jiraItem?.name || entry.project || "Eski efor kaydı";
        card.querySelector(".hours-badge").textContent = formatEffortDays(entry.hours);
        card.querySelector(".entry-jira-summary").textContent = jiraItem?.description || "JIRA summary bulunamadı";
        card.querySelector(".entry-effort-description").textContent = `Süre: ${formatRoundedHours(entry.hours)} · Efor açıklaması: ${entry.task || entry.description || "—"}`;
        const jiraLink = card.querySelector(".jira-entry-link");
        if (jiraItem?.url) {
          jiraLink.textContent = `${jiraItem.issueType || "Task"} · ${jiraItem.priority || "Öncelik yok"} · JIRA’da aç ↗`;
          jiraLink.href = jiraItem.url;
          jiraLink.classList.remove("hidden");
        }
        const worklogStatus = card.querySelector(".jira-worklog-status");
        {
          const displayStatus = entry.jiraSyncStatus === "synced" && entry.jiraSyncDirection === "imported" ? "imported" : (entry.jiraSyncStatus || "local");
          worklogStatus.dataset.status = displayStatus;
          const statusIcon = document.createElement("span");
          statusIcon.className = "jira-worklog-status-icon";
          statusIcon.setAttribute("aria-hidden", "true");
          statusIcon.textContent = ({ synced: "✓", imported: "↓", local: "○", pending: "↑", failed: "!" })[displayStatus] || "•";
          const statusText = document.createElement("span");
          statusText.textContent = ({ synced: "JIRA’ya gönderildi", imported: "JIRA’dan alındı", local: "JIRA’ya gönderilmedi", pending: "JIRA’ya gönderilmedi · onay bekliyor", failed: "JIRA gönderilemedi" })[displayStatus] || displayStatus;
          worklogStatus.replaceChildren(statusIcon, statusText);
          worklogStatus.setAttribute("aria-label", statusText.textContent);
          worklogStatus.title = entry.jiraSyncError || "";
          worklogStatus.classList.remove("hidden");
        }
        card.querySelector(".edit-button").addEventListener("click", () => openEffortEditModal([entry]));
        card.querySelector(".delete-button").addEventListener("click", () => deleteEffortEntry(entry));
        dayItems.append(card);
      });
      dayGroup.append(heading, progress, dayItems);
      list.append(dayGroup);
    });
    renderTimesheet();
    renderHomeDashboard();
  }

  function statusLabel(status) {
    return ({ planned: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı" })[status] || status;
  }

  function priorityLabel(priority) {
    return ({ high: "Yüksek", medium: "Orta", low: "Düşük" })[priority] || "Belirtilmedi";
  }

  function taskTypeLabel(taskType) {
    return ({
      standard: "Standart görev",
      architecture_roadmap: "Architecture Roadmap",
      meeting_organization: "Toplantı organizasyonu",
      management_request: "Yönetim talebi",
      other: "Diğer"
    })[taskType] || "Standart görev";
  }

  function taskPlanLabel(task) {
    return [task.year, task.quarter].filter(Boolean).join(" · ") || "Plan belirtilmedi";
  }

  function taskDueDateLabel(task, prefix = "") {
    return task.dueDate ? `${prefix}${dateFormatter.format(parseDate(task.dueDate))}` : `${prefix}Belirtilmedi`;
  }

  function getTaskParent(task, source = tasks) {
    if (task.parentTaskId) return source.find((item) => item.id === task.parentTaskId) || null;
    if (task.parentItem) return source.find((item) => item.id !== task.id && item.title === task.parentItem) || null;
    return null;
  }

  function orderTasksByHierarchy(source) {
    const byId = new Map(source.map((task) => [task.id, task]));
    const children = new Map();
    source.forEach((task) => {
      const parentId = task.parentTaskId && byId.has(task.parentTaskId) ? task.parentTaskId : "";
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(task);
    });
    const ordered = [];
    const visited = new Set();
    const append = (task, depth) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      ordered.push({ task, depth });
      (children.get(task.id) || []).forEach((child) => append(child, depth + 1));
    };
    (children.get("") || []).forEach((task) => append(task, 0));
    source.forEach((task) => append(task, 0));
    return ordered;
  }

  function taskDescendantIds(taskId, source = tasks) {
    const descendants = new Set();
    const collect = (parentId) => source.filter((task) => task.parentTaskId === parentId).forEach((child) => {
      if (descendants.has(child.id)) return;
      descendants.add(child.id);
      collect(child.id);
    });
    if (taskId) collect(taskId);
    return descendants;
  }

  function isTaskVisibleInTree(task, source = tasks) {
    const visited = new Set();
    let parent = getTaskParent(task, source);
    while (parent && !visited.has(parent.id)) {
      if (!expandedTaskIds.has(parent.id)) return false;
      visited.add(parent.id);
      parent = getTaskParent(parent, source);
    }
    return true;
  }

  function tasksForType(source, taskType) {
    if (!taskType) return source;
    const includedIds = new Set(source.filter((task) => (task.taskType || "standard") === taskType).map((task) => task.id));
    source.forEach((task) => {
      if (!includedIds.has(task.id)) return;
      const visited = new Set();
      let parent = getTaskParent(task, source);
      while (parent && !visited.has(parent.id)) {
        includedIds.add(parent.id);
        visited.add(parent.id);
        parent = getTaskParent(parent, source);
      }
    });
    return source.filter((task) => includedIds.has(task.id));
  }

  function groupTasksByType(source) {
    const typeOrder = window.TaskStore.TASK_TYPES || ["standard", "architecture_roadmap", "meeting_organization", "management_request", "other"];
    const groups = new Map();
    source.forEach((task) => {
      const taskType = task.taskType || "standard";
      if (!groups.has(taskType)) groups.set(taskType, []);
      groups.get(taskType).push(task);
    });
    return Array.from(groups, ([taskType, groupTasks]) => ({
      taskType,
      tasks: groupTasks,
      priorities: {
        high: groupTasks.filter((task) => task.priority === "high").length,
        medium: groupTasks.filter((task) => task.priority === "medium").length,
        low: groupTasks.filter((task) => task.priority === "low").length,
        none: groupTasks.filter((task) => !["high", "medium", "low"].includes(task.priority)).length
      }
    })).sort((a, b) => {
      const aIndex = typeOrder.indexOf(a.taskType);
      const bIndex = typeOrder.indexOf(b.taskType);
      return (aIndex < 0 ? typeOrder.length : aIndex) - (bIndex < 0 ? typeOrder.length : bIndex);
    });
  }

  function populateTaskParentOptions(excludedTaskId = "", selectedParentId = "") {
    const select = taskFields.parentTaskId;
    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "Ana görev yok — bağımsız görev";
    const excluded = taskDescendantIds(excludedTaskId);
    if (excludedTaskId) excluded.add(excludedTaskId);
    const options = [firstOption];
    orderTasksByHierarchy(tasks).forEach(({ task, depth }) => {
      if (excluded.has(task.id)) return;
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = `${"— ".repeat(Math.min(depth, 3))}${task.title}`;
      options.push(option);
    });
    select.replaceChildren(...options);
    select.value = options.some((option) => option.value === selectedParentId) ? selectedParentId : "";
  }

  function activateMainView(viewId) {
    const teamSubview = ["peopleView", "organizationView"].includes(viewId) ? viewId : "";
    const mainViewId = teamSubview ? "teamView" : viewId;
    document.querySelectorAll(".tab-button").forEach((button) => {
      const active = button.dataset.tab === mainViewId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".tab-view").forEach((view) => view.classList.toggle("hidden", view.id !== mainViewId));
    if (teamSubview) activateTeamSubview(teamSubview);
    if (mainViewId === "jiraView") activateJiraSubview("jiraItemsView");
  }

  function activateTeamSubview(viewId) {
    document.querySelectorAll(".team-subtab-button").forEach((button) => {
      const active = button.dataset.teamTab === viewId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".team-subview").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
    if (viewId === "organizationView") renderOrganization();
  }

  function activateJiraSubview(viewId) {
    document.querySelectorAll(".jira-subtab-button").forEach((button) => {
      const active = button.dataset.jiraTab === viewId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".jira-subview").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
    if (viewId === "jiraItemsView" && !$("#jiraView").classList.contains("hidden")) {
      scheduleJiraAutoFit();
      if (jiraAssigneeFilter) refreshSelectedJiraAssigneeIssues();
      else refreshJiraNavigatorFromWorklogs();
    }
  }

  function buildHomeEffortChartModel(dashboardEntries, today, period = homeEffortChartPeriod) {
    const dayNameFormatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
    const monthNameFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
    const todayIso = isoFromDate(today);
    const totalsByDate = new Map();
    dashboardEntries.forEach((entry) => {
      totalsByDate.set(entry.date, (totalsByDate.get(entry.date) || 0) + Number(entry.hours || 0));
    });

    if (period === "year") {
      const year = today.getFullYear();
      const totalsByMonth = new Map();
      dashboardEntries.forEach((entry) => {
        if (!String(entry.date || "").startsWith(`${year}-`)) return;
        const monthKey = String(entry.date).slice(0, 7);
        totalsByMonth.set(monthKey, (totalsByMonth.get(monthKey) || 0) + Number(entry.hours || 0));
      });
      const values = Array.from({ length: 12 }, (_, monthIndex) => {
        const date = new Date(year, monthIndex, 1, 12);
        const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
        const hours = totalsByMonth.get(key) || 0;
        return {
          date,
          hours,
          valueLabel: hours ? `${numberFormatter.format(hours)} sa` : "—",
          primaryLabel: monthNameFormatter.format(date).replace(".", ""),
          secondaryLabel: String(year),
          isCurrent: monthIndex === today.getMonth(),
          isComplete: false,
          title: `${monthNameFormatter.format(date)} ${year} · ${formatHours(hours)}`
        };
      });
      return { period, title: "Yıllık efor", eyebrow: "Aylık dağılım", ariaLabel: `${year} yılının aylara göre efor grafiği`, minimumMaximum: 1, values };
    }

    const monthMode = period === "month";
    const start = monthMode
      ? new Date(today.getFullYear(), today.getMonth(), 1, 12)
      : addDays(today, -((today.getDay() + 6) % 7));
    const length = monthMode
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0, 12).getDate()
      : 7;
    const values = Array.from({ length }, (_, index) => {
      const date = addDays(start, index);
      const iso = isoFromDate(date);
      const hours = totalsByDate.get(iso) || 0;
      return {
        date,
        hours,
        valueLabel: hours
          ? `${numberFormatter.format(hours)}${monthMode ? "" : " sa"}`
          : (monthMode ? "" : "—"),
        primaryLabel: monthMode ? String(date.getDate()).padStart(2, "0") : dayNameFormatter.format(date).replace(".", ""),
        secondaryLabel: monthMode ? dayNameFormatter.format(date).slice(0, 1) : String(date.getDate()).padStart(2, "0"),
        isCurrent: iso === todayIso,
        isComplete: hours >= 8,
        title: `${dateFormatter.format(date)} · ${formatHours(hours)}`
      };
    });
    return {
      period: monthMode ? "month" : "week",
      title: monthMode ? "Aylık efor" : "Haftalık efor",
      eyebrow: "Günlük dağılım",
      ariaLabel: monthMode
        ? `${monthNameFormatter.format(today)} ${today.getFullYear()} ayının günlere göre efor grafiği`
        : "Bu haftanın günlere göre efor grafiği",
      minimumMaximum: 8,
      values
    };
  }

  function renderHomeDashboard() {
    const dashboardEntries = Array.from(readEntries() || []);
    const dashboardTasks = window.TaskStore.list();
    const today = parseDate(isoToday());
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const sunday = addDays(monday, 6);
    const mondayIso = isoFromDate(monday);
    const sundayIso = isoFromDate(sunday);
    const weeklyEntries = dashboardEntries.filter((entry) => entry.date >= mondayIso && entry.date <= sundayIso);
    const weeklyHours = weeklyEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const plannedTasks = dashboardTasks.filter((task) => task.status === "planned");
    const inProgressTasks = dashboardTasks.filter((task) => task.status === "in_progress");
    const completedTasks = dashboardTasks.filter((task) => task.status === "completed");

    $("#homeWeekLabel").textContent = `${dateFormatter.format(monday)} – ${dateFormatter.format(sunday)}`;
    $("#homeWeeklyHours").textContent = formatHours(weeklyHours);
    $("#homeWeeklyEntryCount").textContent = String(weeklyEntries.length);
    $("#homePlannedTasks").textContent = String(plannedTasks.length);
    $("#homeInProgressTasks").textContent = String(inProgressTasks.length);
    $("#homeWeeklyGoal").textContent = `40 saatlik hedefin %${Math.round((weeklyHours / 40) * 100)}’si`;

    const weeklyChart = $("#weeklyEffortChart");
    weeklyChart.replaceChildren();
    const effortChart = buildHomeEffortChartModel(dashboardEntries, today);
    $("#weeklyEffortEyebrow").textContent = effortChart.eyebrow;
    $("#weeklyEffortTitle").textContent = effortChart.title;
    weeklyChart.dataset.period = effortChart.period;
    weeklyChart.style.setProperty("--chart-columns", String(effortChart.values.length));
    weeklyChart.setAttribute("aria-label", effortChart.ariaLabel);
    document.querySelectorAll("[data-effort-chart-period]").forEach((button) => {
      const active = button.dataset.effortChartPeriod === effortChart.period;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const chartMaximum = Math.max(effortChart.minimumMaximum, ...effortChart.values.map((item) => item.hours));
    effortChart.values.forEach((item) => {
      const column = document.createElement("div");
      column.className = "weekly-bar-column";
      if (item.isCurrent) column.classList.add("is-today");
      const value = document.createElement("span");
      value.className = "weekly-bar-value";
      value.textContent = item.valueLabel;
      const track = document.createElement("div");
      track.className = "weekly-bar-track";
      const bar = document.createElement("span");
      bar.style.height = `${item.hours ? Math.max(7, (item.hours / chartMaximum) * 100) : 0}%`;
      bar.classList.toggle("day-complete", item.isComplete);
      bar.title = item.title;
      track.append(bar);
      const dayName = document.createElement("strong");
      dayName.textContent = item.primaryLabel;
      const dayNumber = document.createElement("small");
      dayNumber.textContent = item.secondaryLabel;
      column.append(value, track, dayName, dayNumber);
      weeklyChart.append(column);
    });

    const taskChart = $("#taskStatusChart");
    taskChart.replaceChildren();
    const taskTotal = dashboardTasks.length;
    const plannedEnd = taskTotal ? (plannedTasks.length / taskTotal) * 100 : 0;
    const progressEnd = taskTotal ? plannedEnd + (inProgressTasks.length / taskTotal) * 100 : 0;
    const donut = document.createElement("div");
    donut.className = "task-donut";
    donut.style.background = taskTotal
      ? `conic-gradient(#f2b84b 0 ${plannedEnd}%, #5146e5 ${plannedEnd}% ${progressEnd}%, #1f9d74 ${progressEnd}% 100%)`
      : "#edf0f5";
    donut.setAttribute("aria-hidden", "true");
    const donutCenter = document.createElement("span");
    const donutTotal = document.createElement("strong");
    donutTotal.textContent = String(taskTotal);
    const donutLabel = document.createElement("small");
    donutLabel.textContent = "toplam";
    donutCenter.append(donutTotal, donutLabel);
    donut.append(donutCenter);
    const legend = document.createElement("div");
    legend.className = "task-chart-legend";
    [
      ["planned", "Planlandı", plannedTasks.length],
      ["in_progress", "Devam ediyor", inProgressTasks.length],
      ["completed", "Tamamlandı", completedTasks.length]
    ].forEach(([status, label, count]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "task-chart-legend-item";
      item.dataset.status = status;
      item.setAttribute("aria-label", `${label}: ${count} görev. Bu görevleri aç`);
      const dot = document.createElement("i");
      const text = document.createElement("span");
      text.textContent = label;
      const total = document.createElement("strong");
      total.textContent = String(count);
      item.append(dot, text, total);
      item.addEventListener("click", () => openTasksByStatus(status));
      legend.append(item);
    });
    taskChart.append(donut, legend);

    const jiraTotals = new Map();
    weeklyEntries.forEach((entry) => {
      const jiraItem = getJiraItem(entry.jiraId);
      const key = jiraItem?.name || entry.project || "JIRA yok";
      const summary = jiraItem?.description || "Eski efor kaydı";
      const current = jiraTotals.get(key) || { key, summary, hours: 0 };
      current.hours += Number(entry.hours || 0);
      jiraTotals.set(key, current);
    });
    const jiraRows = Array.from(jiraTotals.values()).sort((a, b) => b.hours - a.hours).slice(0, 5);
    const jiraChart = $("#jiraEffortChart");
    jiraChart.replaceChildren();
    if (!jiraRows.length) {
      const empty = document.createElement("p");
      empty.className = "dashboard-empty";
      empty.textContent = "Bu hafta için henüz JIRA eforu girilmedi.";
      jiraChart.append(empty);
    } else {
      const maximumJiraHours = Math.max(...jiraRows.map((row) => row.hours));
      jiraRows.forEach((row) => {
        const item = document.createElement("div");
        item.className = "jira-effort-row";
        const label = document.createElement("div");
        const key = document.createElement("strong");
        key.textContent = row.key;
        const summary = document.createElement("span");
        summary.textContent = row.summary;
        label.append(key, summary);
        const hours = document.createElement("strong");
        hours.className = "jira-effort-hours";
        hours.textContent = formatHours(row.hours);
        const track = document.createElement("div");
        track.className = "jira-effort-track";
        const fill = document.createElement("span");
        fill.style.width = `${(row.hours / maximumJiraHours) * 100}%`;
        track.append(fill);
        item.append(label, hours, track);
        jiraChart.append(item);
      });
    }

    const openTasks = dashboardTasks.filter((task) => task.status !== "completed").slice(0, 5);
    $("#homeOpenTaskCount").textContent = `${dashboardTasks.filter((task) => task.status !== "completed").length} açık`;
    const taskList = $("#homePendingTaskList");
    taskList.replaceChildren();
    if (!openTasks.length) {
      const empty = document.createElement("p");
      empty.className = "dashboard-empty";
      empty.textContent = "Bekleyen veya devam eden görev bulunmuyor.";
      taskList.append(empty);
    } else {
      openTasks.forEach((task) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "home-task-row";
        const status = document.createElement("span");
        status.className = "task-status";
        status.dataset.status = task.status;
        status.textContent = statusLabel(task.status);
        const title = document.createElement("strong");
        title.textContent = task.title;
        const dueDate = document.createElement("time");
        if (task.dueDate) dueDate.dateTime = task.dueDate;
        dueDate.textContent = task.dueDate ? dateFormatter.format(parseDate(task.dueDate)) : taskPlanLabel(task);
        button.append(status, title, dueDate);
        button.addEventListener("click", () => {
          activateMainView("tasksView");
          showTaskDetail(task);
        });
        taskList.append(button);
      });
    }
    renderReminders();
  }

  function reminderDateLabel(item) {
    if (!item.remindAt) return "Hatırlatma zamanı yok";
    const date = new Date(item.remindAt);
    const formatted = dateTimeFormatter.format(date);
    return !item.completed && date.getTime() < Date.now() ? `Gecikti · ${formatted}` : formatted;
  }

  function resetReminderForm() {
    reminderForm.reset();
    reminderFields.id.value = "";
    reminderFields.importance.value = "normal";
    $("#reminderOptions").open = false;
    $("#reminderSubmitLabel").textContent = "Kaydet";
    $("#reminderModalTitle").textContent = "Yeni hatırlatma ekle";
    $("#reminderFormMessage").textContent = "";
    $("#reminderFormMessage").classList.remove("success");
  }

  function startReminderEdit(item) {
    reminderFields.id.value = item.id;
    reminderFields.text.value = item.text;
    reminderFields.remindAt.value = item.remindAt || "";
    reminderFields.importance.value = item.importance || "normal";
    $("#reminderOptions").open = Boolean(item.remindAt || item.importance === "important");
    $("#reminderSubmitLabel").textContent = "Güncelle";
    $("#reminderModalTitle").textContent = "Hatırlatmayı düzenle";
    if (!$("#reminderModal").open) $("#reminderModal").showModal();
    reminderFields.text.focus();
  }

  function openReminderCreateModal() {
    resetReminderForm();
    $("#reminderModal").showModal();
    reminderFields.text.focus();
  }

  function closeReminderModal() {
    if ($("#reminderModal").open) $("#reminderModal").close();
    resetReminderForm();
  }

  function renderReminders() {
    const reminders = window.ReminderStore.list();
    const activeCount = reminders.filter((item) => !item.completed).length;
    $("#reminderOpenCount").textContent = `${activeCount} aktif`;
    $("#reminderEmptyState").classList.toggle("hidden", reminders.length > 0);
    const list = $("#reminderList");
    list.replaceChildren();
    reminders.forEach((item) => {
      const row = document.createElement("article");
      row.className = "reminder-row";
      row.classList.toggle("is-completed", item.completed);
      row.classList.toggle("is-important", item.importance === "important");
      row.classList.toggle("is-overdue", Boolean(item.remindAt) && !item.completed && new Date(item.remindAt).getTime() < Date.now());

      const complete = document.createElement("button");
      complete.type = "button";
      complete.className = "reminder-complete-button";
      complete.textContent = item.completed ? "✓" : "";
      complete.setAttribute("aria-label", item.completed ? "Hatırlatmayı yeniden aç" : "Hatırlatmayı tamamla");
      complete.addEventListener("click", () => {
        window.ReminderStore.update(item.id, { ...item, completed: !item.completed });
        renderReminders();
        backupAndReport("Hatırlatma durumu Drive’a gönderildi.");
      });

      const content = document.createElement("div");
      content.className = "reminder-row-content";
      const text = document.createElement("strong");
      text.textContent = item.text;
      const meta = document.createElement("div");
      const importance = document.createElement("span");
      importance.className = "reminder-importance";
      importance.dataset.importance = item.importance;
      importance.textContent = item.importance === "important" ? "Önemli" : "Normal";
      const time = document.createElement("time");
      if (item.remindAt) time.dateTime = item.remindAt;
      time.textContent = reminderDateLabel(item);
      meta.append(importance, time);
      content.append(text, meta);

      const actions = document.createElement("div");
      actions.className = "reminder-row-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button secondary";
      edit.textContent = "Düzenle";
      edit.addEventListener("click", () => startReminderEdit(item));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button danger-text";
      remove.textContent = "Sil";
      remove.addEventListener("click", () => {
        if (!confirm(`“${item.text}” notu silinsin mi?`)) return;
        window.ReminderStore.remove(item.id);
        if (reminderFields.id.value === item.id) resetReminderForm();
        renderReminders();
        backupAndReport("Silinen hatırlatma Drive’a gönderildi.");
      });
      actions.append(edit, remove);
      row.append(complete, content, actions);
      list.append(row);
    });
    list.classList.toggle("is-ticker", reminders.length > 1);
    list.style.setProperty("--reminder-count", String(reminders.length));
    if (reminders.length > 1) {
      [...list.children].forEach((row) => {
        const clone = row.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.inert = true;
        list.append(clone);
      });
    }
  }

  function setCalendarStatus(message, state = "") {
    const status = $("#outlookCalendarStatus");
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-busy", state === "busy");
  }

  function calendarProviderClient(provider = activeCalendarProvider) {
    return provider === "google" ? window.GoogleCalendar : window.OutlookCalendar;
  }

  function calendarProviderLabel(provider = activeCalendarProvider) {
    return provider === "google" ? "Google Takvim" : "Outlook";
  }

  function isCalendarConnected(provider = activeCalendarProvider) {
    return provider === "google"
      ? Boolean(window.GoogleCalendar?.hasAccessToken())
      : Boolean(window.OutlookCalendar?.getAccount());
  }

  function setCalendarConnection(account = null, busy = false) {
    const connected = activeCalendarProvider === "google" ? isCalendarConnected() : Boolean(account);
    const badge = $("#outlookCalendarConnection");
    badge.dataset.state = busy ? "busy" : (connected ? "connected" : "disconnected");
    badge.textContent = busy ? "Bağlanıyor…" : (account?.username || account?.name || (connected ? "Bağlı" : "Bağlı değil"));
    $("#connectOutlookCalendar").classList.toggle("hidden", connected);
    $("#disconnectOutlookCalendar").classList.toggle("hidden", !connected);
    $("#refreshOutlookCalendar").disabled = !connected || busy;
  }

  function outlookEventDate(dateTimeValue, timeZone = "") {
    let value = String(dateTimeValue || "").replace(/\.(\d{3})\d+/, ".$1");
    if (String(timeZone).toUpperCase() === "UTC" && value && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) value += "Z";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function normalizeCalendarEvent(event, provider = activeCalendarProvider) {
    if (provider === "google") {
      return {
        id: event.id,
        subject: event.summary || "Başlıksız etkinlik",
        bodyPreview: event.description || "Google Takvim etkinliği",
        start: event.start?.dateTime
          ? { dateTime: event.start.dateTime, timeZone: event.start.timeZone }
          : { dateTime: `${event.start?.date || ""}T00:00:00`, timeZone: "" },
        end: event.end?.dateTime
          ? { dateTime: event.end.dateTime, timeZone: event.end.timeZone }
          : { dateTime: `${event.end?.date || event.start?.date || ""}T00:00:00`, timeZone: "" },
        isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
        location: { displayName: event.location || "" },
        webLink: event.htmlLink || "",
        provider: "google"
      };
    }
    return { ...event, provider: "outlook" };
  }

  function renderCalendar() {
    const calendar = $("#outlookCalendarList");
    calendar.replaceChildren();
    const range = updateCalendarPeriod();
    const eventGroups = new Map();
    calendarEvents.forEach((event) => {
      const start = outlookEventDate(event.start?.dateTime, event.start?.timeZone);
      if (!start) return;
      const key = isoFromDate(start);
      if (!eventGroups.has(key)) eventGroups.set(key, []);
      eventGroups.get(key).push({ event, start, end: outlookEventDate(event.end?.dateTime, event.end?.timeZone) });
    });
    eventGroups.forEach((events) => events.sort((left, right) => left.start - right.start));

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "calendar-weekday-row";
    weekdayRow.setAttribute("role", "row");
    ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].forEach((label, index) => {
      const weekday = document.createElement("span");
      weekday.className = "calendar-weekday";
      weekday.setAttribute("role", "columnheader");
      weekday.classList.toggle("is-weekend", index > 4);
      weekday.textContent = label;
      weekdayRow.append(weekday);
    });
    calendar.append(weekdayRow);

    const grid = document.createElement("div");
    grid.className = "calendar-date-grid";
    grid.setAttribute("role", "rowgroup");
    const todayIso = isoToday();
    let visibleMonthEventCount = 0;
    for (let index = 0; index < 42; index += 1) {
      const date = addDays(range.start, index);
      const dateKey = isoFromDate(date);
      const dayEvents = eventGroups.get(dateKey) || [];
      const inCurrentMonth = date.getMonth() === calendarViewDate.getMonth() && date.getFullYear() === calendarViewDate.getFullYear();
      if (inCurrentMonth) visibleMonthEventCount += dayEvents.length;

      const cell = document.createElement("div");
      cell.className = "calendar-day-cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `${dateFormatter.format(date)}${dayEvents.length ? `, ${dayEvents.length} etkinlik` : ", etkinlik yok"}`);
      cell.classList.toggle("is-outside-month", !inCurrentMonth);
      cell.classList.toggle("is-weekend", date.getDay() === 0 || date.getDay() === 6);
      cell.classList.toggle("is-today", dateKey === todayIso);

      const dayNumber = document.createElement("time");
      dayNumber.className = "calendar-day-number";
      dayNumber.dateTime = dateKey;
      dayNumber.textContent = String(date.getDate());
      cell.append(dayNumber);

      const eventList = document.createElement("div");
      eventList.className = "calendar-day-events";
      dayEvents.slice(0, 2).forEach(({ event, start }) => {
        const row = event.webLink ? document.createElement("a") : document.createElement("span");
        row.className = "calendar-event-chip";
        row.dataset.provider = event.provider || activeCalendarProvider;
        if (event.webLink) {
          row.href = event.webLink;
          row.target = "_blank";
          row.rel = "noopener noreferrer";
        }
        const timeLabel = event.isAllDay ? "Tüm gün" : start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        row.title = `${timeLabel} · ${event.subject || "Başlıksız etkinlik"}${event.location?.displayName ? ` · ${event.location.displayName}` : ""}`;
        const time = document.createElement("small");
        time.textContent = timeLabel;
        const subject = document.createElement("strong");
        subject.textContent = event.subject || "Başlıksız etkinlik";
        row.append(time, subject);
        eventList.append(row);
      });
      if (dayEvents.length > 2) {
        const more = document.createElement("span");
        more.className = "calendar-event-more";
        more.textContent = `+${dayEvents.length - 2} etkinlik`;
        eventList.append(more);
      }
      cell.append(eventList);
      grid.append(cell);
    }
    calendar.append(grid);
    $("#outlookCalendarEmpty").classList.toggle("hidden", visibleMonthEventCount > 0);
  }

  function updateCalendarPeriod() {
    const monthStart = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1, 12);
    const leadingDays = (monthStart.getDay() + 6) % 7;
    const start = addDays(monthStart, -leadingDays);
    const end = addDays(start, 42);
    const monthLabel = calendarMonthFormatter.format(monthStart);
    $("#outlookCalendarPeriod").textContent = monthLabel.charAt(0).toLocaleUpperCase("tr-TR") + monthLabel.slice(1);
    return { start, end, days: 42, monthLabel };
  }

  async function changeCalendarMonth(offset = 0, returnToToday = false) {
    const base = returnToToday ? new Date() : calendarViewDate;
    calendarViewDate = new Date(base.getFullYear(), base.getMonth() + (returnToToday ? 0 : offset), 1, 12);
    calendarEvents = [];
    renderCalendar();
    if (isCalendarConnected()) await refreshCalendar();
    else setCalendarStatus(`${calendarMonthFormatter.format(calendarViewDate)} etkinliklerini görmek için ${calendarProviderLabel()} hesabınızla bağlanın.`);
  }

  async function refreshCalendar() {
    const client = calendarProviderClient();
    const account = activeCalendarProvider === "outlook" ? client.getAccount() : null;
    if (!isCalendarConnected()) {
      await connectCalendar();
      return;
    }
    const range = updateCalendarPeriod();
    setCalendarConnection(account, true);
    setCalendarStatus(`${range.monthLabel} ${calendarProviderLabel()} etkinlikleri alınıyor…`, "busy");
    try {
      const rawEvents = await client.fetchCalendarView(range.start, range.end);
      calendarEvents = rawEvents.map((event) => normalizeCalendarEvent(event));
      renderCalendar();
      const accountLabel = account?.username || account?.name;
      setCalendarStatus(`${accountLabel ? `${accountLabel}: ` : ""}${range.monthLabel} için ${calendarEvents.length} etkinlik gösteriliyor.`, "success");
    } catch (error) {
      setCalendarStatus(`${calendarProviderLabel()} alınamadı: ${error.message}`, "error");
    } finally {
      const latestAccount = activeCalendarProvider === "outlook" ? window.OutlookCalendar.getAccount() : null;
      setCalendarConnection(latestAccount);
    }
  }

  async function connectCalendar() {
    const client = calendarProviderClient();
    if (activeCalendarProvider === "outlook") {
      const settings = client.getSettings();
      if (!settings.clientId) {
        $("#outlookCalendarSettings").open = true;
        setCalendarStatus("Önce Microsoft Application (client) ID ve Tenant ID bilgilerini kaydedin.", "error");
        $("#outlookClientId").focus();
        return;
      }
    } else if (!client.getClientId()) {
      $("#googleCalendarSettings").open = true;
      setCalendarStatus("Önce ana menüdeki Google Drive ayarlarından OAuth Client ID’nizi kaydedin.", "error");
      return;
    }
    setCalendarConnection(null, true);
    setCalendarStatus(`${calendarProviderLabel()} oturum açma penceresi hazırlanıyor…`, "busy");
    try {
      const account = activeCalendarProvider === "google" ? (await client.authorize(), null) : await client.signIn();
      setCalendarConnection(account);
      if (isCalendarConnected()) await refreshCalendar();
    } catch (error) {
      setCalendarConnection(null);
      setCalendarStatus(`${calendarProviderLabel()} bağlantısı kurulamadı: ${error.message}`, "error");
    }
  }

  function updateCalendarProviderUi() {
    document.querySelectorAll("[data-calendar-provider]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.calendarProvider === activeCalendarProvider));
    });
    $("#outlookCalendarSettings").classList.toggle("hidden", activeCalendarProvider !== "outlook");
    $("#googleCalendarSettings").classList.toggle("hidden", activeCalendarProvider !== "google");
    $("#connectOutlookCalendar").textContent = activeCalendarProvider === "google" ? "Google’a bağlan" : "Outlook’a bağlan";
    $("#outlookCalendarEmpty").textContent = `Bu ay ${calendarProviderLabel()} etkinliği bulunmuyor.`;
    const googleConfigured = Boolean(window.GoogleCalendar?.getClientId());
    $("#googleCalendarClientState").textContent = googleConfigured
      ? "Google OAuth Client ID hazır."
      : "Google OAuth Client ID henüz kaydedilmedi.";
    setCalendarConnection(activeCalendarProvider === "outlook" ? window.OutlookCalendar.getAccount() : null);
  }

  async function selectCalendarProvider(provider) {
    // CALENDAR_PROVIDER_KEY tarayıcı kaydı yerine kullanıcı tercihi Supabase'e yazılır.
    if (!['google', 'outlook'].includes(provider) || provider === activeCalendarProvider) return;
    activeCalendarProvider = provider;
    await queueCloudUserSettings({ calendarProvider: provider });
    calendarEvents = [];
    renderCalendar();
    updateCalendarProviderUi();
    updateCalendarPeriod();
    if (isCalendarConnected()) await refreshCalendar();
    else setCalendarStatus(`${calendarProviderLabel()} etkinliklerini görmek için hesabınızla bağlanın.`);
  }

  async function initializeCalendar() {
    const settings = window.OutlookCalendar.getSettings();
    $("#outlookClientId").value = settings.clientId;
    $("#outlookTenantId").value = settings.tenantId;
    $("#outlookRedirectUri").textContent = window.OutlookCalendar.getRedirectUri();
    window.GoogleCalendar.initialize();
    updateCalendarPeriod();
    renderCalendar();
    updateCalendarProviderUi();

    if (activeCalendarProvider === "google") {
      setCalendarStatus(window.GoogleCalendar.getClientId()
        ? "Google Takvim etkinliklerini görmek için hesabınızla bağlanın."
        : "Google OAuth Client ID’nizi ana menüdeki Google Drive ayarlarından kaydedin.");
      return;
    }
    if (!settings.clientId) {
      setCalendarStatus("Outlook etkinliklerini görmek için önce bağlantı ayarlarını kaydedin.");
      return;
    }
    setCalendarConnection(null, true);
    try {
      const state = await window.OutlookCalendar.initialize();
      setCalendarConnection(state.account);
      if (state.account) await refreshCalendar();
      else setCalendarStatus("Outlook takviminizi görmek için hesabınızla bağlanın.");
    } catch (error) {
      setCalendarConnection(null);
      setCalendarStatus(`Outlook başlatılamadı: ${error.message}`, "error");
    }
  }

  function buildAiAssistantContext() {
    const allEntries = Array.from(readEntries() || []);
    const allTasks = window.TaskStore.list();
    const allJiraItems = window.JiraStore.list();
    const allReminders = window.ReminderStore.list();
    const today = parseDate(isoToday());
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const sunday = addDays(monday, 6);
    const mondayIso = isoFromDate(monday);
    const sundayIso = isoFromDate(sunday);
    const weeklyEntries = allEntries.filter((entry) => entry.date >= mondayIso && entry.date <= sundayIso);
    const weeklyHours = weeklyEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const jiraById = new Map(allJiraItems.map((item) => [item.id, item]));
    const simplifyEntry = (entry) => {
      const jira = jiraById.get(entry.jiraId);
      return {
        date: entry.date,
        hours: Number(entry.hours || 0),
        jiraKey: jira?.name || entry.project || "JIRA-YOK",
        jiraSummary: jira?.description || "JIRA atanmamış",
        description: entry.task || entry.description || ""
      };
    };
    return {
      generatedAt: new Date().toISOString(),
      today: isoToday(),
      overview: {
        weeklyRange: { from: mondayIso, to: sundayIso },
        weeklyHours,
        weeklyEntryCount: weeklyEntries.length,
        totalEffortCount: allEntries.length,
        taskCounts: {
          planned: allTasks.filter((task) => task.status === "planned").length,
          inProgress: allTasks.filter((task) => task.status === "in_progress").length,
          completed: allTasks.filter((task) => task.status === "completed").length
        },
        activeReminderCount: allReminders.filter((item) => !item.completed).length
      },
      weeklyEfforts: weeklyEntries.map(simplifyEntry),
      recentEfforts: allEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80).map(simplifyEntry),
      tasks: allTasks.slice(0, 120).map((task) => ({
        title: task.title,
        parentItem: task.parentItem || "",
        type: task.taskType,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        year: task.year,
        quarter: task.quarter,
        dueDate: task.dueDate
      })),
      jiraItems: allJiraItems.slice(0, 160).map((item) => ({
        key: item.name,
        summary: item.description,
        type: item.issueType,
        priority: item.priority,
        status: item.status,
        assignee: item.assignee,
        dueDate: item.dueDate
      })),
      reminders: allReminders.slice(0, 100).map((item) => ({
        text: item.text,
        remindAt: item.remindAt,
        importance: item.importance,
        completed: item.completed
      })),
      truncation: {
        effortsIncluded: Math.min(allEntries.length, 80),
        tasksIncluded: Math.min(allTasks.length, 120),
        jiraItemsIncluded: Math.min(allJiraItems.length, 160),
        remindersIncluded: Math.min(allReminders.length, 100)
      }
    };
  }

  function addAiAssistantMessage(role, text) {
    const article = document.createElement("article");
    article.className = `ai-message ${role}`;
    const label = document.createElement("strong");
    label.textContent = role === "user" ? "Siz" : "AI Asistan";
    const content = document.createElement("p");
    content.textContent = text;
    article.append(label, content);
    $("#aiAssistantMessages").append(article);
    article.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function setAiAssistantBusy(busy, statusText) {
    aiRequestPending = busy;
    $("#sendAiAssistantMessage").disabled = busy;
    $("#aiAssistantInput").disabled = busy;
    $("#aiAssistantStatus").textContent = statusText || (busy ? "Uygulama verileri analiz ediliyor…" : "Uygulama verileriyle yanıt vermeye hazır");
    $("#aiAssistantPanel").classList.toggle("is-busy", busy);
  }

  async function askAiAssistant(message) {
    const question = String(message || "").trim();
    if (!question || aiRequestPending) return;
    addAiAssistantMessage("user", question);
    $("#aiAssistantInput").value = "";
    $("#aiAssistantInputCount").textContent = "0";
    setAiAssistantBusy(true);
    try {
      const result = await window.AiAssistantClient.ask({
        message: question,
        context: buildAiAssistantContext(),
        history: aiConversation
      });
      addAiAssistantMessage("assistant", result.answer);
      aiConversation.push({ role: "user", text: question }, { role: "assistant", text: result.answer });
      aiConversation = aiConversation.slice(-8);
      setAiAssistantBusy(false, `${result.model || "OpenAI"} ile yanıtlandı`);
    } catch (error) {
      addAiAssistantMessage("assistant", `Bağlantı hatası: ${error.message}`);
      setAiAssistantBusy(false, "AI servisine bağlanılamadı");
    }
  }

  function setAiAssistantPanel(open) {
    $("#aiAssistantPanel").classList.toggle("hidden", !open);
    $("#openAiAssistant").setAttribute("aria-expanded", String(open));
    if (open) {
      $("#aiAssistantEndpoint").value = window.AiAssistantClient.getEndpoint();
      $("#aiAssistantInput").focus();
    }
  }

  function activateTaskSubview(viewId) {
    const activeTabId = viewId === "taskDetailView" ? "taskReportView" : viewId;
    document.querySelectorAll(".task-subtab-button").forEach((button) => {
      const active = button.dataset.taskTab === activeTabId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".task-subview").forEach((view) => view.classList.toggle("hidden", view.id !== viewId));
  }

  function openTasksByStatus(status) {
    if (!["planned", "in_progress", "completed"].includes(status)) return;
    $("#taskTypeFilter").value = "";
    $("#taskStatusFilter").value = status;
    renderTasks();
    activateMainView("tasksView");
    activateTaskSubview("taskReportView");
  }

  function showTaskDetail(task) {
    window.location.href = `task-detail.html?id=${encodeURIComponent(task.id)}`;
  }

  function sanitizeTaskHtml(input) {
    const template = document.createElement("template");
    template.innerHTML = String(input || "");
    const allowedTags = new Set(["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "CODE", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR", "SPAN"]);
    const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "META", "LINK"]);
    Array.from(template.content.querySelectorAll("*")).forEach((element) => {
      if (blockedTags.has(element.tagName)) { element.remove(); return; }
      if (!allowedTags.has(element.tagName)) { element.replaceWith(...element.childNodes); return; }
      const safeHref = element.tagName === "A" ? element.getAttribute("href") || "" : "";
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
      if (element.tagName === "A") {
        try {
          const url = new URL(safeHref, document.baseURI);
          if (["http:", "https:", "mailto:"].includes(url.protocol)) {
            element.href = url.href;
            element.target = "_blank";
            element.rel = "noopener noreferrer";
          }
        } catch { /* Bağlantı düz metin olarak kalır. */ }
      }
    });
    return template.innerHTML;
  }

  function taskDescriptionFromText(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph.outerHTML;
  }

  function quarterEndDate(year, quarter) {
    const endings = { Q1: "03-31", Q2: "06-30", Q3: "09-30", Q4: "12-31" };
    return year && endings[quarter] ? `${year}-${endings[quarter]}` : "";
  }

  function parseTaskPlanText(source) {
    const lines = String(source || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2 || !/^Item\tSubitem\tExplanations\t/i.test(lines[0])) {
      throw new Error("Dosya Item, Subitem, Explanations, Priority, Year ve Planned Quarter sütunlarını içermelidir.");
    }
    const priorityMap = {
      "1": "high", high: "high", yüksek: "high",
      "2": "medium", medium: "medium", orta: "medium",
      "3": "low", low: "low", düşük: "low"
    };
    const imported = [];
    let currentItem = "";
    lines.slice(1).forEach((line) => {
      const columns = line.split("\t");
      while (columns.length < 6) columns.push("");
      const rawItem = String(columns[0] || "").trim();
      if (rawItem) currentItem = rawItem;
      const item = rawItem || currentItem;
      const subitem = String(columns[1] || "").trim();
      const explanation = String(columns[2] || "").trim();
      const rawPriority = String(columns[3] || "").trim().toLocaleLowerCase("tr-TR");
      const year = /^20\d{2}$/.test(String(columns[4] || "").trim()) ? String(columns[4]).trim() : "";
      const rawQuarter = String(columns[5] || "").trim().toUpperCase();
      const quarter = /^Q[1-4]$/.test(rawQuarter) ? rawQuarter : "";
      const title = subitem || item;
      if (!title) return;
      imported.push({
        title,
        parentItem: subitem ? item : "",
        assignee: "",
        taskType: "architecture_roadmap",
        priority: priorityMap[rawPriority] || "",
        year,
        quarter,
        dueDate: quarterEndDate(year, quarter),
        status: "planned",
        descriptionHtml: taskDescriptionFromText(explanation)
      });
    });
    return imported;
  }

  function importTaskPlanSource(source) {
    const importedTasks = parseTaskPlanText(source);
    if (!importedTasks.length) throw new Error("Dosyada içe aktarılabilecek görev bulunamadı.");
    const result = window.TaskStore.mergeAll(importedTasks);
    if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "Görev planı içe aktarılamadı.");
    const hierarchy = window.TaskStore.ensureHierarchy();
    const importedTypeByTitle = new Map();
    importedTasks.forEach((task) => {
      importedTypeByTitle.set(task.title.toLocaleLowerCase("tr-TR"), task.taskType);
      if (task.parentItem) importedTypeByTitle.set(task.parentItem.toLocaleLowerCase("tr-TR"), task.taskType);
    });
    let typedTasks = 0;
    window.TaskStore.list().forEach((task) => {
      const importedType = importedTypeByTitle.get(task.title.toLocaleLowerCase("tr-TR"));
      if (!importedType || task.taskType === importedType) return;
      window.TaskStore.update(task.id, { ...task, taskType: importedType });
      typedTasks += 1;
    });
    renderTasks();
    activateTaskSubview("taskReportView");
    $("#taskFormMessage").textContent = `${result.value.imported} görev işlendi; ${result.value.created + hierarchy.created} yeni görev eklendi, ${result.value.updated} görev güncellendi, ${hierarchy.linked} alt görev bağlandı ve ${typedTasks} görev tipi güncellendi.`;
    $("#taskFormMessage").classList.add("success");
    backupAndReport("İçe aktarılan görev planı Drive’a gönderildi.");
    return result.value;
  }

  async function importTaskPlan(file) { return importTaskPlanSource(await file.text()); }

  function applyTaskEditorCommand(command) {
    const range = savedTaskEditorRange ? savedTaskEditorRange.cloneRange() : document.createRange();
    if (!savedTaskEditorRange || !taskFields.descriptionHtml.contains(range.commonAncestorContainer) || range.collapsed) {
      range.selectNodeContents(taskFields.descriptionHtml);
    }
    if (range.collapsed) return;
    const selectedText = range.toString();
    let replacement;
    if (command === "bold" || command === "italic") {
      replacement = document.createElement(command === "bold" ? "strong" : "em");
      replacement.append(range.extractContents());
    } else if (command === "insertUnorderedList" || command === "insertOrderedList") {
      replacement = document.createElement(command === "insertUnorderedList" ? "ul" : "ol");
      selectedText.split(/\n+/).filter(Boolean).forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        replacement.append(item);
      });
      range.deleteContents();
    } else if (command === "removeFormat") {
      replacement = document.createTextNode(selectedText);
      range.deleteContents();
    } else return;
    range.insertNode(replacement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(replacement);
    selection.addRange(nextRange);
    savedTaskEditorRange = nextRange.cloneRange();
  }

  function normalizePersonName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  }

  function legacyAssigneeValue(name) {
    return name ? `legacy:${encodeURIComponent(name)}` : "";
  }

  function legacyAssigneeName(value) {
    if (!String(value || "").startsWith("legacy:")) return "";
    try { return decodeURIComponent(String(value).slice(7)); }
    catch (_) { return String(value).slice(7); }
  }

  function taskAssigneeSelectValue(task) {
    if (task?.assigneeId && window.PeopleStore.get(task.assigneeId)) return task.assigneeId;
    const matchingPerson = window.PeopleStore.list().find((person) => normalizePersonName(person.fullName) === normalizePersonName(task?.assignee));
    if (matchingPerson) return matchingPerson.id;
    return legacyAssigneeValue(task?.assignee || "");
  }

  function populateTaskAssigneeOptions(selectedValue = taskFields.assignee.value, legacyName = "") {
    people = window.PeopleStore.list();
    const options = [];
    const unassigned = document.createElement("option");
    unassigned.value = "";
    unassigned.textContent = "Atanmamış";
    options.push(unassigned);
    people.forEach((person) => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = `${person.fullName} — ${person.email}`;
      options.push(option);
    });
    if (selectedValue && !people.some((person) => person.id === selectedValue)) {
      const name = legacyName || legacyAssigneeName(selectedValue);
      if (name) {
        const legacy = document.createElement("option");
        legacy.value = legacyAssigneeValue(name);
        legacy.textContent = `${name} — eski görev kaydı`;
        options.push(legacy);
        selectedValue = legacy.value;
      }
    }
    taskFields.assignee.replaceChildren(...options);
    taskFields.assignee.value = options.some((option) => option.value === selectedValue) ? selectedValue : "";
    updateTaskAssigneePickerLabel();
  }

  function updateTaskAssigneePickerLabel() {
    const person = window.PeopleStore.get(taskFields.assignee.value);
    const option = taskFields.assignee.selectedOptions[0];
    $("#taskAssigneePickerValue").textContent = person
      ? `${person.fullName}${person.email ? ` — ${person.email}` : ""}`
      : (option?.textContent || "Atanmamış");
  }

  function localTaskAssigneeMatches(query = "") {
    const normalized = normalizePersonName(query);
    return window.PeopleStore.list().filter((person) => {
      if (!normalized) return true;
      return [person.fullName, person.email, person.title]
        .some((value) => normalizePersonName(value).includes(normalized));
    });
  }

  function taskAssigneeIdentity(person) {
    return String(person?.jiraAccountId || person?.email || normalizePersonName(person?.fullName) || "").toLocaleLowerCase("tr-TR");
  }

  function appendTaskAssigneeOption(list, person, source, selected = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jira-picker-option task-assignee-option";
    button.dataset.source = source;
    if (source === "local") button.dataset.personId = person.id;
    else button.dataset.jiraAccountId = person.jiraAccountId;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(selected));

    const avatar = document.createElement("span");
    avatar.className = "task-assignee-avatar";
    renderPersonAvatar(avatar, person);
    const copy = document.createElement("span");
    copy.className = "task-assignee-option-copy";
    const name = document.createElement("strong");
    name.textContent = person.fullName;
    const detail = document.createElement("small");
    detail.textContent = person.email || (person.jiraAccountId ? "E-posta JIRA’da gizli" : person.title || "Kayıtlı kişi");
    copy.append(name, detail);
    const badge = document.createElement("span");
    badge.className = `person-source-badge ${person.jiraAccountId || source === "jira" ? "jira" : "manual"}`;
    badge.textContent = person.jiraAccountId || source === "jira" ? "JIRA" : "Kayıtlı";
    button.append(avatar, copy, badge);
    list.append(button);
    return button;
  }

  function renderTaskAssigneeOptions(query = "", remoteUsers = taskAssigneeRemoteUsers, statusMessage = "") {
    const list = $("#taskAssigneeOptionList");
    const localMatches = localTaskAssigneeMatches(query);
    const localIdentities = new Set(localMatches.map(taskAssigneeIdentity));
    const uniqueRemote = remoteUsers.filter((person, index, rows) => {
      const identity = taskAssigneeIdentity(person);
      return identity && !localIdentities.has(identity) && rows.findIndex((item) => taskAssigneeIdentity(item) === identity) === index;
    });
    list.replaceChildren();

    const unassigned = document.createElement("button");
    unassigned.type = "button";
    unassigned.className = "jira-picker-option task-assignee-unassigned";
    unassigned.dataset.source = "unassigned";
    unassigned.setAttribute("role", "option");
    unassigned.setAttribute("aria-selected", String(!taskFields.assignee.value));
    unassigned.textContent = "Atanmamış";
    list.append(unassigned);

    localMatches.forEach((person) => appendTaskAssigneeOption(list, person, "local", person.id === taskFields.assignee.value));
    uniqueRemote.forEach((person) => appendTaskAssigneeOption(list, person, "jira"));
    if (!localMatches.length && !uniqueRemote.length && query.length >= 2) {
      const empty = document.createElement("div");
      empty.className = "jira-picker-empty";
      empty.textContent = "Eşleşen aktif JIRA kullanıcısı bulunamadı.";
      list.append(empty);
    }
    $("#taskAssigneeSearchStatus").textContent = statusMessage || (query.length < 2
      ? `${localMatches.length} kayıtlı kişi · JIRA araması için en az 2 karakter yazın.`
      : `${localMatches.length + uniqueRemote.length} eşleşme`);
  }

  async function searchTaskAssignees(query) {
    const search = String(query || "").trim();
    const requestId = ++taskAssigneeSearchRequest;
    if (search.length < 2) {
      taskAssigneeRemoteUsers = [];
      renderTaskAssigneeOptions(search);
      return;
    }
    renderTaskAssigneeOptions(search, [], "JIRA’da aranıyor…");
    try {
      const response = await window.JiraCloudClient.searchUsers(search, 20);
      if (requestId !== taskAssigneeSearchRequest) return;
      taskAssigneeRemoteUsers = Array.isArray(response.items) ? response.items : [];
      renderTaskAssigneeOptions(search, taskAssigneeRemoteUsers, `${taskAssigneeRemoteUsers.length} JIRA eşleşmesi bulundu.`);
    } catch (error) {
      if (requestId !== taskAssigneeSearchRequest) return;
      taskAssigneeRemoteUsers = [];
      renderTaskAssigneeOptions(search, [], `JIRA araması yapılamadı: ${error.message}`);
      $("#taskAssigneeSearchStatus").classList.add("is-error");
    }
  }

  function scheduleTaskAssigneeSearch() {
    clearTimeout(taskAssigneeSearchTimer);
    $("#taskAssigneeSearchStatus").classList.remove("is-error");
    const query = $("#taskAssigneeSearchInput").value.trim();
    taskAssigneeRemoteUsers = [];
    renderTaskAssigneeOptions(query, [], query.length >= 2 ? "JIRA’da aranacak…" : "");
    taskAssigneeSearchTimer = window.setTimeout(() => searchTaskAssignees(query), 300);
  }

  function setTaskAssigneePickerOpen(open) {
    const trigger = $("#taskAssigneePickerButton");
    trigger.setAttribute("aria-expanded", String(open));
    $("#taskAssigneePickerDropdown").classList.toggle("hidden", !open);
    if (open) {
      renderTaskAssigneeOptions($("#taskAssigneeSearchInput").value.trim());
      requestAnimationFrame(() => $("#taskAssigneeSearchInput").focus());
      return;
    }
    clearTimeout(taskAssigneeSearchTimer);
    taskAssigneeSearchRequest += 1;
    taskAssigneeRemoteUsers = [];
    $("#taskAssigneeSearchInput").value = "";
    $("#taskAssigneeSearchStatus").classList.remove("is-error");
  }

  function selectTaskAssigneeOption(option) {
    if (option.dataset.source === "unassigned") {
      taskFields.assignee.value = "";
    } else if (option.dataset.source === "local") {
      taskFields.assignee.value = option.dataset.personId || "";
    } else if (option.dataset.source === "jira") {
      const remote = taskAssigneeRemoteUsers.find((person) => person.jiraAccountId === option.dataset.jiraAccountId);
      if (!remote) return;
      const result = window.PeopleStore.mergeJiraUsers([remote]);
      if (!result.valid) {
        $("#taskAssigneeSearchStatus").textContent = Object.values(result.errors || {}).join(" ") || "JIRA kullanıcısı kaydedilemedi.";
        $("#taskAssigneeSearchStatus").classList.add("is-error");
        return;
      }
      const person = window.PeopleStore.list().find((item) => item.jiraAccountId === remote.jiraAccountId);
      populateTaskAssigneeOptions(person?.id || "");
      renderPeople();
    }
    updateTaskAssigneePickerLabel();
    setTaskAssigneePickerOpen(false);
    $("#taskAssigneePickerButton").focus();
  }

  function selectedTaskAssignment() {
    const value = taskFields.assignee.value;
    const person = window.PeopleStore.get(value);
    if (person) return { assignee: person.fullName, assigneeId: person.id };
    return { assignee: legacyAssigneeName(value), assigneeId: "" };
  }

  function jiraAssigneeFilterUi(scope = "items") {
    const prefix = scope === "requests" ? "jiraRequestsAssigneeFilter" : "jiraAssigneeFilter";
    return {
      scope,
      picker: $(`#${prefix}Picker`),
      button: $(`#${prefix}Button`),
      value: $(`#${prefix}Value`),
      dropdown: $(`#${prefix}Dropdown`),
      search: $(`#${prefix}Search`),
      searchStatus: $(`#${prefix}SearchStatus`),
      options: $(`#${prefix}Options`),
      status: $(`#${prefix}Status`),
      clear: $(`#clear${scope === "requests" ? "JiraRequests" : "Jira"}AssigneeFilter`)
    };
  }

  function setJiraAssigneeFilterStatus(message, state = "") {
    [jiraAssigneeFilterUi("items"), jiraAssigneeFilterUi("requests")].forEach(({ status }) => {
      status.textContent = message;
      status.classList.toggle("is-busy", state === "busy");
      status.classList.toggle("is-success", state === "success");
      status.classList.toggle("is-error", state === "error");
    });
  }

  function jiraAssigneeFilterLabel(person = jiraAssigneeFilter) {
    if (!person) return "Tüm kullanıcılar";
    return `${person.fullName}${person.email ? ` — ${person.email}` : ""}`;
  }

  function updateJiraAssigneeFilterLabel() {
    [jiraAssigneeFilterUi("items"), jiraAssigneeFilterUi("requests")].forEach(({ value, clear }) => {
      value.textContent = jiraAssigneeFilterLabel();
      clear.classList.toggle("hidden", !jiraAssigneeFilter);
    });
  }

  function jiraItemMatchesAssigneeFilter(item) {
    if (!jiraAssigneeFilter) return true;
    const selectedAccountId = String(jiraAssigneeFilter.jiraAccountId || "").trim();
    const itemAccountId = String(item?.assigneeAccountId || "").trim();
    if (selectedAccountId && itemAccountId) return selectedAccountId === itemAccountId;
    return normalizePersonName(item?.assignee) === normalizePersonName(jiraAssigneeFilter.fullName);
  }

  function appendJiraAssigneeFilterOption(list, person, source) {
    const selected = taskAssigneeIdentity(person) === taskAssigneeIdentity(jiraAssigneeFilter);
    const button = appendTaskAssigneeOption(list, person, source, selected);
    button.classList.add("jira-assignee-filter-option");
    return button;
  }

  function renderJiraAssigneeFilterOptions(query = "", remoteUsers = jiraAssigneeFilterRemoteUsers, statusMessage = "", scope = "items") {
    const ui = jiraAssigneeFilterUi(scope);
    const list = ui.options;
    const localMatches = localTaskAssigneeMatches(query);
    const localIdentities = new Set(localMatches.map(taskAssigneeIdentity));
    const uniqueRemote = remoteUsers.filter((person, index, rows) => {
      const identity = taskAssigneeIdentity(person);
      return identity && !localIdentities.has(identity) && rows.findIndex((item) => taskAssigneeIdentity(item) === identity) === index;
    });
    list.replaceChildren();

    const all = document.createElement("button");
    all.type = "button";
    all.className = "jira-picker-option task-assignee-unassigned jira-assignee-filter-all";
    all.dataset.source = "all";
    all.setAttribute("role", "option");
    all.setAttribute("aria-selected", String(!jiraAssigneeFilter));
    all.textContent = "Tüm kullanıcılar";
    list.append(all);

    localMatches.forEach((person) => appendJiraAssigneeFilterOption(list, person, "local"));
    uniqueRemote.forEach((person) => appendJiraAssigneeFilterOption(list, person, "jira"));
    if (!localMatches.length && !uniqueRemote.length && query.length >= 2) {
      const empty = document.createElement("div");
      empty.className = "jira-picker-empty";
      empty.textContent = "Eşleşen aktif JIRA kullanıcısı bulunamadı.";
      list.append(empty);
    }
    ui.searchStatus.textContent = statusMessage || (query.length < 2
      ? `${localMatches.length} kayıtlı kişi · JIRA araması için en az 2 karakter yazın.`
      : `${localMatches.length + uniqueRemote.length} eşleşme`);
  }

  async function searchJiraAssigneeFilters(query, scope = "items") {
    const ui = jiraAssigneeFilterUi(scope);
    const search = String(query || "").trim();
    const requestId = ++jiraAssigneeFilterSearchRequest;
    if (search.length < 2) {
      jiraAssigneeFilterRemoteUsers = [];
      renderJiraAssigneeFilterOptions(search, [], "", scope);
      return;
    }
    renderJiraAssigneeFilterOptions(search, [], "JIRA’da aranıyor…", scope);
    try {
      const response = await window.JiraCloudClient.searchUsers(search, 20);
      if (requestId !== jiraAssigneeFilterSearchRequest || ui.search.value.trim() !== search) return;
      jiraAssigneeFilterRemoteUsers = Array.isArray(response.items) ? response.items : [];
      renderJiraAssigneeFilterOptions(search, jiraAssigneeFilterRemoteUsers, `${jiraAssigneeFilterRemoteUsers.length} JIRA eşleşmesi bulundu.`, scope);
    } catch (error) {
      if (requestId !== jiraAssigneeFilterSearchRequest) return;
      jiraAssigneeFilterRemoteUsers = [];
      renderJiraAssigneeFilterOptions(search, [], `JIRA araması yapılamadı: ${error.message}`, scope);
      ui.searchStatus.classList.add("is-error");
    }
  }

  function scheduleJiraAssigneeFilterSearch(scope = "items") {
    const ui = jiraAssigneeFilterUi(scope);
    clearTimeout(jiraAssigneeFilterSearchTimer);
    ui.searchStatus.classList.remove("is-error");
    const query = ui.search.value.trim();
    jiraAssigneeFilterRemoteUsers = [];
    renderJiraAssigneeFilterOptions(query, [], query.length >= 2 ? "JIRA’da aranacak…" : "", scope);
    jiraAssigneeFilterSearchTimer = window.setTimeout(() => searchJiraAssigneeFilters(query, scope), 300);
  }

  function setJiraAssigneeFilterOpen(scope = "items", open = false) {
    const ui = jiraAssigneeFilterUi(scope);
    const wasOpen = ui.button.getAttribute("aria-expanded") === "true";
    ui.button.setAttribute("aria-expanded", String(open));
    ui.dropdown.classList.toggle("hidden", !open);
    if (open) {
      const otherScope = scope === "requests" ? "items" : "requests";
      const otherUi = jiraAssigneeFilterUi(otherScope);
      otherUi.button.setAttribute("aria-expanded", "false");
      otherUi.dropdown.classList.add("hidden");
      renderJiraAssigneeFilterOptions(ui.search.value.trim(), jiraAssigneeFilterRemoteUsers, "", scope);
      requestAnimationFrame(() => ui.search.focus());
      return;
    }
    if (!wasOpen) return;
    clearTimeout(jiraAssigneeFilterSearchTimer);
    jiraAssigneeFilterSearchRequest += 1;
    jiraAssigneeFilterRemoteUsers = [];
    ui.search.value = "";
    ui.searchStatus.classList.remove("is-error");
  }

  function jiraAssigneeFilterJql(accountId) {
    const escaped = String(accountId || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    return `assignee = "${escaped}" ORDER BY updated DESC`;
  }

  async function refreshSelectedJiraAssigneeIssues() {
    const selected = jiraAssigneeFilter;
    const requestId = ++jiraAssigneeFilterSyncRequest;
    if (!selected) {
      setJiraAssigneeFilterStatus("Tüm kayıtlı JIRA maddeleri ve talepler gösteriliyor.");
      renderJiraItems();
      return null;
    }
    if (!selected.jiraAccountId) {
      setJiraAssigneeFilterStatus(`${selected.fullName} için JIRA Account ID bulunmadığından kayıtlı maddeler filtreleniyor.`);
      renderJiraItems();
      return null;
    }
    setJiraAssigneeFilterStatus(`${selected.fullName} kullanıcısına atanan maddeler JIRA’dan alınıyor…`, "busy");
    const result = await syncJiraCloudIssues({ jql: jiraAssigneeFilterJql(selected.jiraAccountId) });
    if (requestId !== jiraAssigneeFilterSyncRequest || taskAssigneeIdentity(selected) !== taskAssigneeIdentity(jiraAssigneeFilter)) return result;
    if (!result) {
      setJiraAssigneeFilterStatus(`${selected.fullName} kullanıcısının maddeleri JIRA’dan alınamadı; kayıtlı sonuçlar gösteriliyor.`, "error");
      return null;
    }
    setJiraAssigneeFilterStatus(`${selected.fullName} seçili · ${result.imported} JIRA maddesi canlı entegrasyondan güncellendi.`, "success");
    return result;
  }

  async function selectJiraAssigneeFilterOption(option, scope = "items") {
    const ui = jiraAssigneeFilterUi(scope);
    if (option.dataset.source === "all") {
      jiraAssigneeFilter = null;
    } else if (option.dataset.source === "local") {
      jiraAssigneeFilter = window.PeopleStore.get(option.dataset.personId || "");
    } else if (option.dataset.source === "jira") {
      const remote = jiraAssigneeFilterRemoteUsers.find((person) => person.jiraAccountId === option.dataset.jiraAccountId);
      if (!remote) return;
      const result = window.PeopleStore.mergeJiraUsers([remote]);
      if (!result.valid) {
        ui.searchStatus.textContent = Object.values(result.errors || {}).join(" ") || "JIRA kullanıcısı kaydedilemedi.";
        ui.searchStatus.classList.add("is-error");
        return;
      }
      jiraAssigneeFilter = window.PeopleStore.list().find((person) => person.jiraAccountId === remote.jiraAccountId) || remote;
      renderPeople();
    }
    updateJiraAssigneeFilterLabel();
    setJiraAssigneeFilterOpen(scope, false);
    renderJiraItems();
    ui.button.focus();
    await refreshSelectedJiraAssigneeIssues();
  }

  function tasksForPerson(person, previousName = "") {
    const names = new Set([normalizePersonName(person?.fullName), normalizePersonName(previousName)].filter(Boolean));
    return window.TaskStore.list().filter((task) => task.assigneeId === person?.id || (!task.assigneeId && names.has(normalizePersonName(task.assignee))));
  }

  function synchronizeTasksForPerson(person, previousName = "") {
    let updated = 0;
    tasksForPerson(person, previousName).forEach((task) => {
      const result = window.TaskStore.update(task.id, { ...task, assignee: person.fullName, assigneeId: person.id });
      if (result.valid) updated += 1;
    });
    return updated;
  }

  function subordinateIds(personId, includeLeader = true) {
    const rows = window.PeopleStore.list();
    const result = new Set(includeLeader && personId ? [personId] : []);
    const queue = personId ? [personId] : [];
    while (queue.length) {
      const managerId = queue.shift();
      rows.filter((person) => person.managerId === managerId).forEach((person) => {
        if (result.has(person.id)) return;
        result.add(person.id);
        queue.push(person.id);
      });
    }
    return result;
  }

  function populatePersonManagerOptions(selectedManagerId = personFields.managerId.value, excludedPersonId = personFields.id.value) {
    people = window.PeopleStore.list();
    const blockedIds = excludedPersonId ? subordinateIds(excludedPersonId, true) : new Set();
    const options = [];
    const rootOption = document.createElement("option");
    rootOption.value = "";
    rootOption.textContent = "Yönetici yok — üst seviye";
    options.push(rootOption);
    people.forEach((person) => {
      if (blockedIds.has(person.id)) return;
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = `${person.fullName}${person.title ? ` — ${person.title}` : ""}`;
      options.push(option);
    });
    personFields.managerId.replaceChildren(...options);
    personFields.managerId.value = options.some((option) => option.value === selectedManagerId) ? selectedManagerId : "";
  }

  function resetPersonForm() {
    personForm.reset();
    personFields.id.value = "";
    personFields.role.value = "member";
    $("#personJiraIdentity").classList.add("hidden");
    populatePersonManagerOptions("", "");
    $("#personFormTitle").textContent = "Yeni kişi ekle";
    $("#personSubmitLabel").textContent = "Kişiyi ekle";
    $("#cancelPersonEdit").classList.add("hidden");
    $("#personFormMessage").textContent = "";
    $("#personFormMessage").classList.remove("success");
  }

  function startPersonEdit(person) {
    personFields.id.value = person.id;
    personFields.fullName.value = person.fullName;
    personFields.email.value = person.email;
    personFields.title.value = person.title || "";
    personFields.role.value = person.role || "member";
    populatePersonManagerOptions(person.managerId || "", person.id);
    const identity = $("#personJiraIdentity");
    identity.classList.toggle("hidden", !person.jiraAccountId);
    if (person.jiraAccountId) {
      renderPersonAvatar($("#personJiraIdentityAvatar"), person);
      $("#personJiraIdentityName").textContent = person.fullName;
      $("#personJiraIdentityAccount").textContent = person.jiraAccountId;
    }
    $("#personFormTitle").textContent = "Kişiyi düzenle";
    $("#personSubmitLabel").textContent = "Değişiklikleri kaydet";
    $("#cancelPersonEdit").classList.remove("hidden");
    $("#personFormMessage").textContent = "";
    personFields.fullName.focus();
  }

  function personInitials(person) {
    return String(person?.fullName || "?").split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0] || "").join("").toLocaleUpperCase("tr-TR");
  }

  function renderPersonAvatar(container, person) {
    container.replaceChildren();
    container.textContent = personInitials(person);
    if (!person?.avatarUrl) return;
    const image = document.createElement("img");
    image.src = person.avatarUrl;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove(), { once: true });
    container.append(image);
  }

  function setJiraPeopleSyncStatus(message, state = "") {
    const status = $("#jiraPeopleSyncStatus");
    status.textContent = message;
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
    status.classList.toggle("is-busy", state === "busy");
  }

  async function syncJiraPeople() {
    const button = $("#syncJiraUsers");
    button.disabled = true;
    setJiraPeopleSyncStatus("JIRA’daki aktif kullanıcılar alınıyor…", "busy");
    try {
      const before = new Map(window.PeopleStore.list().map((person) => [person.id, person]));
      const response = await window.JiraCloudClient.syncUsers(1000);
      const result = window.PeopleStore.mergeJiraUsers(response.items || []);
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA kullanıcıları kaydedilemedi.");
      let linkedTasks = 0;
      window.PeopleStore.list().forEach((person) => {
        const previous = before.get(person.id);
        if (previous && previous.fullName !== person.fullName) linkedTasks += synchronizeTasksForPerson(person, previous.fullName);
      });
      resetPersonForm();
      renderTasks();
      renderPeople();
      backupAndReport("JIRA kullanıcı değişiklikleri bekliyor.");
      const { created, updated, skipped } = result.value;
      setJiraPeopleSyncStatus(`${response.total || response.items?.length || 0} aktif kullanıcı alındı: ${created} yeni kişi, ${updated} güncelleme${skipped ? `, ${skipped} atlanan` : ""}${linkedTasks ? `; ${linkedTasks} görev ataması yenilendi` : ""}.`, "success");
    } catch (error) {
      setJiraPeopleSyncStatus(`JIRA kullanıcıları alınamadı: ${error.message}`, "error");
    } finally { button.disabled = false; }
  }

  function renderPeople() {
    people = window.PeopleStore.list();
    const searchTerm = String($("#peopleSearchInput").value || "").trim().toLocaleLowerCase("tr-TR");
    const sourceFilter = $("#peopleSourceFilter").value;
    const visiblePeople = people.filter((person) => {
      const source = person.jiraAccountId ? "jira" : "manual";
      if (sourceFilter && source !== sourceFilter) return false;
      if (!searchTerm) return true;
      return [person.fullName, person.email, person.title, person.jiraAccountId, person.timeZone]
        .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(searchTerm));
    });
    const list = $("#peopleList");
    list.replaceChildren();
    $("#peopleTabCount").textContent = String(people.length);
    $("#peopleCount").textContent = searchTerm || sourceFilter ? `${visiblePeople.length} / ${people.length} kişi` : `${people.length} kişi`;
    $("#jiraPeopleCount").textContent = String(people.filter((person) => person.jiraAccountId).length);
    $("#manualPeopleCount").textContent = String(people.filter((person) => !person.jiraAccountId).length);
    $("#peopleEmptyState").classList.toggle("hidden", people.length > 0);
    $("#peopleFilterEmpty").classList.toggle("hidden", people.length === 0 || visiblePeople.length > 0);
    visiblePeople.forEach((person) => {
      const card = document.createElement("article");
      card.className = "person-card";
      card.dataset.id = person.id;
      card.dataset.source = person.jiraAccountId ? "jira" : "manual";
      const avatar = document.createElement("div");
      avatar.className = "person-avatar";
      renderPersonAvatar(avatar, person);
      const name = document.createElement("div");
      name.className = "person-card-name";
      const nameLine = document.createElement("div");
      nameLine.className = "person-card-titleline";
      const strong = document.createElement("strong");
      strong.textContent = person.fullName;
      const sourceBadge = document.createElement("span");
      sourceBadge.className = `person-source-badge ${person.jiraAccountId ? "jira" : "manual"}`;
      sourceBadge.textContent = person.jiraAccountId ? "JIRA" : "Manuel";
      nameLine.append(strong, sourceBadge);
      const detail = document.createElement("small");
      const manager = people.find((item) => item.id === person.managerId);
      detail.textContent = [person.title || (person.role === "leader" ? "Lider" : "Ekip üyesi"), manager ? `${manager.fullName} ekibi` : "Üst seviye"].join(" · ");
      name.append(nameLine, detail);
      const contact = document.createElement("div");
      contact.className = "person-contact";
      if (person.email) {
        const email = document.createElement("a");
        email.className = "person-email";
        email.href = `mailto:${person.email}`;
        email.textContent = person.email;
        contact.append(email);
      } else {
        const hiddenEmail = document.createElement("span");
        hiddenEmail.className = "person-email-hidden";
        hiddenEmail.textContent = "E-posta JIRA’da gizli";
        contact.append(hiddenEmail);
      }
      if (person.jiraAccountId) {
        const jiraMeta = document.createElement("small");
        jiraMeta.className = "person-jira-meta";
        jiraMeta.textContent = [person.active === false ? "Pasif" : "Aktif", person.timeZone || "JIRA hesabı"].join(" · ");
        jiraMeta.title = `JIRA Account ID: ${person.jiraAccountId}`;
        contact.append(jiraMeta);
      }
      const assignedTasks = tasksForPerson(person).length;
      const count = document.createElement("span");
      count.className = "person-task-count";
      const countValue = document.createElement("strong");
      countValue.textContent = String(assignedTasks);
      const countLabel = document.createElement("small");
      countLabel.textContent = "görev";
      count.append(countValue, countLabel);
      const actions = document.createElement("div");
      actions.className = "person-card-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "icon-button";
      edit.textContent = "Düzenle";
      edit.addEventListener("click", () => startPersonEdit(person));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button danger";
      remove.textContent = "Sil";
      remove.addEventListener("click", () => {
        const directReports = people.filter((item) => item.managerId === person.id).length;
        if (directReports) {
          $("#personFormMessage").textContent = `${person.fullName} kişisine bağlı ${directReports} ekip üyesi var. Önce bu kişilerin yöneticisini değiştirin.`;
          $("#personFormMessage").classList.remove("success");
          return;
        }
        const currentTaskCount = tasksForPerson(person).length;
        if (currentTaskCount) {
          $("#personFormMessage").textContent = `${person.fullName} ${currentTaskCount} görevde atanmış durumda. Önce bu görevleri başka bir kişiye atayın.`;
          $("#personFormMessage").classList.remove("success");
          return;
        }
        if (!confirm(`“${person.fullName}” kişi tanımından silinsin mi?`)) return;
        window.PeopleStore.remove(person.id);
        if (personFields.id.value === person.id) resetPersonForm();
        renderPeople();
        renderTasks();
        backupAndReport("Silinen kişi Drive’a gönderildi.");
      });
      actions.append(edit, remove);
      card.append(avatar, name, contact, count, actions);
      list.append(card);
    });
    populateTaskAssigneeOptions(taskFields.assignee.value);
    populatePersonManagerOptions(personFields.managerId.value, personFields.id.value);
    renderOrganization();
  }

  function organizationLeaders(rows) {
    return rows.filter((person) => person.role === "leader" || rows.some((item) => item.managerId === person.id));
  }

  function renderOrganization() {
    if (!$("#organizationView")) return;
    const rows = window.PeopleStore.list();
    const leaderSelect = $("#organizationLeaderFilter");
    const previousSelection = leaderSelect.value;
    const leaderOptions = [];
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Tüm organizasyon";
    leaderOptions.push(allOption);
    organizationLeaders(rows).forEach((person) => {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = `${person.fullName}${person.title ? ` — ${person.title}` : ""}`;
      leaderOptions.push(option);
    });
    leaderSelect.replaceChildren(...leaderOptions);
    leaderSelect.value = leaderOptions.some((option) => option.value === previousSelection) ? previousSelection : "";

    const selectedLeader = rows.find((person) => person.id === leaderSelect.value) || null;
    const teamIds = selectedLeader ? subordinateIds(selectedLeader.id, true) : new Set(rows.map((person) => person.id));
    const teamRows = rows.filter((person) => teamIds.has(person.id));
    const teamNames = new Set(teamRows.map((person) => normalizePersonName(person.fullName)));
    const teamTasks = window.TaskStore.list().filter((task) => teamIds.has(task.assigneeId) || (!task.assigneeId && teamNames.has(normalizePersonName(task.assignee))));

    $("#organizationWorkloadTitle").textContent = selectedLeader ? `${selectedLeader.fullName} ekibinin işleri` : "Tüm organizasyonun işleri";

    const stats = $("#organizationTaskStats");
    stats.replaceChildren();
    [
      ["planned", "Bekleyen"],
      ["in_progress", "Devam eden"],
      ["completed", "Tamamlanan"]
    ].forEach(([status, label]) => {
      const badge = document.createElement("span");
      badge.dataset.status = status;
      badge.textContent = `${label} ${teamTasks.filter((task) => task.status === status).length}`;
      stats.append(badge);
    });

    $("#organizationTaskEmpty").classList.toggle("hidden", teamTasks.length > 0);
    $("#organizationTaskTableWrap").classList.toggle("hidden", teamTasks.length === 0);
    const taskList = $("#organizationTaskList");
    taskList.replaceChildren();
    teamTasks.forEach((task) => {
      const row = document.createElement("tr");
      const taskCell = document.createElement("td");
      const taskButton = document.createElement("button");
      taskButton.type = "button";
      taskButton.className = "organization-task-link";
      taskButton.textContent = task.title;
      taskButton.addEventListener("click", () => showTaskDetail(task));
      taskCell.append(taskButton);
      const assignee = document.createElement("td");
      assignee.textContent = task.assignee || "Atanmamış";
      const status = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = "task-status";
      statusBadge.dataset.status = task.status;
      statusBadge.textContent = statusLabel(task.status);
      status.append(statusBadge);
      const dueDate = document.createElement("td");
      dueDate.textContent = task.dueDate ? dateFormatter.format(parseDate(task.dueDate)) : taskPlanLabel(task);
      row.append(taskCell, assignee, status, dueDate);
      taskList.append(row);
    });
  }

  function renderTasks() {
    tasks = window.TaskStore.list();
    populateTaskParentOptions(taskFields.id.value, taskFields.parentTaskId.value);
    const selectedTaskType = $("#taskTypeFilter").value;
    const selectedTaskStatus = $("#taskStatusFilter").value;
    const typeFilteredTasks = tasksForType(tasks, selectedTaskType);
    const reportTasks = selectedTaskStatus
      ? typeFilteredTasks.filter((task) => task.status === selectedTaskStatus)
      : typeFilteredTasks;
    populateTaskAssigneeOptions(taskFields.assignee.value);
    const openTasks = tasks.filter((task) => task.status !== "completed");
    $("#taskTabCount").textContent = String(openTasks.length);
    $("#taskReportCount").textContent = String(tasks.length);
    $("#openTaskCount").textContent = `${openTasks.length} açık`;
    $("#taskEmptyState").classList.toggle("hidden", tasks.length > 0);
    $("#taskFilterEmpty").classList.toggle("hidden", tasks.length === 0 || reportTasks.length > 0);
    $("#taskReportTableWrap").classList.toggle("hidden", reportTasks.length === 0);

    const list = $("#taskList");
    list.replaceChildren();
    groupTasksByType(reportTasks).forEach((group) => {
      const groupRow = $("#taskTypeGroupTemplate").content.firstElementChild.cloneNode(true);
      const groupToggle = groupRow.querySelector(".task-type-group-toggle");
      groupRow.dataset.taskType = group.taskType;
      groupToggle.setAttribute("aria-label", `${taskTypeLabel(group.taskType)} raporunu aç; ${group.tasks.length} madde`);
      groupToggle.querySelector(".task-type-group-name").textContent = taskTypeLabel(group.taskType);
      groupToggle.querySelector(".task-type-group-total strong").textContent = String(group.tasks.length);
      Object.entries(group.priorities).forEach(([priorityName, count]) => {
        groupToggle.querySelector(`.task-type-priority-count[data-priority="${priorityName}"] strong`).textContent = String(count);
      });
      groupToggle.addEventListener("click", () => {
        const params = new URLSearchParams({ type: group.taskType });
        if (selectedTaskStatus) params.set("status", selectedTaskStatus);
        window.location.href = `task-type-report.html?${params}`;
      });
      list.append(groupRow);
    });
    renderOrganization();
    renderHomeDashboard();
  }

  function saveJiraTableLayout() {
    queueCloudUserSettings({ jiraTableLayout });
  }

  function visibleJiraColumns() {
    const byId = new Map(JIRA_TABLE_COLUMNS.map((column) => [column.id, column]));
    return jiraTableLayout.order
      .filter((id) => jiraTableLayout.visible.includes(id))
      .map((id) => byId.get(id))
      .filter(Boolean);
  }

  function applyJiraColumnWidths(columnId = "") {
    const columns = columnId ? JIRA_TABLE_COLUMNS.filter((column) => column.id === columnId) : visibleJiraColumns();
    columns.forEach((column) => {
      const width = Number(jiraTableLayout.widths[column.id]);
      document.querySelectorAll(`#jiraIssueTable [data-column-id="${column.id}"]`).forEach((cell) => {
        if (Number.isFinite(width) && width > 0) {
          cell.style.width = `${width}px`;
          cell.style.minWidth = `${width}px`;
          cell.style.maxWidth = `${width}px`;
        } else {
          cell.style.removeProperty("width");
          cell.style.minWidth = `${column.min}px`;
          cell.style.maxWidth = `${column.max}px`;
        }
      });
    });
  }

  function moveJiraColumn(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const order = jiraTableLayout.order.filter((id) => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    order.splice(Math.max(0, targetIndex), 0, sourceId);
    jiraTableLayout.order = order;
    saveJiraTableLayout();
    renderJiraItems();
    $("#jiraColumnStatus").textContent = "Kolon sırası kaydedildi.";
  }

  function beginJiraColumnResize(event, column) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const header = handle.closest("th");
    const startX = event.clientX;
    const startWidth = header.getBoundingClientRect().width;
    if (jiraAutoFitFrame) cancelAnimationFrame(jiraAutoFitFrame);
    jiraAutoFitFrame = 0;
    handle.classList.add("is-resizing");
    jiraTableLayout.autoFit = false;
    const resize = (moveEvent) => {
      const width = Math.max(column.min, Math.min(column.max, Math.round(startWidth + moveEvent.clientX - startX)));
      jiraTableLayout.widths[column.id] = width;
      applyJiraColumnWidths(column.id);
      $("#jiraColumnStatus").textContent = `${column.label} genişliği: ${width}px`;
    };
    const finish = () => {
      handle.classList.remove("is-resizing");
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", finish);
      saveJiraTableLayout();
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", finish, { once: true });
  }

  function renderJiraTableHeader(visibleItems = []) {
    const headerRow = $("#jiraTableHeaderRow");
    headerRow.replaceChildren();
    visibleJiraColumns().forEach((column) => {
      const header = document.createElement("th");
      header.dataset.columnId = column.id;
      if (column.locked && column.id === "select") {
        header.className = "jira-select-column";
        header.draggable = false;
        header.title = "Görünen maddelerin tümünü seç veya seçimi bırak";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", "Görünen JIRA maddelerinin tümünü seç");
        const selectedVisibleCount = visibleItems.filter((item) => selectedJiraItemIds.has(item.id)).length;
        checkbox.checked = visibleItems.length > 0 && selectedVisibleCount === visibleItems.length;
        checkbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleItems.length;
        checkbox.disabled = visibleItems.length === 0;
        checkbox.addEventListener("change", () => {
          visibleItems.forEach((item) => checkbox.checked ? selectedJiraItemIds.add(item.id) : selectedJiraItemIds.delete(item.id));
          renderJiraItems();
        });
        header.append(checkbox);
        headerRow.append(header);
        return;
      }
      header.draggable = true;
      header.title = `${column.label} kolonunu sürükleyin veya sağ kenarından boyutlandırın`;
      const label = document.createElement("span");
      label.textContent = column.label;
      const resizer = document.createElement("span");
      resizer.className = "jira-column-resizer";
      resizer.setAttribute("aria-hidden", "true");
      resizer.addEventListener("pointerdown", (event) => beginJiraColumnResize(event, column));
      resizer.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        delete jiraTableLayout.widths[column.id];
        autoFitJiraColumns(true, column.id);
      });
      header.addEventListener("dragstart", (event) => {
        header.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", column.id);
      });
      header.addEventListener("dragend", () => header.classList.remove("is-dragging"));
      header.addEventListener("dragover", (event) => {
        event.preventDefault();
        header.classList.add("is-drop-target");
      });
      header.addEventListener("dragleave", () => header.classList.remove("is-drop-target"));
      header.addEventListener("drop", (event) => {
        event.preventDefault();
        header.classList.remove("is-drop-target");
        moveJiraColumn(event.dataTransfer.getData("text/plain"), column.id);
      });
      header.append(label, resizer);
      headerRow.append(header);
    });
  }

  function renderJiraColumnOptions() {
    const options = $("#jiraColumnOptions");
    options.replaceChildren();
    jiraTableLayout.order.forEach((id) => {
      const column = JIRA_TABLE_COLUMNS.find((item) => item.id === id);
      if (!column || column.locked) return;
      const label = document.createElement("label");
      label.className = "jira-column-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = jiraTableLayout.visible.includes(id);
      checkbox.disabled = checkbox.checked && jiraTableLayout.visible.length === 1;
      const text = document.createElement("span");
      text.textContent = column.label;
      checkbox.addEventListener("change", () => {
        jiraTableLayout.visible = checkbox.checked
          ? [...jiraTableLayout.visible, id]
          : jiraTableLayout.visible.filter((visibleId) => visibleId !== id);
        saveJiraTableLayout();
        renderJiraItems();
        $("#jiraColumnStatus").textContent = `${column.label} kolonu ${checkbox.checked ? "gösterildi" : "gizlendi"}.`;
      });
      label.append(checkbox, text);
      options.append(label);
    });
  }

  function applyJiraColumnLayout(row) {
    const cells = new Map([...row.children].map((cell) => [cell.dataset.columnId, cell]));
    row.replaceChildren(...visibleJiraColumns().map((column) => cells.get(column.id)).filter(Boolean));
  }

  function autoFitJiraColumns(persist = true, onlyColumnId = "") {
    const columns = visibleJiraColumns().filter((column) => !onlyColumnId || column.id === onlyColumnId);
    columns.forEach((column) => {
      const cells = [...document.querySelectorAll(`#jiraIssueTable [data-column-id="${column.id}"]`)];
      cells.forEach((cell) => {
        cell.style.removeProperty("width");
        cell.style.minWidth = `${column.min}px`;
        cell.style.maxWidth = `${column.max}px`;
      });
      const contentWidth = Math.max(column.min, ...cells.map((cell) => Math.ceil(cell.scrollWidth + 2)));
      jiraTableLayout.widths[column.id] = Math.min(column.max, contentWidth);
    });
    jiraTableLayout.autoFit = true;
    applyJiraColumnWidths(onlyColumnId);
    if (persist) {
      saveJiraTableLayout();
      $("#jiraColumnStatus").textContent = onlyColumnId ? "Kolon içeriğine sığdırıldı." : "Tüm kolonlar içeriklerine göre sığdırıldı.";
    }
  }

  function scheduleJiraAutoFit() {
    if (jiraAutoFitFrame) cancelAnimationFrame(jiraAutoFitFrame);
    jiraAutoFitFrame = requestAnimationFrame(() => {
      jiraAutoFitFrame = requestAnimationFrame(() => {
        autoFitJiraColumns(false);
        jiraAutoFitFrame = 0;
      });
    });
  }

  function filteredJiraItems() {
    const rows = window.JiraStore.list().filter(jiraItemMatchesAssigneeFilter);
    const searchTerm = $("#jiraSearchInput").value.trim().toLocaleLowerCase("tr-TR");
    return searchTerm
      ? rows.filter((item) => [item.issueType, item.name, item.description, item.assignee, item.reporter, item.priority, item.status, item.resolution, item.dueDate]
        .some((value) => String(value || "").toLocaleLowerCase("tr-TR").includes(searchTerm)))
      : rows;
  }

  function renderJiraSelectionControls(visibleItems) {
    const availableIds = new Set(jiraItems.map((item) => item.id));
    [...selectedJiraItemIds].forEach((id) => { if (!availableIds.has(id)) selectedJiraItemIds.delete(id); });
    const selectedVisible = visibleItems.filter((item) => selectedJiraItemIds.has(item.id)).length;
    $("#selectAllJiraItems").disabled = visibleItems.length === 0 || selectedVisible === visibleItems.length;
    $("#clearJiraItemSelection").disabled = selectedJiraItemIds.size === 0;
    $("#deleteSelectedJiraItems").disabled = selectedJiraItemIds.size === 0;
    $("#jiraSelectionCount").textContent = `${selectedJiraItemIds.size} seçili`;
  }

  async function deleteSelectedJiraItems() {
    const selectedItems = jiraItems.filter((item) => selectedJiraItemIds.has(item.id));
    if (!selectedItems.length) return;
    const linkedIds = new Set(readEntries().map((entry) => entry.jiraId).filter(Boolean));
    const blocked = selectedItems.filter((item) => linkedIds.has(item.id));
    const deletable = selectedItems.filter((item) => !linkedIds.has(item.id));
    if (!deletable.length) {
      setJiraNavigatorSyncStatus(`Seçilen ${blocked.length} madde efor kayıtlarına bağlı olduğu için silinemez.`, "error");
      return;
    }
    const approvalMessage = `${deletable.length} JIRA maddesi uygulamadan silinsin mi?${blocked.length ? `\n\n${blocked.length} madde efor kayıtlarına bağlı olduğu için korunacak.` : ""}`;
    if (!confirm(approvalMessage)) return;
    const snapshot = window.JiraStore.list();
    const result = window.JiraStore.removeMany(deletable.map((item) => item.id));
    if (!result.valid) {
      setJiraNavigatorSyncStatus(Object.values(result.errors || {}).join(" ") || "JIRA maddeleri silinemedi.", "error");
      return;
    }
    if (!await waitForDataSaves()) {
      window.CloudDataRuntime.suspend(() => window.JiraStore.replaceAll(snapshot));
      setJiraNavigatorSyncStatus("Supabase kaydı tamamlanamadı; silme işlemi geri alındı.", "error");
      renderJiraItems();
      return;
    }
    selectedJiraItemIds.clear();
    renderJiraItems();
    renderTimesheet();
    setJiraNavigatorSyncStatus(`${result.value.removed} JIRA maddesi silindi${blocked.length ? `; efora bağlı ${blocked.length} madde korundu` : ""}.`, "success");
    backupAndReport("Toplu silinen JIRA maddeleri kaydedildi.");
  }

  function renderJiraItems() {
    jiraItems = window.JiraStore.list();
    $("#jiraTabCount").textContent = String(jiraItems.length);
    const assigneeItems = jiraItems.filter(jiraItemMatchesAssigneeFilter);
    $("#jiraItemsSubtabCount").textContent = String(assigneeItems.length);
    $("#jiraRequestsSubtabCount").textContent = String(assigneeItems.length);
    const searchTerm = $("#jiraSearchInput").value.trim().toLocaleLowerCase("tr-TR");
    const visibleItems = filteredJiraItems();
    const hasAssigneeFilter = Boolean(jiraAssigneeFilter);
    $("#jiraCountBadge").textContent = searchTerm || hasAssigneeFilter ? `${visibleItems.length} / ${jiraItems.length} madde` : `${jiraItems.length} madde`;
    $("#jiraEmptyState").classList.toggle("hidden", visibleItems.length > 0);
    $("#jiraList").classList.toggle("hidden", visibleItems.length === 0);
    const emptyTitle = $("#jiraEmptyState h3");
    const emptyCopy = $("#jiraEmptyState p");
    if (!jiraItems.length) {
      emptyTitle.textContent = "Henüz JIRA maddesi yok";
      emptyCopy.textContent = "Eforları bağlamak için ilk JIRA maddesini ekleyin.";
    } else if (hasAssigneeFilter) {
      emptyTitle.textContent = `${jiraAssigneeFilter.fullName} için madde bulunamadı`;
      emptyCopy.textContent = searchTerm ? "Atanan kullanıcı ve arama ölçütleriyle eşleşen kayıt yok." : "Bu kullanıcıya atanmış kayıtlı veya canlı JIRA maddesi bulunamadı.";
    } else {
      emptyTitle.textContent = "Aramayla eşleşen madde yok";
      emptyCopy.textContent = "Farklı bir Key, summary, kişi veya statü arayın.";
    }

    const selectedJiraId = fields.jiraId.value;
    filterEffortJiraOptions(selectedJiraId);

    renderJiraSelectionControls(visibleItems);
    renderJiraTableHeader(visibleItems);
    renderJiraColumnOptions();
    const body = $("#jiraTableBody");
    body.replaceChildren();
    visibleItems.forEach((item) => {
      const row = $("#jiraTemplate").content.firstElementChild.cloneNode(true);
      row.dataset.id = item.id;
      row.classList.toggle("is-selected", selectedJiraItemIds.has(item.id));
      const selection = row.querySelector(".jira-row-select");
      selection.checked = selectedJiraItemIds.has(item.id);
      selection.setAttribute("aria-label", `${item.name} maddesini seç`);
      selection.addEventListener("change", () => {
        if (selection.checked) selectedJiraItemIds.add(item.id);
        else selectedJiraItemIds.delete(item.id);
        renderJiraItems();
      });
      row.querySelector(".jira-issue-type").textContent = item.issueType || "Task";
      const link = row.querySelector(".jira-issue-key a");
      link.textContent = item.name;
      link.href = item.url;
      row.querySelector(".jira-summary").textContent = item.description;
      row.querySelector(".jira-assignee").textContent = item.assignee || "Unassigned";
      row.querySelector(".jira-reporter").textContent = item.reporter || "—";
      row.querySelector(".jira-priority").textContent = item.priority || "—";
      const status = row.querySelector(".jira-status");
      status.textContent = item.status || "Open";
      status.dataset.status = String(item.status || "open").toLocaleLowerCase("en-US").replaceAll(" ", "_");
      row.querySelector(".jira-resolution").textContent = item.resolution || "Unresolved";
      row.querySelector(".jira-created").textContent = item.jiraCreated || formatJiraTimestamp(item.createdAt);
      row.querySelector(".jira-updated").textContent = item.jiraUpdated || formatJiraTimestamp(item.updatedAt);
      row.querySelector(".jira-due-date").textContent = item.dueDate || "—";
      row.querySelector(".jira-edit-button").addEventListener("click", () => fetchJiraIssueByKey(item.name, { keepInput: true }));
      row.querySelector(".jira-delete-button").addEventListener("click", () => {
        const linkedCount = readEntries().filter((entry) => entry.jiraId === item.id).length;
        if (linkedCount) {
          alert(`Bu JIRA maddesi ${linkedCount} efor kaydına bağlı olduğu için silinemez.`);
          return;
        }
        if (confirm(`“${item.name}” JIRA maddesi silinsin mi?`)) {
          window.JiraStore.remove(item.id);
          renderJiraItems();
          renderTimesheet();
          backupAndReport("Silinen JIRA maddesi Drive’a gönderildi.");
        }
      });
      applyJiraColumnLayout(row);
      body.append(row);
    });
    applyJiraColumnWidths();
    scheduleJiraAutoFit();
    renderJiraRequests();
  }

  function jiraStatusOrder(status) {
    const normalized = normalizeJiraSearch(status).replaceAll(" ", "_");
    if (["done", "closed", "resolved", "completed", "tamamlandi"].includes(normalized)) return 2;
    if (["in_progress", "in_review", "review", "devam_ediyor"].includes(normalized)) return 1;
    return 0;
  }

  function jiraRequestStatusKey(status) {
    return String(status || "Statü belirtilmedi").trim().toLocaleLowerCase("tr-TR") || "statü belirtilmedi";
  }

  function groupJiraRequestsByStatus(items) {
    const groups = new Map();
    items.forEach((item) => {
      const status = String(item.status || "Statü belirtilmedi").trim() || "Statü belirtilmedi";
      const key = jiraRequestStatusKey(status);
      if (!groups.has(key)) groups.set(key, { key, status, items: [] });
      groups.get(key).items.push(item);
    });
    return [...groups.values()].sort((a, b) => jiraStatusOrder(a.status) - jiraStatusOrder(b.status) || a.status.localeCompare(b.status, "tr", { sensitivity: "base" }));
  }

  function renderJiraRequestStatusFilters(groups) {
    groups.forEach((group) => {
      if (!knownJiraRequestStatuses.has(group.key)) selectedJiraRequestStatuses.add(group.key);
      knownJiraRequestStatuses.add(group.key);
      knownJiraRequestStatusLabels.set(group.key, group.status);
    });
    const container = $("#jiraRequestStatusFilters");
    container.replaceChildren();
    groups.forEach((group) => {
      const label = document.createElement("label");
      label.className = "jira-request-status-filter";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = group.key;
      checkbox.checked = selectedJiraRequestStatuses.has(group.key);
      const status = document.createElement("span");
      status.textContent = group.status;
      const count = document.createElement("strong");
      count.textContent = String(group.items.length);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedJiraRequestStatuses.add(group.key);
        else selectedJiraRequestStatuses.delete(group.key);
        renderJiraRequests();
      });
      label.append(checkbox, status, count);
      container.append(label);
    });
  }

  function setJiraRequestBoardStatus(message, state = "") {
    const status = $("#jiraRequestBoardStatus");
    status.textContent = message;
    status.classList.toggle("is-busy", state === "busy");
    status.classList.toggle("is-success", state === "success");
    status.classList.toggle("is-error", state === "error");
  }

  async function transitionJiraRequest(itemId, targetStatus) {
    const item = window.JiraStore.get(itemId);
    if (!item || !targetStatus || jiraRequestStatusKey(item.status) === jiraRequestStatusKey(targetStatus)) return;
    if (jiraRequestTransitionPending) {
      setJiraRequestBoardStatus("Devam eden statü değişikliğinin tamamlanmasını bekleyin.", "error");
      return;
    }
    const previousItem = { ...item };
    const approved = confirm(`${item.name} statüsü “${item.status || "Belirtilmedi"}” → “${targetStatus}” olarak değiştirilsin ve JIRA’ya gönderilsin mi?`);
    if (!approved) {
      draggedJiraRequestId = "";
      setJiraRequestBoardStatus(`${item.name} statü değişikliği iptal edildi; kart mevcut sütununda kaldı.`);
      return;
    }
    const optimistic = window.JiraStore.update(item.id, { ...item, status: targetStatus });
    if (!optimistic.valid) {
      setJiraRequestBoardStatus(Object.values(optimistic.errors || {}).join(" ") || "Talep statüsü güncellenemedi.", "error");
      return;
    }
    jiraRequestTransitionPending = true;
    renderJiraItems();
    setJiraRequestBoardStatus(`${item.name} JIRA’da “${targetStatus}” statüsüne taşınıyor…`, "busy");
    try {
      const response = await window.JiraCloudClient.transitionIssue(item.name, targetStatus);
      if (response.item) {
        const merged = window.JiraStore.mergeAll([response.item]);
        if (!merged.valid) throw new Error(Object.values(merged.errors || {}).join(" ") || "Güncel JIRA maddesi kaydedilemedi.");
      }
      renderJiraItems();
      setJiraRequestBoardStatus(`${item.name} başarıyla “${response.item?.status || targetStatus}” statüsüne taşındı.${response.warning ? ` ${response.warning}` : ""}`, "success");
      backupAndReport("JIRA statü değişikliği Drive’a gönderildi.");
    } catch (error) {
      window.JiraStore.update(previousItem.id, previousItem);
      renderJiraItems();
      setJiraRequestBoardStatus(`${item.name} taşınamadı; önceki statüsüne geri alındı. ${error.message}`, "error");
    } finally {
      jiraRequestTransitionPending = false;
      draggedJiraRequestId = "";
    }
  }

  function renderJiraRequests() {
    const allItems = window.JiraStore.list();
    const assigneeItems = allItems.filter(jiraItemMatchesAssigneeFilter);
    const currentGroups = groupJiraRequestsByStatus(assigneeItems);
    currentGroups.forEach((group) => knownJiraRequestStatusLabels.set(group.key, group.status));
    const currentKeys = new Set(currentGroups.map((group) => group.key));
    const allGroups = [
      ...currentGroups,
      ...[...knownJiraRequestStatusLabels.entries()]
        .filter(([key]) => !currentKeys.has(key))
        .map(([key, status]) => ({ key, status, items: [] }))
    ].sort((a, b) => jiraStatusOrder(a.status) - jiraStatusOrder(b.status) || a.status.localeCompare(b.status, "tr", { sensitivity: "base" }));
    renderJiraRequestStatusFilters(allGroups);
    const searchTerm = normalizeJiraSearch($("#jiraRequestsSearch").value);
    const searchedItems = searchTerm
      ? assigneeItems.filter((item) => [item.name, item.description, item.assignee, item.reporter, item.priority, item.status, item.issueType]
        .some((value) => normalizeJiraSearch(value).includes(searchTerm)))
      : assigneeItems;
    const visibleItems = searchedItems.filter((item) => selectedJiraRequestStatuses.has(jiraRequestStatusKey(item.status)));
    const hasFilter = selectedJiraRequestStatuses.size !== allGroups.length;
    $("#jiraRequestTotal").textContent = searchTerm || hasFilter ? `${visibleItems.length} / ${assigneeItems.length} talep` : `${assigneeItems.length} talep`;
    const showBoard = assigneeItems.length > 0 && selectedJiraRequestStatuses.size > 0;
    $("#jiraRequestsEmpty").classList.toggle("hidden", showBoard);
    const emptyTitle = $("#jiraRequestsEmpty h3");
    const emptyCopy = $("#jiraRequestsEmpty p");
    emptyTitle.textContent = selectedJiraRequestStatuses.size ? "Gösterilecek talep yok" : "En az bir statü seçin";
    emptyCopy.textContent = selectedJiraRequestStatuses.size
      ? `${jiraAssigneeFilter ? `${jiraAssigneeFilter.fullName} için ` : ""}arama ve statü seçiminize uyan JIRA maddesi bulunamadı.`
      : "Kanban sütunlarını göstermek için yukarıdan bir veya daha fazla statü seçin.";
    const board = $("#jiraRequestBoard");
    board.classList.toggle("hidden", !showBoard);
    board.replaceChildren();

    allGroups.filter((group) => selectedJiraRequestStatuses.has(group.key)).forEach((group) => {
      const groupItems = searchedItems.filter((item) => jiraRequestStatusKey(item.status) === group.key);
      const column = document.createElement("section");
      column.className = "jira-request-column";
      column.dataset.status = group.key;
      column.setAttribute("aria-label", `${group.status} statüsü; buraya talep bırakabilirsiniz`);
      column.addEventListener("dragover", (event) => {
        const draggedItem = window.JiraStore.get(draggedJiraRequestId);
        if (!draggedItem || jiraRequestTransitionPending || jiraRequestStatusKey(draggedItem.status) === group.key) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        column.classList.add("is-drop-target");
      });
      column.addEventListener("dragleave", (event) => {
        if (!column.contains(event.relatedTarget)) column.classList.remove("is-drop-target");
      });
      column.addEventListener("drop", (event) => {
        event.preventDefault();
        column.classList.remove("is-drop-target");
        const itemId = event.dataTransfer.getData("text/plain") || draggedJiraRequestId;
        transitionJiraRequest(itemId, group.status);
      });
      const header = document.createElement("header");
      header.className = "jira-request-column-header";
      const statusBadge = document.createElement("span");
      statusBadge.className = "jira-status";
      statusBadge.dataset.status = group.status.toLocaleLowerCase("en-US").replaceAll(" ", "_");
      statusBadge.textContent = group.status;
      const count = document.createElement("strong");
      count.textContent = `${groupItems.length} talep`;
      header.append(statusBadge, count);
      const list = document.createElement("div");
      list.className = "jira-request-list";

      if (!groupItems.length) {
        const empty = document.createElement("p");
        empty.className = "jira-request-column-empty";
        empty.textContent = searchTerm ? "Aramayla eşleşen talep yok." : "Bu statüde talep yok.";
        list.append(empty);
      }

      groupItems.forEach((item) => {
        const card = document.createElement("article");
        card.className = "jira-request-card";
        card.draggable = !jiraRequestTransitionPending;
        card.setAttribute("aria-label", `${item.name} talebi; başka bir statü sütununa sürükleyebilirsiniz`);
        card.addEventListener("dragstart", (event) => {
          if (jiraRequestTransitionPending) {
            event.preventDefault();
            return;
          }
          draggedJiraRequestId = item.id;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          card.classList.add("is-dragging");
          setJiraRequestBoardStatus(`${item.name} taşınıyor; hedef statü sütununa bırakın.`, "busy");
        });
        card.addEventListener("dragend", () => {
          draggedJiraRequestId = "";
          card.classList.remove("is-dragging");
          document.querySelectorAll(".jira-request-column.is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
          if (!jiraRequestTransitionPending) setJiraRequestBoardStatus("Statüsünü değiştirmek için talep kartını başka bir sütuna sürükleyin.");
        });
        const keyLink = document.createElement("a");
        keyLink.className = "jira-request-key";
        keyLink.href = item.url;
        keyLink.target = "_blank";
        keyLink.rel = "noopener noreferrer";
        keyLink.textContent = item.name;
        const issueType = document.createElement("span");
        issueType.className = "jira-request-type";
        issueType.textContent = item.issueType || "Task";
        const title = document.createElement("h3");
        title.textContent = item.description;
        const meta = document.createElement("div");
        meta.className = "jira-request-meta";
        [
          `Atanan: ${item.assignee || "Atanmamış"}`,
          `Öncelik: ${item.priority || "Belirtilmedi"}`,
          `Güncelleme: ${item.jiraUpdated || formatJiraTimestamp(item.updatedAt)}`
        ].forEach((value) => {
          const text = document.createElement("span");
          text.textContent = value;
          meta.append(text);
        });
        const top = document.createElement("div");
        top.className = "jira-request-card-top";
        top.append(keyLink, issueType);
        card.append(top, title, meta);
        list.append(card);
      });
      column.append(header, list);
      board.append(column);
    });
  }

  function formatJiraTimestamp(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : dateTimeFormatter.format(parsed);
  }

  function jiraCellText(row, className) {
    return String(row.querySelector(`.${className}`)?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function parseJiraHtml(source) {
    const documentFromFile = new DOMParser().parseFromString(source, "text/html");
    return Array.from(documentFromFile.querySelectorAll("#issuetable tbody tr")).map((row) => {
      const issueLink = row.querySelector(".issuekey a, a.issue-link");
      return {
        issueType: jiraCellText(row, "issuetype") || "Task",
        name: jiraCellText(row, "issuekey") || issueLink?.dataset.issueKey || "",
        description: jiraCellText(row, "summary"),
        url: issueLink?.href || "",
        assignee: jiraCellText(row, "assignee").replace(/^Unassigned$/i, ""),
        reporter: jiraCellText(row, "reporter"),
        priority: jiraCellText(row, "priority"),
        status: jiraCellText(row, "status"),
        resolution: jiraCellText(row, "resolution") || "Unresolved",
        jiraCreated: jiraCellText(row, "created"),
        jiraUpdated: jiraCellText(row, "updated"),
        dueDate: jiraCellText(row, "duedate")
      };
    }).filter((item) => item.name && item.description && item.url);
  }

  function relinkMergedJiraEntries(idRemap = {}) {
    let relinked = 0;
    readEntries().forEach((entry) => {
      const canonicalId = idRemap[entry.jiraId];
      if (!canonicalId) return;
      const canonical = window.JiraStore.get(canonicalId);
      const result = getStore().update(entry.id, {
        ...entry,
        jiraId: canonicalId,
        project: canonical?.name || entry.project
      });
      if (result?.valid !== false) relinked += 1;
    });
    return relinked;
  }

  async function importJiraHtml(file) {
    const importedItems = parseJiraHtml(await file.text());
    if (!importedItems.length) throw new Error("Dosyada #issuetable biçiminde JIRA kaydı bulunamadı.");
    const result = window.JiraStore.mergeAll(importedItems);
    if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "JIRA kayıtları içe aktarılamadı.");
    const relinked = relinkMergedJiraEntries(result.value.idRemap);
    renderJiraItems();
    render();
    $("#jiraFormMessage").textContent = `${result.value.imported} satır işlendi: ${result.value.created} yeni JIRA eklendi, ${result.value.updated} mevcut JIRA güncellendi${result.value.duplicateCount ? `, ${result.value.duplicateCount} mükerrer Key birleştirildi` : ""}. Toplam ${result.value.total} JIRA${relinked ? `; ${relinked} efor bağlantısı korunan kayda taşındı` : ""}.`;
    $("#jiraFormMessage").classList.add("success");
    backupAndReport("İçe aktarılan JIRA maddeleri Drive’a gönderildi.");
  }

  function getTimesheetRange() {
    const period = $("#timesheetPeriod").value;
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if (period === "week") {
      const mondayOffset = (reference.getDay() + 6) % 7;
      const start = addDays(reference, -mondayOffset);
      return { start, end: addDays(start, 6), period };
    }
    if (period === "month") {
      return {
        start: new Date(reference.getFullYear(), reference.getMonth(), 1, 12),
        end: new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 12),
        period
      };
    }
    const startValue = $("#timesheetStartDate").value;
    const endValue = $("#timesheetEndDate").value;
    if (!startValue || !endValue || startValue > endValue) return null;
    return { start: parseDate(startValue), end: parseDate(endValue), period };
  }

  function tableCell(tag, text, className = "") {
    const cell = document.createElement(tag);
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function renderRepeatEntryMode() {
    if (modalEffortMode !== "create") return;
    $("#effortEditModalSubmitLabel").textContent = $("#modalRepeatEntryToggle").checked
      ? "Kaydet ve yeni giriş aç"
      : "Eforu kaydet";
  }

  function loadEffortModalEntry(entryId) {
    const entry = modalEffortEntries.find((item) => item.id === entryId);
    if (!entry) return;
    $("#modalEntrySelect").value = entry.id;
    filterModalJiraOptions(getJiraItem(entry.jiraId)?.id || DUMMY_JIRA.id);
    $("#modalDateInput").value = entry.date;
    $("#modalHoursInput").value = entry.hours;
    $("#modalDescriptionInput").value = entry.task || entry.description || "";
    $("#effortEditModalMessage").textContent = "";
  }

  function openEffortEditModal(sourceEntries) {
    modalEffortMode = "edit";
    $("#modalRepeatEntryToggle").checked = false;
    $("#modalRepeatEntryToggleField").classList.add("hidden");
    modalEffortEntries = sourceEntries.slice().sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    const entrySelect = $("#modalEntrySelect");
    entrySelect.replaceChildren();
    modalEffortEntries.forEach((entry, index) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = `${index + 1}. ${numberFormatter.format(entry.hours)} sa — ${entry.task || entry.description}`;
      entrySelect.append(option);
    });
    $("#modalEntrySelectField").classList.toggle("hidden", modalEffortEntries.length < 2);
    effortJiraPickerSearchState.modal.remote = [];
    $("#modalJiraSearchInput").value = "";
    filterModalJiraOptions();
    if (!modalEffortEntries.length) return;
    $("#effortEditModalTitle").textContent = "Eforu revize et";
    $("#effortEditModalSubmitLabel").textContent = "Değişiklikleri kaydet";
    $("#deleteEffortModal").classList.remove("hidden");
    $("#effortEditModalMessage").classList.remove("success");
    loadEffortModalEntry(modalEffortEntries[0].id);
    setModalJiraPickerOpen(false);
    $("#effortEditModal").showModal();
  }

  function openEffortCreateModal(jiraId, date) {
    modalEffortMode = "create";
    $("#modalRepeatEntryToggleField").classList.remove("hidden");
    $("#modalRepeatEntryToggle").checked = false;
    modalEffortEntries = [];
    $("#modalEntrySelect").replaceChildren();
    $("#modalEntrySelectField").classList.add("hidden");
    effortJiraPickerSearchState.modal.remote = [];
    $("#modalJiraSearchInput").value = "";
    filterModalJiraOptions(getJiraItem(jiraId)?.id || DUMMY_JIRA.id);
    $("#modalDateInput").value = date;
    $("#modalHoursInput").value = "";
    $("#modalDescriptionInput").value = "";
    $("#effortEditModalTitle").textContent = "Timesheet’e efor ekle";
    $("#effortEditModalSubmitLabel").textContent = "Eforu kaydet";
    $("#deleteEffortModal").classList.add("hidden");
    $("#effortEditModalMessage").textContent = "";
    $("#effortEditModalMessage").classList.remove("success");
    setModalJiraPickerOpen(false);
    $("#effortEditModal").showModal();
    $("#modalHoursInput").focus();
  }

  function timesheetGroupKey(entry, jiraItem, grouping) {
    const hasRealJira = Boolean(jiraItem && jiraItem.id !== DUMMY_JIRA.id);
    if (!hasRealJira) return `no-jira:${entry.id}`;
    return grouping === "day" ? "__daily_summary__" : `jira:${jiraItem.id}`;
  }

  function renderTimesheet() {
    const range = getTimesheetRange();
    const table = $("#timesheetTable");
    const head = table.querySelector("thead");
    const body = table.querySelector("tbody");
    const foot = table.querySelector("tfoot");
    head.replaceChildren(); body.replaceChildren(); foot.replaceChildren();
    if (!range) {
      table.classList.add("hidden");
      $("#timesheetEmpty").classList.remove("hidden");
      $("#timesheetPeriodLabel").textContent = "Geçerli bir tarih aralığı seçin";
      $("#timesheetDayCount").textContent = "";
      $("#timesheetTotalHours").textContent = "0 sa";
      return;
    }

    const includeWeekends = $("#includeWeekends").checked;
    const dates = [];
    for (let date = new Date(range.start); date <= range.end; date = addDays(date, 1)) {
      if (includeWeekends || (date.getDay() !== 0 && date.getDay() !== 6)) dates.push(new Date(date));
    }
    const startIso = isoFromDate(range.start);
    const endIso = isoFromDate(range.end);
    const filtered = readEntries().filter((entry) => entry.date >= startIso && entry.date <= endIso && (includeWeekends || ![0, 6].includes(parseDate(entry.date).getDay())));
    const grouping = $("#timesheetGrouping").value;
    const groups = new Map();
    filtered.forEach((entry) => {
      const jiraItem = getJiraItem(entry.jiraId);
      const description = entry.task || entry.description || "";
      const hasRealJira = Boolean(jiraItem && jiraItem.id !== DUMMY_JIRA.id);
      const key = timesheetGroupKey(entry, jiraItem, grouping);
      if (!groups.has(key)) groups.set(key, {
        key,
        issueKey: !hasRealJira ? "JIRA-YOK" : (grouping === "day" ? "GÜNLÜK" : jiraItem?.name),
        issueSummary: !hasRealJira ? (description || "JIRA atanmamış efor") : (grouping === "day" ? "Aynı güne girilen tüm JIRA eforları" : jiraItem?.description),
        priority: !hasRealJira || grouping === "day" ? "—" : (jiraItem?.priority || "—"),
        url: !hasRealJira || grouping === "day" ? "" : (jiraItem?.url || ""),
        jiraId: !hasRealJira || grouping === "day" ? DUMMY_JIRA.id : jiraItem?.id,
        days: new Map(), counts: new Map(), details: new Map(), entries: [], total: 0
      });
      const group = groups.get(key);
      group.entries.push(entry);
      group.days.set(entry.date, (group.days.get(entry.date) || 0) + Number(entry.hours));
      group.counts.set(entry.date, (group.counts.get(entry.date) || 0) + 1);
      if (!group.details.has(entry.date)) group.details.set(entry.date, []);
      group.details.get(entry.date).push(`${description} (${formatHours(entry.hours)})`);
      group.total += Number(entry.hours);
    });
    const rows = Array.from(groups.values()).sort((a, b) =>
      a.issueKey.localeCompare(b.issueKey, "tr", { numeric: true, sensitivity: "base" })
      || a.issueSummary.localeCompare(b.issueSummary, "tr", { numeric: true, sensitivity: "base" }));
    const dayTotals = new Map(dates.map((date) => [isoFromDate(date), 0]));
    let grandTotal = 0;
    const sheetHours = (value) => `${numberFormatter.format(Number(value) || 0)}h`;

    const monthRow = document.createElement("tr");
    monthRow.className = "timesheet-month-row";
    const keyHeader = tableCell("th", "Key", "sticky-column timesheet-key-column");
    const issueHeader = tableCell("th", "Issue", "sticky-column timesheet-issue-column");
    const priorityHeader = tableCell("th", "Priority", "sticky-column timesheet-priority-column");
    [keyHeader, issueHeader, priorityHeader].forEach((cell) => { cell.rowSpan = 2; });
    monthRow.append(keyHeader, issueHeader, priorityHeader);
    const monthGroups = [];
    dates.forEach((date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = monthGroups.at(-1);
      if (current?.key === key) current.count += 1;
      else monthGroups.push({ key, count: 1, date });
    });
    monthGroups.forEach((group) => {
      const cell = tableCell("th", new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(group.date), "month-column");
      cell.colSpan = group.count;
      monthRow.append(cell);
    });
    const totalHeader = tableCell("th", "Toplam", "total-column");
    totalHeader.rowSpan = 2;
    monthRow.append(totalHeader);

    const headerRow = document.createElement("tr");
    headerRow.className = "timesheet-day-row";
    dates.forEach((date) => {
      const cell = tableCell("th", "", "day-column");
      const day = document.createElement("strong");
      day.textContent = String(date.getDate()).padStart(2, "0");
      const weekday = document.createElement("span");
      weekday.textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date);
      cell.append(day, weekday);
      if ([0, 6].includes(date.getDay())) cell.classList.add("weekend");
      headerRow.append(cell);
    });
    head.append(monthRow, headerRow);

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "timesheet-group-row";
      const keyCell = tableCell("td", "", "sticky-column timesheet-key-column");
      const keyLabel = row.url ? document.createElement("a") : document.createElement("strong");
      keyLabel.textContent = row.issueKey;
      if (row.url) {
        keyLabel.href = row.url;
        keyLabel.target = "_blank";
        keyLabel.rel = "noopener noreferrer";
      }
      keyCell.append(keyLabel);
      const priorityCell = tableCell("td", "", "sticky-column timesheet-priority-column");
      const priorityBadge = document.createElement("span");
      priorityBadge.className = "timesheet-priority";
      priorityBadge.textContent = row.priority;
      priorityBadge.dataset.priority = String(row.priority).toLocaleLowerCase("en-US");
      priorityCell.append(priorityBadge);
      tr.append(keyCell, tableCell("td", row.issueSummary, "sticky-column timesheet-issue-column"), priorityCell);
      dates.forEach((date) => {
        const iso = isoFromDate(date);
        const hours = row.days.get(iso) || 0;
        dayTotals.set(iso, (dayTotals.get(iso) || 0) + hours);
        const cell = tableCell("td", "", "hours-cell");
        const count = row.counts.get(iso) || 0;
        if (hours) {
          const effortButton = document.createElement("button");
          effortButton.type = "button";
          effortButton.className = "timesheet-effort-button";
          const entriesForCell = row.entries.filter((entry) => entry.date === iso);
          const effortDescription = entriesForCell
            .map((entry) => `${entry.task || entry.description || "Açıklama girilmedi"} (${formatHours(entry.hours)})`)
            .join("\n");
          const effortHours = document.createElement("span");
          effortHours.className = "timesheet-effort-hours";
          effortHours.textContent = sheetHours(hours);
          effortButton.append(effortHours);
          const jiraSyncCounts = entriesForCell.reduce((counts, entry) => {
            const status = entry.jiraSyncStatus === "synced" && entry.jiraSyncDirection === "imported" ? "imported" : (entry.jiraSyncStatus || "local");
            counts[status] = (counts[status] || 0) + 1;
            return counts;
          }, {});
          const jiraSyncSummary = document.createElement("span");
          jiraSyncSummary.className = "timesheet-jira-sync-summary";
          [
            ["synced", "✓", "JIRA’ya gönderildi"],
            ["imported", "↓", "JIRA’dan alındı"],
            ["local", "○", "JIRA’ya gönderilmedi"],
            ["pending", "↑", "JIRA’ya gönderilmedi · onay bekliyor"],
            ["failed", "!", "JIRA gönderilemedi"]
          ].forEach(([status, icon, label]) => {
            const statusCount = jiraSyncCounts[status] || 0;
            if (!statusCount) return;
            const marker = document.createElement("span");
            marker.className = "timesheet-jira-status";
            marker.dataset.status = status;
            marker.textContent = `${icon}${statusCount > 1 ? statusCount : ""}`;
            marker.title = `${statusCount} efor · ${label}`;
            marker.setAttribute("aria-label", marker.title);
            jiraSyncSummary.append(marker);
          });
          if (jiraSyncSummary.childElementCount) effortButton.append(jiraSyncSummary);
          const syncedCount = jiraSyncCounts.synced || 0;
          const importedCount = jiraSyncCounts.imported || 0;
          const localCount = jiraSyncCounts.local || 0;
          const pendingCount = jiraSyncCounts.pending || 0;
          const failedCount = jiraSyncCounts.failed || 0;
          effortButton.title = effortDescription;
          effortButton.setAttribute("aria-label", `${row.issueKey} · ${dateFormatter.format(date)} · ${sheetHours(hours)} · Açıklama: ${effortDescription.replaceAll("\n", " · ")}${syncedCount ? ` · ${syncedCount} JIRA’ya gönderildi` : ""}${importedCount ? ` · ${importedCount} JIRA’dan alındı` : ""}${localCount ? ` · ${localCount} JIRA’ya gönderilmedi` : ""}${pendingCount ? ` · ${pendingCount} gönderim onayı bekliyor` : ""}${failedCount ? ` · ${failedCount} gönderilemedi` : ""}`);
          effortButton.addEventListener("click", () => openEffortEditModal(entriesForCell));
          cell.append(effortButton);
        } else {
          const addEffortButton = document.createElement("button");
          addEffortButton.type = "button";
          addEffortButton.className = "timesheet-empty-effort-button";
          addEffortButton.textContent = "+";
          addEffortButton.setAttribute("aria-label", `${row.issueKey} için ${dateFormatter.format(date)} tarihine efor ekle`);
          addEffortButton.title = `${row.issueKey} · ${dateFormatter.format(date)} · Efor ekle`;
          addEffortButton.addEventListener("click", () => openEffortCreateModal(row.jiraId, iso));
          cell.append(addEffortButton);
        }
        if (count > 1) {
          cell.classList.add("grouped-day-cell");
          const countLabel = document.createElement("small");
          countLabel.textContent = `${count} kayıt`;
          cell.append(countLabel);
          cell.title = row.details.get(iso).join("\n");
        }
        if ([0, 6].includes(date.getDay())) cell.classList.add("weekend");
        tr.append(cell);
      });
      grandTotal += row.total;
      tr.append(tableCell("td", sheetHours(row.total), "row-total total-column"));
      body.append(tr);
    });

    head.querySelectorAll(".day-column").forEach((cell, index) => {
      const total = dayTotals.get(isoFromDate(dates[index])) || 0;
      cell.classList.toggle("day-complete", total >= 8);
      if (total >= 8) cell.title = `Tamamlandı · ${formatHours(total)}`;
    });

    const totalRow = document.createElement("tr");
    const label = tableCell("th", `Toplam (${rows.length} satır)`, "sticky-column total-label");
    label.colSpan = 3;
    totalRow.append(label);
    dates.forEach((date) => {
      const total = dayTotals.get(isoFromDate(date)) || 0;
      const cell = tableCell("th", total ? sheetHours(total) : "", "hours-cell day-total");
      if (total >= 8) cell.classList.add("day-complete");
      totalRow.append(cell);
    });
    totalRow.append(tableCell("th", sheetHours(grandTotal), "total-column"));
    foot.append(totalRow);

    table.classList.toggle("hidden", rows.length === 0);
    $("#timesheetEmpty").classList.toggle("hidden", rows.length > 0);
    $("#timesheetTotalHours").textContent = formatHours(grandTotal);
    $("#timesheetPeriodLabel").textContent = `${dateFormatter.format(range.start)} – ${dateFormatter.format(range.end)}`;
    $("#timesheetDayCount").textContent = `${dates.length} gün · ${rows.length} satır`;
  }

  function startTaskEdit(task) {
    activateTaskSubview("taskCreateView");
    taskFields.id.value = task.id;
    populateTaskParentOptions(task.id, task.parentTaskId || "");
    taskFields.title.value = task.title;
    populateTaskAssigneeOptions(taskAssigneeSelectValue(task), task.assignee || "");
    taskFields.taskType.value = task.taskType || "architecture_roadmap";
    taskFields.priority.value = task.priority || "";
    taskFields.year.value = task.year || "";
    taskFields.quarter.value = task.quarter || "";
    taskFields.dueDate.value = task.dueDate || "";
    taskFields.status.value = task.status;
    taskFields.descriptionHtml.innerHTML = sanitizeTaskHtml(task.descriptionHtml);
    taskExistingAttachments = Array.isArray(task.attachments) ? task.attachments.slice() : [];
    taskPendingDocuments = [];
    renderTaskDocuments();
    $("#taskFormTitle").textContent = "Görevi revize et";
    $("#taskSubmitLabel").textContent = "Değişiklikleri kaydet";
    $("#cancelTaskEdit").classList.remove("hidden");
    taskFields.title.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startSubtaskCreate(parentTask) {
    resetTaskForm();
    activateTaskSubview("taskCreateView");
    populateTaskParentOptions("", parentTask.id);
    taskFields.parentTaskId.value = parentTask.id;
    populateTaskAssigneeOptions(taskAssigneeSelectValue(parentTask), parentTask.assignee || "");
    taskFields.priority.value = parentTask.priority || "";
    taskFields.year.value = parentTask.year || "";
    taskFields.quarter.value = parentTask.quarter || "";
    $("#taskFormTitle").textContent = "Alt görev ekle";
    $("#taskSubmitLabel").textContent = "Alt görevi ekle";
    $("#cancelTaskEdit").classList.remove("hidden");
    taskFields.title.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetTaskForm() {
    taskForm.reset();
    taskFields.id.value = "";
    populateTaskParentOptions();
    taskFields.parentTaskId.value = "";
    populateTaskAssigneeOptions("");
    taskFields.taskType.value = "architecture_roadmap";
    taskFields.priority.value = "";
    taskFields.year.value = "";
    taskFields.quarter.value = "";
    taskFields.dueDate.value = "";
    taskFields.status.value = "planned";
    taskFields.descriptionHtml.replaceChildren();
    taskExistingAttachments = [];
    taskPendingDocuments = [];
    taskFields.documents.value = "";
    renderTaskDocuments();
    $("#taskFormTitle").textContent = "Görev ekle";
    $("#taskSubmitLabel").textContent = "Görevi ekle";
    $("#cancelTaskEdit").classList.add("hidden");
    $("#taskFormMessage").textContent = "";
    $("#taskFormMessage").classList.remove("success");
  }

  function formatDocumentSize(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  }

  function taskDocumentUrl(attachment) {
    const value = String(attachment?.webViewLink || attachment?.webContentLink || "").trim();
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
  }

  function renderTaskDocuments() {
    const list = $("#taskDocumentList");
    const summary = $("#taskDocumentSelectionSummary");
    if (!list || !summary) return;
    list.replaceChildren();
    taskExistingAttachments.forEach((attachment) => {
      const row = document.createElement("div");
      row.className = "task-document-item is-uploaded";
      const link = document.createElement("a");
      const documentUrl = taskDocumentUrl(attachment);
      if (documentUrl) link.href = documentUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = attachment.name;
      const meta = document.createElement("span");
      meta.textContent = `${formatDocumentSize(attachment.size)} · Drive’da`;
      row.append(link, meta);
      list.append(row);
    });
    taskPendingDocuments.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "task-document-item is-pending";
      const name = document.createElement("strong");
      name.textContent = file.name;
      const meta = document.createElement("span");
      meta.textContent = `${formatDocumentSize(file.size)} · Yüklenmeyi bekliyor`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "task-document-remove";
      remove.dataset.pendingDocumentIndex = String(index);
      remove.textContent = "Kaldır";
      row.append(name, meta, remove);
      list.append(row);
    });
    const total = taskExistingAttachments.length + taskPendingDocuments.length;
    summary.textContent = total
      ? `${total} doküman${taskPendingDocuments.length ? ` · ${taskPendingDocuments.length} yeni` : ""}`
      : "Doküman seçilmedi";
    list.classList.toggle("hidden", total === 0);
  }

  function applyInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const editTaskId = params.get("editTask");
    const parentTaskId = params.get("parentTask");
    const taskStatus = params.get("taskStatus") || "";
    if (["planned", "in_progress", "completed"].includes(taskStatus)) {
      $("#taskStatusFilter").value = taskStatus;
      renderTasks();
    }
    if (params.get("view") !== "tasks" && !editTaskId && !parentTaskId) return;
    activateMainView("tasksView");
    if (editTaskId) {
      const task = window.TaskStore.get(editTaskId);
      if (task) startTaskEdit(task);
      else activateTaskSubview("taskReportView");
      return;
    }
    if (parentTaskId) {
      const parentTask = window.TaskStore.get(parentTaskId);
      if (parentTask) startSubtaskCreate(parentTask);
      else activateTaskSubview("taskReportView");
      return;
    }
    activateTaskSubview("taskReportView");
  }

  function startEdit(entry) {
    fields.id.value = entry.id;
    fields.date.value = entry.date;
    fields.description.value = entry.task || entry.description || "";
    fields.hours.value = entry.hours;
    $("#jiraItemSearchInput").value = "";
    filterEffortJiraOptions(entry.jiraId || DUMMY_JIRA.id);
    setEffortJiraPickerOpen(false);
    $("#submitLabel").textContent = "Değişiklikleri kaydet";
    $("#cancelEditButton").classList.remove("hidden");
    updateCount();
    $("#jiraItemPickerButton").focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm(preferredDate = isoToday()) {
    if (typeof preferredDate !== "string") preferredDate = isoToday();
    form.reset();
    fields.id.value = "";
    fields.date.value = preferredDate;
    $("#jiraItemSearchInput").value = "";
    filterEffortJiraOptions(DUMMY_JIRA.id);
    setEffortJiraPickerOpen(false);
    $("#submitLabel").textContent = "Kaydı ekle";
    $("#cancelEditButton").classList.add("hidden");
    $("#formMessage").textContent = "";
    $("#formMessage").classList.remove("success");
    Object.values(fields).forEach((field) => field.removeAttribute("aria-invalid"));
    $("#jiraItemPickerButton").removeAttribute("aria-invalid");
    updateCount();
  }

  function updateCount() { $("#descriptionCount").textContent = fields.description.value.length; }

  function setDriveStatus(message, isError = false) {
    const status = $("#driveStatus");
    status.textContent = message;
    status.classList.toggle("drive-error", isError);
    $(".drive-toolbar-status").classList.toggle("is-connected", window.DriveSync?.hasAccessToken() && !isError);
    refreshDriveHeaderMenu();
  }

  function maskedGoogleClientId(value) {
    const clientId = String(value || "").trim();
    if (!clientId) return "Henüz kaydedilmedi";
    const suffix = ".apps.googleusercontent.com";
    return `${clientId.slice(0, Math.min(8, clientId.length))}••••${clientId.endsWith(suffix) ? suffix : clientId.slice(-12)}`;
  }

  function setDriveSettingsEditing(editing) {
    const clientId = window.DriveSync?.getClientId() || "";
    const showEditor = Boolean(editing || !clientId);
    $("#driveSettingsEditor").classList.toggle("hidden", !showEditor);
    $("#driveSettingsSummary").classList.toggle("hidden", showEditor);
    $("#googleClientId").value = clientId;
    if (showEditor && editing) $("#googleClientId").focus();
  }

  function refreshDriveHeaderMenu() {
    const menu = $("#driveHeaderMenu");
    const clientId = window.DriveSync?.getClientId() || "";
    const configured = Boolean(clientId);
    const connected = Boolean(window.DriveSync?.hasAccessToken());
    const isError = $("#driveStatus").classList.contains("drive-error");
    const isBusy = menu.classList.contains("is-busy");
    menu.classList.toggle("is-connected", connected && !isError);
    menu.classList.toggle("is-error", isError);
    $("#driveClientIdPreview").textContent = maskedGoogleClientId(clientId);
    const state = isError ? "error" : isBusy ? "connecting" : connected ? "connected" : configured ? "configured" : "unconfigured";
    const labels = {
      error: "Bağlantı hatası", connecting: "Bağlanıyor…", connected: "Bağlı",
      configured: "Ayarlar kayıtlı", unconfigured: "Kurulum gerekli"
    };
    const badge = $("#driveConnectionBadge");
    badge.dataset.state = state;
    badge.textContent = labels[state];
    $("#headerDriveMenuLabel").textContent = isError
      ? "Bağlantı hatası"
      : isBusy
        ? "Bağlanıyor"
        : connected
          ? "Drive bağlı"
          : configured
            ? "Drive hazır"
            : "Kurulum gerekli";
    const showHeaderBadge = isBusy || isError;
    $("#headerDriveMenuBadge").classList.toggle("hidden", !showHeaderBadge);
    $("#headerDriveMenuBadge").textContent = isBusy ? "Bağlanıyor" : "Hata";
    $(".drive-toolbar-status").classList.toggle("is-connected", connected && !isError);
    $("#backupToDrive").disabled = isBusy || !configured;
    $("#restoreFromDrive").disabled = isBusy || !configured;
  }

  function updateLastBackupTime(value = window.DriveSync?.getLastBackupTime()) {
    $("#lastBackupTime").textContent = value ? dateTimeFormatter.format(new Date(value)) : "Henüz yedeklenmedi";
  }

  function backupBundle() {
    return {
      entries: readEntries(),
      tasks: window.TaskStore.list(),
      people: window.PeopleStore.list(),
      jiraItems: window.JiraStore.list(),
      reminders: window.ReminderStore.list()
    };
  }

  function bundleRecordCount(bundle = backupBundle()) {
    return ["entries", "tasks", "people", "jiraItems", "reminders"]
      .reduce((total, key) => total + (Array.isArray(bundle[key]) ? bundle[key].length : 0), 0);
  }

  function setSupabaseStatus(message, state = "neutral") {
    ["#supabaseStatus", "#loginScreenStatus"].forEach((selector) => {
      const status = $(selector);
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("is-error", state === "error");
      status.classList.toggle("is-success", state === "success");
      status.classList.toggle("is-busy", state === "busy");
    });
    $("#supabaseConnectionBadge").dataset.state = state === "error" ? "error" : (supabaseSession ? "signed-in" : "signed-out");
    $("#supabaseHeaderMenu").classList.toggle("is-error", state === "error");
  }

  function setSupabaseBusy(busy) {
    supabaseBusy = Boolean(busy);
    ["#supabaseEmail", "#supabasePassword", "#supabaseSignIn", "#supabaseSignUp", "#supabaseForgotPassword", "#supabaseNewPassword", "#supabasePull", "#supabaseSignOut", "#loginScreenEmail", "#loginScreenPassword", "#loginScreenSignIn", "#loginScreenSignUp", "#loginScreenForgotPassword"]
      .forEach((selector) => { const element = $(selector); if (element) element.disabled = supabaseBusy; });
    $("#supabaseHeaderMenu").classList.toggle("is-busy", supabaseBusy);
    $("#loginScreen")?.classList.toggle("is-busy", supabaseBusy);
  }

  function setLoginScreenVisible(visible) {
    const loginScreen = $("#loginScreen");
    if (!loginScreen) return;
    loginScreen.classList.toggle("hidden", !visible);
    loginScreen.setAttribute("aria-hidden", String(!visible));
    document.body.classList.toggle("auth-required", visible);
    const pageHeader = document.querySelector(".page-header");
    const pageMain = document.querySelector("main");
    if (pageHeader) pageHeader.inert = visible;
    if (pageMain) pageMain.inert = visible;
  }

  function syncSupabaseAuthInputs(email, password = "") {
    const normalizedEmail = String(email || "").trim();
    ["#supabaseEmail", "#loginScreenEmail"].forEach((selector) => {
      const input = $(selector);
      if (input) input.value = normalizedEmail;
    });
    if (!password) return;
    ["#supabasePassword", "#loginScreenPassword"].forEach((selector) => {
      const input = $(selector);
      if (input) input.value = password;
    });
  }

  function updateSupabaseLastSync(value) {
    if (value) lastSupabaseSyncAt = value;
    $("#supabaseLastSync").textContent = lastSupabaseSyncAt
      ? `Bulut güncellendi: ${dateTimeFormatter.format(new Date(lastSupabaseSyncAt))}`
      : "Bulut verileri henüz yüklenmedi.";
  }

  function applyCloudUserSettings(settings = {}) {
    cloudUserSettings = settings && typeof settings === "object" ? { ...settings } : {};
    activeCalendarProvider = cloudUserSettings.calendarProvider === "outlook" ? "outlook" : "google";
    applyTheme(cloudUserSettings.theme || "violet");
    jiraTableLayout = loadJiraTableLayout(cloudUserSettings.jiraTableLayout);
    window.DriveSync?.setClientId(cloudUserSettings.googleClientId || "");
    window.DriveSync?.setLastBackupTime(cloudUserSettings.lastDriveBackupAt || "");
    window.OutlookCalendar?.saveSettings(
      cloudUserSettings.outlookCalendar?.clientId || "",
      cloudUserSettings.outlookCalendar?.tenantId || "organizations"
    );
    window.AiAssistantClient?.setEndpoint(cloudUserSettings.aiEndpoint || window.AiAssistantClient.DEFAULT_ENDPOINT);
    window.JiraCloudClient?.setEndpoint("supabase:jira-proxy");
    applyWeatherLocationSetting(cloudUserSettings.weatherLocation || DEFAULT_WEATHER_LOCATION);
    if ($("#jiraSyncJql") && typeof cloudUserSettings.jiraSyncJql === "string") {
      $("#jiraSyncJql").value = cloudUserSettings.jiraSyncJql;
    }
    if ($("#jiraAutoWorklog")) $("#jiraAutoWorklog").checked = cloudUserSettings.jiraAutoWorklog !== false;
    if ($("#googleClientId")) $("#googleClientId").value = window.DriveSync?.getClientId() || "";
    if ($("#aiAssistantEndpoint")) $("#aiAssistantEndpoint").value = window.AiAssistantClient.getEndpoint();
    updateLastBackupTime();
    setDriveSettingsEditing(false);
    updateCalendarProviderUi();
  }

  function queueCloudUserSettings(patch = {}) {
    if (!supabaseSession?.user || !cloudDataReady) {
      setSupabaseStatus("Ayar kaydedilemedi: Supabase verileri hazır değil.", "error");
      return Promise.resolve(false);
    }
    cloudUserSettings = { ...cloudUserSettings, ...patch };
    const snapshot = { ...cloudUserSettings };
    cloudSettingsSavePending += 1;
    cloudSettingsSaveChain = cloudSettingsSaveChain
      .catch(() => null)
      .then(() => window.SupabaseCloud.updateUserSettings(snapshot))
      .then((saved) => {
        cloudUserSettings = { ...saved };
        return true;
      })
      .catch((error) => {
        setSupabaseStatus(`Bulut ayarları kaydedilemedi: ${error.message}`, "error");
        return false;
      })
      .finally(() => { cloudSettingsSavePending = Math.max(0, cloudSettingsSavePending - 1); });
    return cloudSettingsSaveChain;
  }

  function setCloudDataGate(state, message = "") {
    const gate = $("#cloudDataGate");
    const ready = state === "ready";
    gate.classList.toggle("hidden", ready);
    gate.dataset.state = state;
    document.body.classList.toggle("cloud-data-locked", !ready);
    $("#cloudDataGateTitle").textContent = ({
      loading: "Supabase verileri yükleniyor",
      signed_out: "Bulut hesabına giriş gerekli",
      error: "Supabase verileri açılamadı"
    })[state] || "Supabase bağlantısı kontrol ediliyor";
    $("#cloudDataGateMessage").textContent = message || ({
      loading: "Efor, görev, kişi, JIRA ve hatırlatma kayıtları hazırlanıyor.",
      signed_out: "Uygulama verileri yalnızca Supabase hesabınızdan okunur.",
      error: "Bağlantıyı kontrol edip yeniden deneyin."
    })[state] || "Uygulama verileri buluttan hazırlanıyor.";
  }

  function clearCloudMemory() {
    window.CloudDataRuntime.clear();
    renderJiraItems();
    render();
    renderPeople();
    renderTasks();
  }

  async function refreshSupabaseAccount(session = supabaseSession) {
    supabaseSession = session || null;
    const signedIn = Boolean(supabaseSession?.user);
    setLoginScreenVisible(!signedIn);
    $("#supabaseAuthForm").classList.toggle("hidden", signedIn);
    $("#supabaseSignedInPanel").classList.toggle("hidden", !signedIn);
    $("#supabaseHeaderMenu").classList.toggle("is-connected", signedIn);
    $("#headerSupabaseMenuBadge").classList.add("hidden");
    $("#supabaseConnectionBadge").dataset.state = signedIn ? "signed-in" : "signed-out";
    $("#supabaseConnectionBadge").textContent = signedIn ? "Bağlı" : "Bağlı değil";
    $("#headerSupabaseMenuLabel").textContent = signedIn ? "Supabase bağlı" : "Giriş gerekli";
    updateSupabaseLastSync();

    if (!signedIn) {
      cloudDataReady = false;
      cloudLoadedUserId = "";
      lastSupabaseSyncAt = null;
      applyCloudUserSettings({});
      clearCloudMemory();
      $("#supabaseUserEmail").textContent = "-";
      $("#supabaseOrganizationName").textContent = "-";
      setCloudDataGate("signed_out");
      setSupabaseStatus("Uygulama verilerini açmak için Supabase hesabınıza giriş yapın.");
      window.setTimeout(() => $("#loginScreenEmail")?.focus(), 0);
      return;
    }

    $("#supabaseUserEmail").textContent = supabaseSession.user.email || "Supabase kullanıcısı";
    try {
      await ensureCloudDataLoaded();
    } catch (error) {
      cloudDataReady = false;
      setCloudDataGate("error", error.message);
      setSupabaseStatus(`Supabase çalışma alanı alınamadı: ${error.message}`, "error");
    }
  }

  function replaceLocalBundle(bundle) {
    window.CloudDataRuntime.suspend(() => {
      const entryResult = getStore().replaceAll(bundle.entries || []);
      if (!entryResult.valid) throw new Error(Object.values(entryResult.errors || {}).join(" ") || "Efor verileri doğrulanamadı.");
      const taskResult = window.TaskStore.replaceAll(bundle.tasks || []);
      if (!taskResult.valid) throw new Error(Object.values(taskResult.errors || {}).join(" ") || "Görev verileri doğrulanamadı.");
      const peopleResult = window.PeopleStore.replaceAll(bundle.people || []);
      if (!peopleResult.valid) throw new Error(Object.values(peopleResult.errors || {}).join(" ") || "Kişi verileri doğrulanamadı.");
      const jiraResult = window.JiraStore.replaceAll(bundle.jiraItems || []);
      if (!jiraResult.valid) throw new Error(Object.values(jiraResult.errors || {}).join(" ") || "JIRA verileri doğrulanamadı.");
      const reminderResult = window.ReminderStore.replaceAll(bundle.reminders || []);
      if (!reminderResult.valid) throw new Error(Object.values(reminderResult.errors || {}).join(" ") || "Hatırlatma verileri doğrulanamadı.");
      window.TaskStore.ensureHierarchy();
    });
    renderJiraItems();
    render();
    renderPeople();
    renderTasks();
  }

  async function pullFromSupabase() {
    if (!supabaseSession?.user) throw new Error("Supabase hesabına giriş yapmanız gerekiyor.");
    if (!await waitForDataSaves()) throw new Error("Bekleyen değişiklikler Supabase'e kaydedilemediği için bulut verileri yenilenmedi.");
    cloudDataReady = false;
    setCloudDataGate("loading");
    setSupabaseStatus("Supabase verileri otomatik yükleniyor…", "busy");
    const bundle = await window.SupabaseCloud.pullBundle();
    applyCloudUserSettings(bundle.settings || {});
    replaceLocalBundle(bundle);
    const syncedAt = bundle.lastModifiedAt || new Date().toISOString();
    cloudDataReady = true;
    cloudLoadedUserId = supabaseSession.user.id;
    updateSupabaseLastSync(syncedAt);
    $("#supabaseOrganizationName").textContent = bundle.context.organizationName;
    setCloudDataGate("ready");
    setSupabaseStatus(`${bundleRecordCount(bundle)} kayıt Supabase’den otomatik yüklendi. Değişiklikler doğrudan buluta kaydedilecek.`, "success");
    await initializeCalendar();
    return true;
  }

  async function ensureCloudDataLoaded() {
    const userId = supabaseSession?.user?.id || "";
    if (!userId) return false;
    if (cloudDataReady && cloudLoadedUserId === userId) return true;
    if (cloudLoadPromise) return cloudLoadPromise;
    cloudLoadPromise = pullFromSupabase();
    try { return await cloudLoadPromise; }
    finally { cloudLoadPromise = null; }
  }

  function queueCloudChange(change) {
    if (!supabaseSession?.user || !cloudDataReady) {
      setCloudDataGate("signed_out", "Veri değişikliği için Supabase hesabının açık ve verilerin yüklenmiş olması gerekir.");
      setSupabaseStatus("Değişiklik kaydedilemedi: Supabase verileri hazır değil.", "error");
      cloudSaveChain = Promise.resolve(false);
      return cloudSaveChain;
    }
    const revision = ++cloudSaveRevision;
    cloudSavePending += 1;
    setSupabaseStatus("Değişiklik Supabase’e kaydediliyor…", "busy");
    cloudSaveChain = cloudSaveChain
      .catch(() => null)
      .then(() => window.SupabaseCloud.applyChanges(change))
      .then((result) => {
        updateSupabaseLastSync(result.syncedAt);
        if (revision === cloudSaveRevision) setSupabaseStatus("Tüm değişiklikler Supabase’e kaydedildi.", "success");
        return true;
      })
      .catch((error) => {
        setSupabaseStatus(`Supabase otomatik kaydı başarısız: ${error.message}`, "error");
        return false;
      })
      .finally(() => { cloudSavePending = Math.max(0, cloudSavePending - 1); });
    return cloudSaveChain;
  }

  async function waitForDataSaves() {
    try { return (await cloudSaveChain) !== false && cloudSavePending === 0; }
    catch { return false; }
  }

  async function waitForCloudSaves() {
    try {
      const [dataSaved, settingsSaved] = await Promise.all([waitForDataSaves(), cloudSettingsSaveChain]);
      return dataSaved && settingsSaved !== false && cloudSettingsSavePending === 0;
    }
    catch { return false; }
  }

  async function runSupabaseAction(action) {
    if (supabaseBusy) return;
    setSupabaseBusy(true);
    try { return await action(); }
    catch (error) {
      setSupabaseStatus(error.message || "Supabase işlemi tamamlanamadı.", "error");
      return false;
    } finally { setSupabaseBusy(false); }
  }

  async function backupLocalDataToDrive(message = "Değişiklikler Google Drive’a kaydedildi.") {
    setDriveStatus("Veriler Google Drive’a gönderiliyor…");
    try {
      const result = await window.DriveSync.backup(backupBundle());
      updateLastBackupTime(result.modifiedTime);
      await queueCloudUserSettings({ lastDriveBackupAt: result.modifiedTime });
      setDriveStatus(message);
      return true;
    } catch (error) {
      setDriveStatus(`Drive yedeklemesi yapılamadı: ${error.message}`, true);
      return false;
    }
  }

  function setDriveBusy(busy) {
    ["#saveDriveSettings", "#cancelDriveSettings", "#editDriveSettings", "#backupToDrive", "#restoreFromDrive", "#skipInitialRestore"].forEach((selector) => {
      $(selector).disabled = busy;
    });
    $("#driveHeaderMenu").classList.toggle("is-busy", busy);
    $("#driveCompactPanel").setAttribute("aria-busy", String(Boolean(busy)));
    refreshDriveHeaderMenu();
  }

  async function backupAndReport() {
    return waitForCloudSaves();
  }

  async function restoreFromDrive() {
    const backup = await window.DriveSync.restore();
    if (!confirm(`Drive yedeğindeki ${backup.entries.length} efor, ${(backup.tasks || []).length} görev, ${(backup.people || []).length} kişi, ${(backup.jiraItems || []).length} JIRA maddesi ve ${(backup.reminders || []).length} hatırlatma Supabase verilerinin yerine aktarılsın mı?`)) {
      setDriveStatus("Geri yükleme iptal edildi.");
      return;
    }
    const result = getStore().replaceAll(backup.entries);
    if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "Yedek doğrulanamadı.");
    const taskResult = window.TaskStore.replaceAll(backup.tasks || []);
    if (!taskResult.valid) throw new Error(Object.values(taskResult.errors || {}).join(" ") || "Görev yedeği doğrulanamadı.");
    const peopleResult = window.PeopleStore.replaceAll(backup.people || []);
    if (!peopleResult.valid) throw new Error(Object.values(peopleResult.errors || {}).join(" ") || "Kişi yedeği doğrulanamadı.");
    window.TaskStore.ensureHierarchy();
    const jiraResult = window.JiraStore.replaceAll(backup.jiraItems || []);
    if (!jiraResult.valid) throw new Error(Object.values(jiraResult.errors || {}).join(" ") || "JIRA yedeği doğrulanamadı.");
    const reminderResult = window.ReminderStore.replaceAll(backup.reminders || []);
    if (!reminderResult.valid) throw new Error(Object.values(reminderResult.errors || {}).join(" ") || "Hatırlatma yedeği doğrulanamadı.");
    renderJiraItems();
    render();
    renderPeople();
    renderTasks();
    await waitForCloudSaves();
    updateLastBackupTime(backup.file.modifiedTime);
    await queueCloudUserSettings({ lastDriveBackupAt: backup.file.modifiedTime });
    setDriveStatus(`${backup.entries.length} efor, ${(backup.tasks || []).length} görev ve ${(backup.people || []).length} kişi Google Drive’dan Supabase’e aktarıldı.`);
  }

  async function runDriveAction(action) {
    setDriveBusy(true);
    try { await action(); }
    catch (error) { setDriveStatus(error.message || "Google Drive işlemi tamamlanamadı.", true); }
    finally { setDriveBusy(false); }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const invalid = Object.values(fields).filter((field) => field !== fields.id && !field.checkValidity());
    Object.values(fields).forEach((field) => field.toggleAttribute("aria-invalid", invalid.includes(field)));
    $("#jiraItemPickerButton").toggleAttribute("aria-invalid", invalid.includes(fields.jiraId));
    if (invalid.length) {
      $("#formMessage").textContent = "Lütfen zorunlu alanları geçerli bilgilerle doldurun.";
      if (invalid[0] === fields.jiraId) setEffortJiraPickerOpen(true);
      else invalid[0].focus();
      return;
    }
    const editing = Boolean(fields.id.value);
    const previousEntry = editing ? getStore()?.get?.(fields.id.value) : null;
    const savedDate = fields.date.value;
    const selectedJira = getJiraItem(fields.jiraId.value);
    if (!selectedJira) {
      $("#formMessage").textContent = "Efor kaydı için geçerli bir JIRA maddesi seçin.";
      $("#jiraItemPickerButton").setAttribute("aria-invalid", "true");
      setEffortJiraPickerOpen(true);
      return;
    }
    const result = saveEntry({
      id: fields.id.value || undefined,
      date: fields.date.value,
      project: selectedJira.name,
      task: fields.description.value.trim(),
      jiraId: fields.jiraId.value,
      hours: Number(fields.hours.value),
      notes: ""
    });
    if (result?.valid === false) {
      const messages = Object.values(result.errors || {});
      $("#formMessage").textContent = messages.join(" ") || "Kayıt kaydedilemedi.";
      return;
    }
    resetForm(savedDate);
    const jiraSync = await syncEffortToJira(result.value, previousEntry);
    $("#formMessage").textContent = jiraSync.ok
      ? `${editing ? "Kayıt güncellendi" : "Efor kaydı eklendi"} ve JIRA worklog’una gönderildi.`
      : (jiraSync.approvalDeclined
        ? `${editing ? "Kayıt güncellendi" : "Efor kaydı eklendi"}; JIRA gönderimi onaylanmadı.`
        : jiraSync.skipped
        ? (editing ? "Kayıt güncellendi." : "Efor kaydı eklendi.")
        : `${editing ? "Kayıt güncellendi" : "Efor kaydı eklendi"}; JIRA gönderimi bekliyor.`);
    $("#formMessage").classList.add("success");
    render();
    backupAndReport(editing ? "Güncellenen kayıt bekliyor." : "Yeni kayıt bekliyor.");
  });

  personForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingPerson = personFields.id.value ? window.PeopleStore.get(personFields.id.value) : null;
    const payload = {
      fullName: personFields.fullName.value,
      email: personFields.email.value,
      title: personFields.title.value,
      role: personFields.role.value,
      managerId: personFields.managerId.value
    };
    const result = editingPerson
      ? window.PeopleStore.update(editingPerson.id, payload)
      : window.PeopleStore.create(payload);
    if (!result.valid) {
      $("#personFormMessage").textContent = Object.values(result.errors || {}).join(" ");
      $("#personFormMessage").classList.remove("success");
      return;
    }
    const linkedTasks = synchronizeTasksForPerson(result.value, editingPerson?.fullName || "");
    resetPersonForm();
    renderTasks();
    renderPeople();
    $("#personFormMessage").textContent = editingPerson
      ? `Kişi güncellendi${linkedTasks ? `; ${linkedTasks} görevdeki atama yenilendi` : ""}.`
      : `Kişi eklendi${linkedTasks ? `; ${linkedTasks} eski görev kaydı bu kişiye bağlandı` : ""}.`;
    $("#personFormMessage").classList.add("success");
    backupAndReport(editingPerson ? "Güncellenen kişi Drive’a gönderildi." : "Yeni kişi Drive’a gönderildi.");
  });

  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const editing = Boolean(taskFields.id.value);
    const selectedParent = tasks.find((task) => task.id === taskFields.parentTaskId.value) || null;
    const creatingSubtask = !editing && Boolean(selectedParent);
    const assignment = selectedTaskAssignment();
    const taskId = taskFields.id.value || window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const payload = {
      title: taskFields.title.value.trim(),
      parentTaskId: selectedParent?.id || "",
      parentItem: selectedParent?.title || "",
      assignee: assignment.assignee,
      assigneeId: assignment.assigneeId,
      taskType: taskFields.taskType.value,
      priority: taskFields.priority.value,
      year: taskFields.year.value,
      quarter: taskFields.quarter.value,
      dueDate: taskFields.dueDate.value,
      status: taskFields.status.value,
      descriptionHtml: sanitizeTaskHtml(taskFields.descriptionHtml.innerHTML),
      attachments: taskExistingAttachments.slice()
    };
    const validation = window.TaskStore.validate(payload);
    if (!validation.valid) {
      $("#taskFormMessage").textContent = Object.values(validation.errors || {}).join(" ");
      $("#taskFormMessage").classList.remove("success");
      return;
    }
    const submitButton = taskForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    taskFields.documents.disabled = true;
    try {
      if (taskPendingDocuments.length) {
        if (!window.DriveSync?.getClientId()) {
          $("#driveHeaderMenu").open = true;
          throw new Error("Doküman yüklemek için önce Ayarlar > Google Drive bölümünden OAuth Client ID’nizi kaydedin.");
        }
        const uploaded = await window.DriveSync.uploadTaskDocuments(
          { taskId, title: payload.title },
          taskPendingDocuments,
          ({ current, total, file }) => {
            $("#taskFormMessage").textContent = `${current}/${total} · “${file.name}” Google Drive’a yükleniyor…`;
            $("#taskFormMessage").classList.remove("success");
          }
        );
        payload.attachments = [...taskExistingAttachments, ...uploaded];
      }
      const taskSnapshot = window.TaskStore.list();
      const result = editing ? window.TaskStore.update(taskFields.id.value, payload) : window.TaskStore.create({ id: taskId, ...payload });
      if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" "));
      if (!await waitForDataSaves()) {
        window.CloudDataRuntime.suspend(() => window.TaskStore.replaceAll(taskSnapshot));
        renderTasks();
        throw new Error("Supabase kaydı tamamlanamadı. Görev bellekte geri alındı; bağlantınızı kontrol edip yeniden deneyin.");
      }
      if (creatingSubtask && selectedParent) expandedTaskIds.add(selectedParent.id);
      resetTaskForm();
      $("#taskFormMessage").textContent = editing ? "Görev güncellendi." : (creatingSubtask ? "Alt görev eklendi." : "Görev eklendi.");
      $("#taskFormMessage").classList.add("success");
      renderTasks();
      activateTaskSubview("taskReportView");
      backupAndReport(editing ? "Güncellenen görev Drive’a gönderildi." : "Yeni görev Drive’a gönderildi.");
    } catch (error) {
      $("#taskFormMessage").textContent = `Görev kaydedilmedi: ${error.message}`;
      $("#taskFormMessage").classList.remove("success");
    } finally {
      submitButton.disabled = false;
      taskFields.documents.disabled = false;
    }
  });

  taskFields.documents.addEventListener("change", () => {
    const selected = Array.from(taskFields.documents.files || []);
    selected.forEach((file) => {
      const duplicate = taskPendingDocuments.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if (!duplicate) taskPendingDocuments.push(file);
    });
    taskFields.documents.value = "";
    renderTaskDocuments();
  });

  $("#taskDocumentList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-pending-document-index]");
    if (!button) return;
    taskPendingDocuments.splice(Number(button.dataset.pendingDocumentIndex), 1);
    renderTaskDocuments();
  });

  reminderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editingItem = reminderFields.id.value ? window.ReminderStore.get(reminderFields.id.value) : null;
    const payload = {
      text: reminderFields.text.value.trim(),
      remindAt: reminderFields.remindAt.value,
      importance: reminderFields.importance.value,
      completed: editingItem?.completed || false
    };
    const result = editingItem
      ? window.ReminderStore.update(editingItem.id, payload)
      : window.ReminderStore.create(payload);
    if (!result.valid) {
      $("#reminderFormMessage").textContent = Object.values(result.errors || {}).join(" ");
      $("#reminderFormMessage").classList.remove("success");
      return;
    }
    closeReminderModal();
    renderReminders();
    backupAndReport(editingItem ? "Güncellenen hatırlatma Drive’a gönderildi." : "Yeni hatırlatma Drive’a gönderildi.");
  });

  jiraForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    jiraFields.name.value = jiraFields.name.value.trim().toUpperCase();
    if (!jiraFields.name.checkValidity()) {
      $("#jiraFormMessage").textContent = "RD-179 gibi geçerli bir JIRA Key girin.";
      $("#jiraFormMessage").classList.remove("success");
      jiraFields.name.focus();
      return;
    }
    await fetchJiraIssueByKey(jiraFields.name.value);
  });

  $("#cancelTaskEdit").addEventListener("click", resetTaskForm);
  $("#cancelPersonEdit").addEventListener("click", resetPersonForm);
  $("#syncJiraUsers").addEventListener("click", syncJiraPeople);
  $("#peopleSearchInput").addEventListener("input", renderPeople);
  $("#peopleSourceFilter").addEventListener("change", renderPeople);
  $("#openReminderModal").addEventListener("click", openReminderCreateModal);
  $("#closeReminderModal").addEventListener("click", closeReminderModal);
  $("#cancelReminderEdit").addEventListener("click", closeReminderModal);
  $("#reminderModal").addEventListener("cancel", () => resetReminderForm());
  document.querySelectorAll("[data-calendar-provider]").forEach((button) => {
    button.addEventListener("click", () => selectCalendarProvider(button.dataset.calendarProvider));
  });
  $("#connectOutlookCalendar").addEventListener("click", connectCalendar);
  $("#refreshOutlookCalendar").addEventListener("click", refreshCalendar);
  $("#disconnectOutlookCalendar").addEventListener("click", async () => {
    const provider = activeCalendarProvider;
    setCalendarStatus(`${calendarProviderLabel(provider)} bağlantısı kesiliyor…`, "busy");
    try {
      if (provider === "google") window.GoogleCalendar.signOut();
      else await window.OutlookCalendar.signOut();
      calendarEvents = [];
      renderCalendar();
      setCalendarConnection(null);
      setCalendarStatus(`${calendarProviderLabel(provider)} bağlantısı kesildi.`);
    } catch (error) {
      setCalendarStatus(`${calendarProviderLabel(provider)} bağlantısı kesilemedi: ${error.message}`, "error");
    }
  });
  $("#calendarPreviousMonth").addEventListener("click", () => changeCalendarMonth(-1));
  $("#calendarToday").addEventListener("click", () => changeCalendarMonth(0, true));
  $("#calendarNextMonth").addEventListener("click", () => changeCalendarMonth(1));
  $("#refreshWeather").addEventListener("click", loadWeather);
  $("#weatherLocationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    searchWeatherLocations($("#weatherLocationInput").value);
  });
  $("#weatherUseDeviceLocation").addEventListener("click", useDeviceWeatherLocation);
  $("#weatherLocationMenu").addEventListener("toggle", () => {
    if ($("#weatherLocationMenu").open) requestAnimationFrame(() => $("#weatherLocationInput").focus());
  });
  $("#saveOutlookSettings").addEventListener("click", async () => {
    try {
      const settings = window.OutlookCalendar.saveSettings($("#outlookClientId").value, $("#outlookTenantId").value);
      await queueCloudUserSettings({ outlookCalendar: settings });
      $("#outlookClientId").value = settings.clientId;
      $("#outlookTenantId").value = settings.tenantId;
      setCalendarStatus("Outlook ayarları kaydedildi. Şimdi Outlook’a bağlanabilirsiniz.", "success");
      setCalendarConnection(null);
      $("#outlookCalendarSettings").open = false;
    } catch (error) {
      setCalendarStatus(error.message, "error");
    }
  });
  $("#openAiAssistant").addEventListener("click", () => setAiAssistantPanel(true));
  $("#closeAiAssistant").addEventListener("click", () => setAiAssistantPanel(false));
  $("#aiAssistantForm").addEventListener("submit", (event) => {
    event.preventDefault();
    askAiAssistant($("#aiAssistantInput").value);
  });
  $("#aiAssistantInput").addEventListener("input", (event) => {
    $("#aiAssistantInputCount").textContent = String(event.target.value.length);
  });
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
    button.addEventListener("click", () => askAiAssistant(button.dataset.aiPrompt));
  });
  $("#saveAiAssistantEndpoint").addEventListener("click", async () => {
    try {
      const endpoint = window.AiAssistantClient.setEndpoint($("#aiAssistantEndpoint").value);
      await queueCloudUserSettings({ aiEndpoint: endpoint });
      $("#aiAssistantEndpoint").value = endpoint;
      $("#aiAssistantStatus").textContent = "AI servis adresi kaydedildi";
    } catch (error) {
      $("#aiAssistantStatus").textContent = error.message;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#aiAssistantPanel").classList.contains("hidden")) setAiAssistantPanel(false);
  });
  const closeTaskPlanImportModal = () => $("#taskPlanImportModal").close();
  $("#openTaskPlanPaste").addEventListener("click", () => {
    $("#taskPlanTextInput").value = "";
    $("#taskPlanPasteMessage").textContent = "";
    $("#taskPlanImportModal").showModal();
    $("#taskPlanTextInput").focus();
  });
  $("#closeTaskPlanImportModal").addEventListener("click", closeTaskPlanImportModal);
  $("#cancelTaskPlanImport").addEventListener("click", closeTaskPlanImportModal);
  $("#taskPlanPasteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      importTaskPlanSource($("#taskPlanTextInput").value);
      closeTaskPlanImportModal();
    } catch (error) {
      $("#taskPlanPasteMessage").textContent = error.message || "Görev planı içe aktarılamadı.";
    }
  });
  $("#backToTaskReport").addEventListener("click", () => activateTaskSubview("taskReportView"));
  $("#addSubtaskButton").addEventListener("click", () => {
    const task = selectedTaskDetailId ? window.TaskStore.get(selectedTaskDetailId) : null;
    if (task) startSubtaskCreate(task);
  });
  $("#reviseTaskButton").addEventListener("click", () => {
    const task = selectedTaskDetailId ? window.TaskStore.get(selectedTaskDetailId) : null;
    if (task) startTaskEdit(task);
  });
  $("#connectJiraOAuth").addEventListener("click", () => {
    try {
      if (window.JiraCloudClient.usesSupabase()) {
        $("#jiraHeaderMenu").open = true;
        if (!supabaseSession?.user) $("#supabaseHeaderMenu").open = true;
        if (supabaseSession?.user) $("#jiraCredentialToken").focus();
        setJiraCredentialStatus(supabaseSession?.user
          ? "JIRA adresinizi, Atlassian e-postanızı ve API tokenınızı girerek bağlantıyı kaydedin."
          : "Önce Supabase hesabınıza giriş yapın, ardından kişisel JIRA bağlantınızı kaydedin.");
        return;
      }
      setJiraCloudStatus("Atlassian giriş sayfasına yönlendiriliyorsunuz…", "busy");
      window.JiraCloudClient.signInWithJira();
    } catch (error) {
      setJiraCloudStatus(error.message, "error");
    }
  });
  $("#disconnectJiraOAuth").addEventListener("click", async () => {
    setJiraCloudStatus("JIRA oturumu kapatılıyor…", "busy");
    try {
      await window.JiraCloudClient.signOutFromJira();
      await refreshJiraOAuthStatus();
      setJiraCloudStatus("JIRA oturumu kapatıldı.", "success");
    } catch (error) {
      setJiraCloudStatus(`JIRA oturumu kapatılamadı: ${error.message}`, "error");
    }
  });
  $("#saveJiraCredentials").addEventListener("click", saveJiraCredentials);
  $("#removeJiraCredentials").addEventListener("click", removeJiraCredentials);
  $("#testJiraConnection").addEventListener("click", testJiraCloudConnection);
  $("#syncJiraIssues").addEventListener("click", () => syncJiraCloudIssues());
  $("#refreshJiraNavigator").addEventListener("click", () => jiraAssigneeFilter ? refreshSelectedJiraAssigneeIssues() : refreshJiraNavigatorFromWorklogs());
  $("#selectAllJiraItems").addEventListener("click", () => {
    filteredJiraItems().forEach((item) => selectedJiraItemIds.add(item.id));
    renderJiraItems();
  });
  $("#clearJiraItemSelection").addEventListener("click", () => {
    selectedJiraItemIds.clear();
    renderJiraItems();
  });
  $("#deleteSelectedJiraItems").addEventListener("click", deleteSelectedJiraItems);
  $("#jiraSyncJql").addEventListener("change", async (event) => {
    const value = event.target.value.trim();
    await queueCloudUserSettings({ jiraSyncJql: value });
    setJiraCloudStatus("JIRA senkronizasyon tercihi kaydedildi.", "success");
  });
  $("#jiraAutoWorklog").addEventListener("change", async (event) => {
    await queueCloudUserSettings({ jiraAutoWorklog: event.target.checked });
    setJiraCloudStatus(event.target.checked ? "JIRA worklog gönderimi için kayıt sonrası onay istenecek." : "JIRA worklog gönderimi kapatıldı.", "success");
  });
  $("#jiraItemSearchInput").addEventListener("input", () => scheduleIntegratedJiraSearch("main"));
  $("#jiraItemPickerButton").addEventListener("click", () => {
    const isOpen = $("#jiraItemPickerButton").getAttribute("aria-expanded") === "true";
    setEffortJiraPickerOpen(!isOpen);
  });
  $("#jiraItemOptionList").addEventListener("click", async (event) => {
    const option = event.target.closest(".jira-picker-option");
    if (!option) return;
    if (option.dataset.remoteKey) {
      await selectRemoteJiraIssue("main", option.dataset.remoteKey);
      return;
    }
    fields.jiraId.value = option.dataset.value;
    $("#jiraItemPickerButton").removeAttribute("aria-invalid");
    updateEffortJiraPickerLabel();
    setEffortJiraPickerOpen(false);
    $("#jiraItemPickerButton").focus();
  });
  $("#jiraItemSearchInput").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setEffortJiraPickerOpen(false);
      $("#jiraItemPickerButton").focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      $("#jiraItemOptionList .jira-picker-option")?.focus();
    }
  });
  $("#jiraItemOptionList").addEventListener("keydown", (event) => {
    const options = [...$("#jiraItemOptionList").querySelectorAll(".jira-picker-option")];
    const currentIndex = options.indexOf(event.target.closest(".jira-picker-option"));
    if (event.key === "Escape") {
      event.preventDefault();
      setEffortJiraPickerOpen(false);
      $("#jiraItemPickerButton").focus();
    } else if (event.key === "ArrowDown" && currentIndex >= 0) {
      event.preventDefault();
      options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
    } else if (event.key === "ArrowUp" && currentIndex >= 0) {
      event.preventDefault();
      if (currentIndex === 0) $("#jiraItemSearchInput").focus();
      else options[currentIndex - 1]?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!$("#jiraItemPicker").contains(event.target)) setEffortJiraPickerOpen(false);
    if (!$("#modalJiraPicker").contains(event.target)) setModalJiraPickerOpen(false);
    if (!$("#taskAssigneePicker").contains(event.target)) setTaskAssigneePickerOpen(false);
    ["items", "requests"].forEach((scope) => {
      const ui = jiraAssigneeFilterUi(scope);
      if (!ui.picker.contains(event.target)) setJiraAssigneeFilterOpen(scope, false);
    });
  });
  function bindJiraAssigneeFilterPicker(scope) {
    const ui = jiraAssigneeFilterUi(scope);
    ui.button.addEventListener("click", () => setJiraAssigneeFilterOpen(scope, ui.button.getAttribute("aria-expanded") !== "true"));
    ui.search.addEventListener("input", () => scheduleJiraAssigneeFilterSearch(scope));
    ui.search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setJiraAssigneeFilterOpen(scope, false);
        ui.button.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        ui.options.querySelector(".jira-picker-option")?.focus();
      }
    });
    ui.options.addEventListener("click", async (event) => {
      const option = event.target.closest(".jira-assignee-filter-option, .jira-assignee-filter-all");
      if (option) await selectJiraAssigneeFilterOption(option, scope);
    });
    ui.options.addEventListener("keydown", async (event) => {
      const options = [...ui.options.querySelectorAll(".jira-picker-option")];
      const currentIndex = options.indexOf(event.target.closest(".jira-picker-option"));
      if (event.key === "Escape") {
        event.preventDefault();
        setJiraAssigneeFilterOpen(scope, false);
        ui.button.focus();
      } else if (event.key === "Enter" || event.key === " ") {
        const option = event.target.closest(".jira-assignee-filter-option, .jira-assignee-filter-all");
        if (!option) return;
        event.preventDefault();
        await selectJiraAssigneeFilterOption(option, scope);
      } else if (event.key === "ArrowDown" && currentIndex >= 0) {
        event.preventDefault();
        options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
      } else if (event.key === "ArrowUp" && currentIndex >= 0) {
        event.preventDefault();
        if (currentIndex === 0) ui.search.focus();
        else options[currentIndex - 1]?.focus();
      }
    });
    ui.clear.addEventListener("click", () => {
      jiraAssigneeFilter = null;
      jiraAssigneeFilterSyncRequest += 1;
      updateJiraAssigneeFilterLabel();
      setJiraAssigneeFilterStatus("Tüm kullanıcılar gösteriliyor.");
      renderJiraItems();
    });
  }
  bindJiraAssigneeFilterPicker("items");
  bindJiraAssigneeFilterPicker("requests");
  $("#modalJiraPickerButton").addEventListener("click", () => {
    const isOpen = $("#modalJiraPickerButton").getAttribute("aria-expanded") === "true";
    setModalJiraPickerOpen(!isOpen);
  });
  $("#modalJiraSearchInput").addEventListener("input", () => scheduleIntegratedJiraSearch("modal"));
  $("#modalJiraOptionList").addEventListener("click", async (event) => {
    const option = event.target.closest(".jira-picker-option");
    if (!option) return;
    if (option.dataset.remoteKey) {
      await selectRemoteJiraIssue("modal", option.dataset.remoteKey);
      return;
    }
    $("#modalJiraInput").value = option.dataset.value;
    updateIntegratedJiraPickerLabel("modal");
    setModalJiraPickerOpen(false);
    $("#modalJiraPickerButton").focus();
  });
  $("#modalJiraSearchInput").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setModalJiraPickerOpen(false);
      $("#modalJiraPickerButton").focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      $("#modalJiraOptionList .jira-picker-option")?.focus();
    }
  });
  $("#modalJiraOptionList").addEventListener("keydown", (event) => {
    const options = [...$("#modalJiraOptionList").querySelectorAll(".jira-picker-option")];
    const currentIndex = options.indexOf(event.target.closest(".jira-picker-option"));
    if (event.key === "Escape") {
      event.preventDefault();
      setModalJiraPickerOpen(false);
      $("#modalJiraPickerButton").focus();
    } else if (event.key === "ArrowDown" && currentIndex >= 0) {
      event.preventDefault();
      options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
    } else if (event.key === "ArrowUp" && currentIndex >= 0) {
      event.preventDefault();
      if (currentIndex === 0) $("#modalJiraSearchInput").focus();
      else options[currentIndex - 1]?.focus();
    }
  });
  $("#taskAssigneePickerButton").addEventListener("click", () => {
    const isOpen = $("#taskAssigneePickerButton").getAttribute("aria-expanded") === "true";
    setTaskAssigneePickerOpen(!isOpen);
  });
  $("#taskAssigneeSearchInput").addEventListener("input", scheduleTaskAssigneeSearch);
  $("#taskAssigneeSearchInput").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setTaskAssigneePickerOpen(false);
      $("#taskAssigneePickerButton").focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      $("#taskAssigneeOptionList .jira-picker-option")?.focus();
    }
  });
  $("#taskAssigneeOptionList").addEventListener("click", (event) => {
    const option = event.target.closest(".task-assignee-option, .task-assignee-unassigned");
    if (option) selectTaskAssigneeOption(option);
  });
  $("#taskAssigneeOptionList").addEventListener("keydown", (event) => {
    const options = [...$("#taskAssigneeOptionList").querySelectorAll(".jira-picker-option")];
    const currentIndex = options.indexOf(event.target.closest(".jira-picker-option"));
    if (event.key === "Escape") {
      event.preventDefault();
      setTaskAssigneePickerOpen(false);
      $("#taskAssigneePickerButton").focus();
    } else if (event.key === "ArrowDown" && currentIndex >= 0) {
      event.preventDefault();
      options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
    } else if (event.key === "ArrowUp" && currentIndex >= 0) {
      event.preventDefault();
      if (currentIndex === 0) $("#taskAssigneeSearchInput").focus();
      else options[currentIndex - 1]?.focus();
    }
  });
  $("#jiraSearchInput").addEventListener("input", renderJiraItems);
  $("#jiraRequestsSearch").addEventListener("input", renderJiraRequests);
  $("#selectAllJiraRequestStatuses").addEventListener("click", () => {
    groupJiraRequestsByStatus(window.JiraStore.list()).forEach((group) => selectedJiraRequestStatuses.add(group.key));
    renderJiraRequests();
  });
  $("#clearJiraRequestStatuses").addEventListener("click", () => {
    selectedJiraRequestStatuses.clear();
    renderJiraRequests();
  });
  $("#autoFitJiraColumns").addEventListener("click", () => autoFitJiraColumns(true));
  $("#resetJiraColumns").addEventListener("click", () => {
    jiraTableLayout = {
      order: JIRA_TABLE_COLUMNS.map((column) => column.id),
      visible: JIRA_TABLE_COLUMNS.map((column) => column.id),
      widths: {},
      autoFit: true
    };
    saveJiraTableLayout();
    renderJiraItems();
    $("#jiraColumnStatus").textContent = "Kolon görünümü varsayılan düzene döndürüldü.";
  });
  $("#jiraHtmlImport").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#jiraFormMessage").textContent = "JIRA HTML dosyası okunuyor...";
    $("#jiraFormMessage").classList.remove("success");
    try { await importJiraHtml(file); }
    catch (error) { $("#jiraFormMessage").textContent = error.message || "JIRA HTML dosyası içe aktarılamadı."; }
    finally { event.target.value = ""; }
  });
  $("#taskPlanImport").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("#taskFormMessage").textContent = "Görev planı okunuyor...";
    $("#taskFormMessage").classList.remove("success");
    try { await importTaskPlan(file); }
    catch (error) {
      activateTaskSubview("taskCreateView");
      $("#taskFormMessage").textContent = error.message || "Görev planı içe aktarılamadı.";
    } finally { event.target.value = ""; }
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateMainView(button.dataset.tab));
  });

  document.querySelectorAll(".team-subtab-button").forEach((button) => {
    button.addEventListener("click", () => activateTeamSubview(button.dataset.teamTab));
  });

  document.querySelectorAll("[data-home-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetView = button.dataset.homeTarget;
      activateMainView(targetView);
      if (targetView === "tasksView") activateTaskSubview("taskReportView");
    });
  });

  document.querySelectorAll("[data-effort-chart-period]").forEach((button) => {
    button.addEventListener("click", () => {
      homeEffortChartPeriod = button.dataset.effortChartPeriod;
      renderHomeDashboard();
    });
  });

  $("#organizationLeaderFilter").addEventListener("change", renderOrganization);

  document.querySelectorAll(".task-subtab-button").forEach((button) => {
    button.addEventListener("click", () => activateTaskSubview(button.dataset.taskTab));
  });
  document.querySelectorAll(".jira-subtab-button").forEach((button) => {
    button.addEventListener("click", () => activateJiraSubview(button.dataset.jiraTab));
  });
  $("#taskTypeFilter").addEventListener("change", (event) => {
    renderTasks();
  });
  $("#taskStatusFilter").addEventListener("change", () => {
    renderTasks();
  });

  $("#modalEntrySelect").addEventListener("change", (event) => loadEffortModalEntry(event.target.value));
  const closeEffortModal = () => {
    setModalJiraPickerOpen(false);
    $("#effortEditModal").close();
  };
  $("#closeEffortEditModal").addEventListener("click", closeEffortModal);
  $("#cancelEffortEditModal").addEventListener("click", closeEffortModal);
  $("#deleteEffortModal").addEventListener("click", async () => {
    const entry = modalEffortEntries.find((item) => item.id === $("#modalEntrySelect").value) || modalEffortEntries[0];
    if (!entry) {
      $("#effortEditModalMessage").textContent = "Silinecek efor kaydı bulunamadı.";
      return;
    }
    if (await deleteEffortEntry(entry)) closeEffortModal();
  });
  $("#modalRepeatEntryToggle").addEventListener("change", renderRepeatEntryMode);
  effortEditModalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#effortEditModalMessage").classList.remove("success");
    const modalFields = [$("#modalJiraInput"), $("#modalDateInput"), $("#modalHoursInput"), $("#modalDescriptionInput")];
    const invalidField = modalFields.find((field) => !field.checkValidity());
    if (invalidField) {
      $("#effortEditModalMessage").textContent = "Lütfen tarih, süre ve efor açıklamasını geçerli şekilde doldurun.";
      invalidField.focus();
      return;
    }
    const jiraItem = getJiraItem($("#modalJiraInput").value);
    if (!jiraItem) {
      $("#effortEditModalMessage").textContent = "Geçerli bir JIRA maddesi seçin.";
      return;
    }
    const payload = {
      project: jiraItem.name,
      jiraId: jiraItem.id,
      hours: Number($("#modalHoursInput").value),
      task: $("#modalDescriptionInput").value.trim(),
      notes: ""
    };
    const entry = modalEffortEntries.find((item) => item.id === $("#modalEntrySelect").value) || modalEffortEntries[0];
    if (modalEffortMode === "create") {
      const repeatEntry = $("#modalRepeatEntryToggle").checked;
      const result = saveEntry({ ...payload, date: $("#modalDateInput").value });
      if (!result?.valid) {
        $("#effortEditModalMessage").textContent = Object.values(result?.errors || {}).join(" ") || "Efor kaydı oluşturulamadı.";
        return;
      }
      await syncEffortToJira(result.value);
      render();
      await waitForCloudSaves();
      if (repeatEntry) {
        $("#modalDateInput").value = "";
        $("#modalHoursInput").value = "";
        $("#effortEditModalMessage").textContent = "Efor kaydedildi. Yeni giriş için tarih ve süreyi girin.";
        $("#effortEditModalMessage").classList.add("success");
        renderRepeatEntryMode();
        $("#modalDateInput").focus();
        return;
      }
      closeEffortModal();
      return;
    }
    const result = entry
      ? getStore().update(entry.id, { ...entry, ...payload, date: $("#modalDateInput").value })
      : { valid: false, errors: { id: "Kayıt bulunamadı." } };
    if (!result.valid) {
      $("#effortEditModalMessage").textContent = Object.values(result.errors || {}).join(" ");
      return;
    }
    await syncEffortToJira(result.value, entry);
    closeEffortModal();
    render();
    backupAndReport("Timesheet üzerinden güncellenen efor Drive’a gönderildi.");
  });

  function updateTimesheetControls() {
    const custom = $("#timesheetPeriod").value === "custom";
    $("#timesheetPeriodNavigation").classList.toggle("hidden", custom);
    $("#timesheetStartField").classList.toggle("hidden", !custom);
    $("#timesheetEndField").classList.toggle("hidden", !custom);
    renderTimesheet();
  }

  $("#timesheetPeriod").addEventListener("change", updateTimesheetControls);
  $("#timesheetGrouping").addEventListener("change", renderTimesheet);
  $("#timesheetReferenceDate").addEventListener("change", renderTimesheet);
  $("#timesheetStartDate").addEventListener("change", renderTimesheet);
  $("#timesheetEndDate").addEventListener("change", renderTimesheet);
  $("#includeWeekends").addEventListener("change", renderTimesheet);
  $("#addTimesheetEffort").addEventListener("click", () => openEffortCreateModal(DUMMY_JIRA.id, isoToday()));
  $("#syncJiraWorklogs").addEventListener("click", syncTimesheetJiraWorklogs);
  $("#timesheetPrevious").addEventListener("click", () => {
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if ($("#timesheetPeriod").value === "month") { reference.setDate(1); reference.setMonth(reference.getMonth() - 1); }
    else reference.setDate(reference.getDate() - 7);
    $("#timesheetReferenceDate").value = isoFromDate(reference);
    renderTimesheet();
  });
  $("#timesheetNext").addEventListener("click", () => {
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if ($("#timesheetPeriod").value === "month") { reference.setDate(1); reference.setMonth(reference.getMonth() + 1); }
    else reference.setDate(reference.getDate() + 7);
    $("#timesheetReferenceDate").value = isoFromDate(reference);
    renderTimesheet();
  });

  fields.description.addEventListener("input", updateCount);
  fields.date.addEventListener("change", render);
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && taskFields.descriptionHtml.contains(selection.anchorNode)) {
      savedTaskEditorRange = selection.getRangeAt(0).cloneRange();
    }
  });
  document.querySelectorAll("[data-task-command]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (document.activeElement !== taskFields.descriptionHtml) taskFields.descriptionHtml.focus();
      if (savedTaskEditorRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedTaskEditorRange);
      }
      applyTaskEditorCommand(button.dataset.taskCommand);
    });
  });
  $("#filterDateInput").addEventListener("change", render);
  $("#cancelEditButton").addEventListener("click", resetForm);

  $("#saveDriveSettings").addEventListener("click", async () => {
    try {
      window.DriveSync.setClientId($("#googleClientId").value);
      await queueCloudUserSettings({ googleClientId: window.DriveSync.getClientId() });
      setDriveSettingsEditing(false);
      setDriveStatus("Ayarlar kayıtlı. Yedeklemek veya yüklemek için aşağıdan bir işlem seçin.");
      updateCalendarProviderUi();
      if (activeCalendarProvider === "google") setCalendarStatus("Google OAuth Client ID hazır. Şimdi Google Takvim’e bağlanabilirsiniz.", "success");
    } catch (error) { setDriveStatus(error.message, true); }
  });
  $("#editDriveSettings").addEventListener("click", () => setDriveSettingsEditing(true));
  $("#cancelDriveSettings").addEventListener("click", () => {
    setDriveSettingsEditing(false);
    setDriveStatus(window.DriveSync?.getClientId()
      ? "Ayar değişikliği iptal edildi. Kayıtlı ayarlar kullanılmaya devam edecek."
      : "Yedeklemeyi kullanmak için Google OAuth Client ID kaydedin.");
  });

  $("#loginScreenForm").addEventListener("submit", (event) => {
    event.preventDefault();
    runSupabaseAction(async () => {
      const email = $("#loginScreenEmail").value;
      const password = $("#loginScreenPassword").value;
      syncSupabaseAuthInputs(email, password);
      setSupabaseStatus("Supabase hesabınıza giriş yapılıyor…", "busy");
      const result = await window.SupabaseCloud.signIn(email, password);
      await refreshSupabaseAccount(result.session);
      setSupabaseStatus("Supabase hesabınıza giriş yapıldı.", "success");
    });
  });

  $("#loginScreenSignUp").addEventListener("click", () => runSupabaseAction(async () => {
    if (!$("#loginScreenForm").reportValidity()) return;
    const email = $("#loginScreenEmail").value;
    const password = $("#loginScreenPassword").value;
    syncSupabaseAuthInputs(email, password);
    setSupabaseStatus("Supabase hesabınız oluşturuluyor…", "busy");
    const result = await window.SupabaseCloud.signUp(email, password);
    if (result.session) {
      await refreshSupabaseAccount(result.session);
      setSupabaseStatus("Hesabınız oluşturuldu ve Supabase’e bağlandı.", "success");
    } else {
      $("#headerSupabaseMenuBadge").classList.remove("hidden");
      setSupabaseStatus("Doğrulama e-postası gönderildi. E-postadaki bağlantıya tıklayıp bu sayfaya dönün.", "success");
    }
  }));

  $("#loginScreenForgotPassword").addEventListener("click", () => runSupabaseAction(async () => {
    const emailInput = $("#loginScreenEmail");
    if (!emailInput.reportValidity()) return;
    syncSupabaseAuthInputs(emailInput.value);
    await window.SupabaseCloud.sendPasswordReset(emailInput.value);
    setSupabaseStatus("Şifre yenileme bağlantısı e-posta adresinize gönderildi.", "success");
  }));

  $("#supabaseAuthForm").addEventListener("submit", (event) => {
    event.preventDefault();
    runSupabaseAction(async () => {
      const email = $("#supabaseEmail").value;
      const password = $("#supabasePassword").value;
      syncSupabaseAuthInputs(email, password);
      const result = await window.SupabaseCloud.signIn(email, password);
      await refreshSupabaseAccount(result.session);
      setSupabaseStatus("Supabase hesabınıza giriş yapıldı.", "success");
    });
  });

  $("#supabaseSignUp").addEventListener("click", () => runSupabaseAction(async () => {
    if (!$("#supabaseAuthForm").reportValidity()) return;
    const email = $("#supabaseEmail").value;
    const password = $("#supabasePassword").value;
    syncSupabaseAuthInputs(email, password);
    const result = await window.SupabaseCloud.signUp(email, password);
    if (result.session) {
      await refreshSupabaseAccount(result.session);
      setSupabaseStatus("Hesabınız oluşturuldu ve Supabase’e bağlandı.", "success");
    } else {
      $("#headerSupabaseMenuBadge").classList.remove("hidden");
      setSupabaseStatus("Doğrulama e-postası gönderildi. E-postadaki bağlantıya tıklayıp bu sayfaya dönün.", "success");
    }
  }));

  $("#supabaseForgotPassword").addEventListener("click", () => runSupabaseAction(async () => {
    const emailInput = $("#supabaseEmail");
    if (!emailInput.reportValidity()) return;
    syncSupabaseAuthInputs(emailInput.value);
    await window.SupabaseCloud.sendPasswordReset(emailInput.value);
    setSupabaseStatus("Şifre yenileme bağlantısı e-posta adresinize gönderildi.", "success");
  }));

  $("#supabaseRecoveryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    runSupabaseAction(async () => {
      await window.SupabaseCloud.updatePassword($("#supabaseNewPassword").value);
      $("#supabaseRecoveryForm").classList.add("hidden");
      $("#supabaseNewPassword").value = "";
      setSupabaseStatus("Şifreniz güncellendi.", "success");
    });
  });

  $("#supabasePull").addEventListener("click", () => runSupabaseAction(pullFromSupabase));
  $("#supabaseSignOut").addEventListener("click", () => runSupabaseAction(async () => {
    await waitForCloudSaves();
    await window.SupabaseCloud.signOut();
    await refreshSupabaseAccount(null);
  }));
  $("#openSupabaseFromGate").addEventListener("click", () => { $("#supabaseHeaderMenu").open = true; });

  $("#backupToDrive").addEventListener("click", () => runDriveAction(async () => {
    await backupLocalDataToDrive("Yedek Google Drive’a kaydedildi.");
  }));

  $("#restoreFromDrive").addEventListener("click", () => runDriveAction(restoreFromDrive));
  $("#skipInitialRestore").addEventListener("click", () => {
    setDriveStatus("Bu açılış için yedekleme işlemi yapılmadı.");
    $("#driveHeaderMenu").open = false;
  });

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", async () => {
      await applyTheme(button.dataset.themeOption, { persist: true });
      button.closest(".header-menu")?.removeAttribute("open");
    });
  });
  document.querySelectorAll(".header-menu").forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      if (menu.id === "driveHeaderMenu") refreshDriveHeaderMenu();
      document.querySelectorAll(".header-menu[open]").forEach((otherMenu) => {
        if (otherMenu !== menu) otherMenu.open = false;
      });
    });
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".header-menu[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  window.addEventListener("beforeunload", (event) => {
    if (cloudSavePending === 0 && cloudSettingsSavePending === 0) return;
    event.preventDefault();
    event.returnValue = "";
  });

  try {
    window.CloudDataRuntime.setChangeHandler(queueCloudChange);
    window.SupabaseCloud.onAuthStateChange((event, session) => {
      supabaseSession = session || null;
      if (event === "PASSWORD_RECOVERY") {
        $("#supabaseHeaderMenu").open = true;
        $("#supabaseRecoveryForm").classList.remove("hidden");
        setSupabaseStatus("Yeni şifrenizi belirleyin.", "success");
      }
      refreshSupabaseAccount(session).then(() => {
        refreshJiraCredentialStatus();
        refreshJiraOAuthStatus();
      });
    });
    window.SupabaseCloud.getSession()
      .then((session) => refreshSupabaseAccount(session).then(() => refreshJiraCredentialStatus()))
      .catch((error) => {
        setLoginScreenVisible(true);
        setSupabaseStatus(`Supabase oturumu alınamadı: ${error.message}`, "error");
      });
  } catch (error) {
    setLoginScreenVisible(true);
    setCloudDataGate("error", error.message);
    setSupabaseStatus(`Supabase başlatılamadı: ${error.message}`, "error");
  }

  $("#todayLabel").textContent = dateFormatter.format(new Date());
  applyWeatherLocationSetting(DEFAULT_WEATHER_LOCATION);
  $("#googleClientId").value = window.DriveSync?.getClientId() || "";
  setDriveSettingsEditing(false);
  updateLastBackupTime();
  if ($("#googleClientId").value) {
    setDriveStatus("Ayarlar kayıtlı. Yedeklemek veya yüklemek için Yedekleme menüsünü kullanın.");
  } else {
    setDriveStatus("Yedeklemeyi kullanmak için Google OAuth Client ID kaydedin.");
  }
  fields.date.value = isoToday();
  taskFields.dueDate.value = "";
  $("#timesheetReferenceDate").value = isoToday();
  const todayForRange = parseDate(isoToday());
  const rangeMonday = addDays(todayForRange, -((todayForRange.getDay() + 6) % 7));
  $("#timesheetStartDate").value = isoFromDate(rangeMonday);
  $("#timesheetEndDate").value = isoFromDate(addDays(rangeMonday, 6));
  $("#aiAssistantEndpoint").value = window.AiAssistantClient.getEndpoint();
  const jiraOAuthResult = consumeJiraOAuthResult();
  refreshJiraOAuthStatus(!jiraOAuthResult);
  $("#jiraAutoWorklog").checked = true;
  renderJiraItems();
  render();
  initializeCalendar();
  renderPeople();
  renderTasks();
  applyInitialRoute();
})();
