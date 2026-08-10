"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const cloudDataRuntime = fs.readFileSync(path.join(root, "cloud-data-runtime.js"), "utf8");
const dataStore = fs.readFileSync(path.join(root, "data-store.js"), "utf8");
const drive = fs.readFileSync(path.join(root, "drive-sync.js"), "utf8");
const tasks = fs.readFileSync(path.join(root, "tasks-store.js"), "utf8");
const peopleStore = fs.readFileSync(path.join(root, "people-store.js"), "utf8");
const jira = fs.readFileSync(path.join(root, "jira-store.js"), "utf8");
const reminders = fs.readFileSync(path.join(root, "reminders-store.js"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "ai-assistant.js"), "utf8");
const jiraCloudClient = fs.readFileSync(path.join(root, "jira-cloud.js"), "utf8");
const outlookCalendarClient = fs.readFileSync(path.join(root, "outlook-calendar.js"), "utf8");
const googleCalendarClient = fs.readFileSync(path.join(root, "google-calendar.js"), "utf8");
const supabaseCloudClient = fs.readFileSync(path.join(root, "supabase-cloud.js"), "utf8");
const jiraEdgeFunction = fs.readFileSync(path.join(root, "supabase", "functions", "jira-proxy", "index.ts"), "utf8");
const jiraVaultMigration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260810190000_jira_credentials_vault.sql"), "utf8");
const aiServer = fs.readFileSync(path.join(root, "server.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const taskDetailHtml = fs.readFileSync(path.join(root, "task-detail.html"), "utf8");
const taskDetailApp = fs.readFileSync(path.join(root, "task-detail.js"), "utf8");
const taskTypeReportHtml = fs.readFileSync(path.join(root, "task-type-report.html"), "utf8");
const taskTypeReportApp = fs.readFileSync(path.join(root, "task-type-report.js"), "utf8");
const deleteEffortBlock = app.slice(app.indexOf("async function deleteEffortEntry"), app.indexOf("\n  function render()", app.indexOf("async function deleteEffortEntry")));
const effortModalSubmitBlock = app.slice(app.indexOf('effortEditModalForm.addEventListener("submit"'), app.indexOf("\n  function updateTimesheetControls", app.indexOf('effortEditModalForm.addEventListener("submit"')));

assert.doesNotMatch([app, dataStore, tasks, peopleStore, jira, reminders, drive, aiClient, jiraCloudClient, outlookCalendarClient].join("\n"), /localStorage\.(?:getItem|setItem|removeItem)/, "App data and user preferences must not persist in localStorage");
assert.match(supabaseCloudClient, /async function getUserSettings[\s\S]*async function updateUserSettings[\s\S]*from\("user_settings"\)/, "User preferences must be read from and written to Supabase user_settings");
assert.match(app, /function queueCloudUserSettings[\s\S]*SupabaseCloud\.updateUserSettings[\s\S]*applyCloudUserSettings\(bundle\.settings/, "Cloud preferences must load automatically and save to Supabase");

const requiredIds = [
  "homeView", "homeWeekLabel", "homeWeeklyHours", "homeWeeklyGoal", "homeWeeklyEntryCount",
  "homePlannedTasks", "homeInProgressTasks", "weeklyEffortChart", "taskStatusChart",
  "jiraEffortChart", "homeOpenTaskCount", "homePendingTaskList",
  "reminderPanelTitle", "reminderOpenCount", "openReminderModal", "reminderTickerWindow", "reminderModal", "reminderModalTitle", "closeReminderModal", "reminderForm", "reminderId", "reminderTextInput",
  "reminderDateInput", "reminderImportanceInput", "reminderOptions", "reminderSubmitLabel", "cancelReminderEdit", "reminderFormMessage", "reminderEmptyState", "reminderList",
  "outlookCalendarTitle", "showGoogleCalendar", "showOutlookCalendar", "outlookCalendarConnection", "connectOutlookCalendar", "refreshOutlookCalendar", "disconnectOutlookCalendar", "outlookCalendarRange", "outlookCalendarPeriod", "outlookCalendarSettings", "outlookClientId", "outlookTenantId", "saveOutlookSettings", "outlookRedirectUri", "googleCalendarSettings", "googleCalendarClientState", "outlookCalendarStatus", "outlookCalendarEmpty", "outlookCalendarList",
  "openAiAssistant", "aiAssistantPanel", "aiAssistantTitle", "aiAssistantStatus", "closeAiAssistant",
  "aiAssistantMessages", "aiAssistantForm", "aiAssistantInput", "aiAssistantInputCount", "sendAiAssistantMessage",
  "aiAssistantEndpoint", "saveAiAssistantEndpoint",
  "effortForm", "entryId", "dateInput", "hoursInput",
  "descriptionInput", "filterDateInput", "entryList", "entryTemplate",
  "dailyTotal", "dailyDays", "effortWeekHours", "effortWeekDays", "effortMonthHours", "effortMonthDays", "grandTotal", "effortTotalDays", "entryCount", "formMessage", "lastBackupTime",
  "driveHeaderMenu", "headerDriveMenuLabel", "headerDriveMenuBadge", "driveCompactPanel", "driveCompactTitle", "driveConnectionBadge", "driveSettingsSummary", "driveClientIdPreview", "editDriveSettings", "driveSettingsEditor", "cancelDriveSettings", "skipInitialRestore",
  "supabaseHeaderMenu", "headerSupabaseMenuLabel", "headerSupabaseMenuBadge", "supabaseConnectionBadge", "supabaseStatus", "supabaseAuthForm", "supabaseEmail", "supabasePassword", "supabaseSignIn", "supabaseSignUp", "supabaseForgotPassword", "supabaseRecoveryForm", "supabaseNewPassword", "supabaseSignedInPanel", "supabaseUserEmail", "supabaseOrganizationName", "supabaseLastSync", "supabasePull", "supabaseSignOut", "cloudDataGate", "cloudDataGateTitle", "cloudDataGateMessage", "openSupabaseFromGate",
  "tasksView", "taskForm", "taskTitleInput", "taskDueDateInput", "taskStatusInput", "taskDescriptionInput", "taskDocumentsInput", "taskDocumentSelectionSummary", "taskDocumentList",
  "taskParentTaskInput", "taskAssigneeInput", "taskTypeInput", "taskPriorityInput", "taskYearInput", "taskQuarterInput", "taskPlanImport",
  "openTaskPlanPaste", "taskPlanImportModal", "taskPlanPasteForm", "taskPlanTextInput", "taskPlanPasteMessage",
  "taskList", "taskTemplate", "taskTypeGroupTemplate", "taskCreateView", "taskReportView", "taskDetailView", "taskDetailTitle",
  "taskDetailDescription", "taskDetailParentItem", "taskDetailAssignee", "taskDetailType", "taskDetailPriority", "taskDetailPlan", "taskDetailSubtaskList", "taskDetailSubtaskCount", "addSubtaskButton", "taskTypeFilter", "taskStatusFilter", "taskFilterEmpty", "reviseTaskButton", "backToTaskReport", "taskReportCount", "taskReportTableWrap", "addNextTaskToCalendar", "addNextTaskToOutlookCalendar",
  "timesheetView", "timesheetPeriod", "timesheetReferenceDate", "timesheetStartDate",
  "timesheetEndDate", "includeWeekends", "addTimesheetEffort", "syncJiraWorklogs", "timesheetJiraSyncStatus", "timesheetTable", "timesheetTotalHours",
  "timesheetGrouping",
  "jiraItemPicker", "jiraItemPickerButton", "jiraItemPickerValue", "jiraItemPickerDropdown", "jiraItemSearchInput", "jiraItemSearchCount", "jiraItemOptionList", "jiraItemInput", "jiraView", "jiraForm", "jiraNameInput", "jiraSubmitButton", "jiraSubmitLabel",
  "jiraList", "jiraTemplate", "jiraHtmlImport",
  "jiraHeaderMenu", "headerJiraMenuLabel", "headerJiraMenuBadge", "jiraCloudTitle", "jiraOAuthBadge", "connectJiraOAuth", "disconnectJiraOAuth", "jiraCredentialTitle", "jiraCredentialBadge", "jiraCredentialStatus", "jiraCredentialBaseUrl", "jiraCredentialEmail", "jiraCredentialToken", "saveJiraCredentials", "removeJiraCredentials", "jiraSyncJql", "testJiraConnection", "syncJiraIssues", "jiraAutoWorklog", "jiraCloudStatus",
  "jiraSearchInput", "jiraColumnManager", "jiraColumnOptions", "autoFitJiraColumns", "resetJiraColumns", "jiraColumnStatus", "jiraIssueTable", "jiraTableHeaderRow", "jiraTableBody", "jiraItemsView", "jiraRequestsView", "jiraItemsSubtabCount", "jiraRequestsSubtabCount", "jiraRequestsTitle", "jiraRequestsSearch", "jiraRequestTotal", "jiraRequestStatusFilters", "selectAllJiraRequestStatuses", "clearJiraRequestStatuses", "jiraRequestBoardStatus", "jiraRequestsEmpty", "jiraRequestBoard", "effortEditModal", "effortEditModalForm", "modalEntrySelect",
  "modalJiraInput", "modalDateInput", "modalHoursInput", "modalDescriptionInput", "effortEditModalSubmitLabel", "deleteEffortModal",
  "modalRepeatEntryToggleField", "modalRepeatEntryToggle",
  "teamView", "peopleView", "peopleTabCount", "syncJiraUsers", "jiraPeopleSyncTitle", "jiraPeopleSyncStatus", "jiraPeopleCount", "manualPeopleCount", "personForm", "personId", "personJiraIdentity", "personJiraIdentityAvatar", "personJiraIdentityName", "personJiraIdentityAccount", "personFullNameInput", "personEmailInput", "personTitleInput", "personRoleInput", "personManagerInput", "personFormMessage", "personFormTitle", "personSubmitLabel", "cancelPersonEdit", "peopleListTitle", "peopleCount", "peopleSearchInput", "peopleSourceFilter", "peopleEmptyState", "peopleFilterEmpty", "peopleList",
  "organizationView", "organizationLeaderFilter", "organizationWorkloadTitle", "organizationTaskStats", "organizationTaskEmpty", "organizationTaskTableWrap", "organizationTaskList",
];

for (const id of requiredIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Eksik DOM sözleşmesi: #${id}`);
}

for (const id of ["taskDetailPageContent", "taskDetailPageErrorTitle", "taskDetailPageErrorMessage", "detailPageTitle", "detailPageTaskType", "detailPagePriority", "detailPageStatus", "detailPageCompleted", "detailPageOverviewTask", "detailPageParent", "detailPageAssignee", "detailPagePriorityValue", "detailPagePlan", "detailPageDueDate", "detailPageStatusValue", "detailPageDescription", "detailPageDocumentCount", "detailPageDocumentList", "detailPageSubtaskList", "detailPageRevise"]) {
  assert.match(taskDetailHtml, new RegExp(`id=["']${id}["']`), `Eksik görev detay sayfası sözleşmesi: #${id}`);
}

for (const id of ["taskTypeReportTitle", "taskTypeReportBackLink", "taskTypeReportErrorTitle", "taskTypeReportErrorMessage", "taskTypeReportContent", "taskTypeReportTotal", "taskTypeReportOpen", "taskTypeReportInProgress", "taskTypeReportCompleted", "taskTypeReportBody"]) {
  assert.match(taskTypeReportHtml, new RegExp(`id=["']${id}["']`), `Eksik görev tipi raporu sözleşmesi: #${id}`);
}

assert.ok(html.indexOf('src="cloud-data-runtime.js') < html.indexOf('src="data-store.js') && html.indexOf('src="data-store.js') < html.indexOf('src="app.js'), "Bellek tabanlı bulut çalışma katmanı veri mağazalarından önce yüklenmeli");
assert.ok(html.indexOf('src="vendor/msal-browser.min.js') < html.indexOf('src="outlook-calendar.js') && html.indexOf('src="outlook-calendar.js') < html.indexOf('src="app.js'), "MSAL ve Outlook Takvim istemcileri uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="drive-sync.js') < html.indexOf('src="google-calendar.js') && html.indexOf('src="google-calendar.js') < html.indexOf('src="app.js'), "Drive ayarları ve Google Takvim istemcisi uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="vendor/supabase.js') < html.indexOf('src="supabase-cloud.js') && html.indexOf('src="supabase-cloud.js') < html.indexOf('src="app.js'), "Sabitlenmiş Supabase SDK ve bulut istemcisi uygulamadan önce yüklenmeli");
assert.match(supabaseCloudClient, /sb_publishable_[A-Za-z0-9_-]+/, "Tarayıcı Supabase bağlantısı modern publishable key kullanmalı");
assert.doesNotMatch(supabaseCloudClient, /service_role|sb_secret_|SUPABASE_SERVICE_ROLE/, "Supabase secret veya service-role anahtarı tarayıcı koduna yazılmamalı");
assert.match(supabaseCloudClient, /signUp[\s\S]*emailRedirectTo[\s\S]*signInWithPassword[\s\S]*resetPasswordForEmail[\s\S]*updateUser/, "Supabase e-posta kayıt, giriş, doğrulama ve şifre yenileme akışları bulunmalı");
assert.match(supabaseCloudClient, /organization_members[\s\S]*pullBundle[\s\S]*onConflict:\s*"organization_id,id"[\s\S]*pushBundle/, "Supabase senkronizasyonu organizasyon kapsamında güvenli upsert kullanmalı");
assert.match(supabaseCloudClient, /async function applyChanges[\s\S]*TABLES\[collection\][\s\S]*\.upsert\(rows[\s\S]*removableIds[\s\S]*\.delete\(\)/, "Bellek değişiklikleri Supabase'e satır bazında eklenip silinebilmeli");
assert.match(html, /<meta\s+name="viewport"/i, "Mobil viewport tanımı eksik");
assert.match(css, /@media\s*\(max-width:\s*850px\)/, "Tablet kırılımı eksik");
assert.match(css, /@media\s*\(max-width:\s*600px\)/, "Mobil kırılımı eksik");
assert.match(html, /class="tab-button active"[^>]*data-tab="homeView"/, "Ana Sayfa varsayılan sekme olmalı");
assert.match(app, /function openTasksByStatus[\s\S]*taskStatusFilter[\s\S]*activateMainView\("tasksView"\)/, "Ana sayfa görev durumları ilgili durum filtresiyle görev raporunu açmalı");
assert.match(app, /task-chart-legend-item[\s\S]*openTasksByStatus\(status\)/, "Görev durumu açıklama satırları tıklanabilir olmalı");
assert.match(app, /selectedTaskStatus[\s\S]*task\.status === selectedTaskStatus[\s\S]*params\.set\("status", selectedTaskStatus\)/, "Görev raporu durum filtresini görev tipi detayına taşımalı");
assert.match(taskTypeReportApp, /selectedStatus[\s\S]*task\.status === selectedStatus/, "Görev tipi raporu seçili durum filtresini uygulamalı");
assert.match(taskTypeReportApp, /fromStatus[\s\S]*detailUrl\(task\.id, taskType, selectedStatus\)/, "Görev tipi raporu durum filtresini görev detayına taşımalı");
assert.match(html, /id="effortsView"\s+class="tab-view hidden"/, "Eforlar sekmesi ilk açılışta gizli olmalı");
assert.match(app, /function renderHomeDashboard/, "Ana Sayfa veri render fonksiyonu eksik");
assert.match(app, /function buildAiAssistantContext[\s\S]*weeklyEfforts[\s\S]*tasks:[\s\S]*jiraItems:[\s\S]*reminders:/, "AI asistanı uygulama bağlamını güvenli ve sınırlı biçimde hazırlamalı");
assert.match(app, /AiAssistantClient\.ask[\s\S]*buildAiAssistantContext/, "AI sohbet formu güvenli istemciye bağlanmalı");
assert.match(aiClient, /fetch\(getEndpoint\(\)[\s\S]*message, context, history/, "AI istemcisi yalnızca backend endpoint'ine istek göndermeli");
assert.doesNotMatch(aiClient, /OPENAI_API_KEY|Authorization:\s*`Bearer/, "OpenAI API anahtarı tarayıcı kodunda bulunmamalı");
assert.match(aiServer, /process\.env\.OPENAI_API_KEY/, "AI backend anahtarı ortam değişkeninden okumalı");
assert.match(aiServer, /api\.openai\.com\/v1\/responses/, "AI backend Responses API'ye bağlanmalı");
assert.match(aiServer, /store:\s*false[\s\S]*reasoning:\s*\{\s*effort:\s*"low"/, "AI istekleri saklama kapalı ve düşük reasoning eforuyla gönderilmeli");
assert.match(app, /function renderReminders[\s\S]*ReminderStore\.list/, "Ana Sayfa hatırlatma listesi veri katmanına bağlanmalı");
assert.match(html, /id="outlookCalendarTitle"[\s\S]*id="showGoogleCalendar"[\s\S]*id="showOutlookCalendar"[\s\S]*id="connectOutlookCalendar"[\s\S]*id="outlookCalendarList"/, "Ana Sayfada Google ve Outlook sağlayıcılarını destekleyen takvim ajandası bulunmalı");
assert.match(outlookCalendarClient, /SCOPES\s*=\s*\["Calendars\.ReadBasic"\]/, "Outlook Takvim yalnızca en düşük salt okunur takvim iznini istemeli");
assert.match(outlookCalendarClient, /createStandardPublicClientApplication[\s\S]*cacheLocation:\s*"sessionStorage"[\s\S]*handleRedirectPromise/, "Outlook OAuth akışı PKCE destekli MSAL SPA istemcisi kullanmalı");
assert.match(outlookCalendarClient, /startDateTime[\s\S]*endDateTime[\s\S]*graph\.microsoft\.com\/v1\.0\/me\/calendar\/calendarView/, "Outlook etkinlikleri Microsoft Graph calendarView üzerinden tarih aralığıyla alınmalı");
assert.doesNotMatch(outlookCalendarClient, /clientSecret|CLIENT_SECRET/, "Microsoft client secret tarayıcı kodunda bulunmamalı");
assert.match(googleCalendarClient, /SCOPES\s*=\s*\["https:\/\/www\.googleapis\.com\/auth\/calendar\.events\.readonly"\]/, "Google Takvim yalnızca etkinlikleri okumaya yönelik izni istemeli");
assert.match(googleCalendarClient, /initTokenClient[\s\S]*include_granted_scopes:\s*true[\s\S]*requestAccessToken/, "Google Takvim GIS token modeliyle yetkilendirilmeli");
assert.match(googleCalendarClient, /singleEvents:\s*"true"[\s\S]*orderBy:\s*"startTime"[\s\S]*calendar\/v3\/calendars\/primary\/events/, "Google etkinlikleri primary takvimden tarih sırasıyla alınmalı");
assert.doesNotMatch(googleCalendarClient, /clientSecret|CLIENT_SECRET/, "Google client secret tarayıcı kodunda bulunmamalı");
assert.match(app, /function normalizeCalendarEvent[\s\S]*function renderCalendar[\s\S]*outlook-day-group[\s\S]*outlook-event-time[\s\S]*event\.subject/, "Google ve Outlook etkinlikleri ortak tarih ve saat ajandasında gösterilmeli");
assert.match(app, /function selectCalendarProvider[\s\S]*CALENDAR_PROVIDER_KEY[\s\S]*function initializeCalendar[\s\S]*OutlookCalendar\.initialize/, "Takvim sağlayıcısı seçilebilmeli ve Outlook oturumu gerektiğinde geri yüklenmeli");
assert.match(app, /reminderForm\.addEventListener\("submit"[\s\S]*ReminderStore\.(?:update|create)/, "Not ve hatırlatma formu CRUD akışına bağlanmalı");
assert.match(reminders, /function validate[\s\S]*function replaceAll/, "Hatırlatma veri modeli doğrulama ve yedek geri yükleme sağlamalı");
const homeSummaryStart = html.indexOf('class="home-summary-panel"');
const homeWidgetsStart = html.indexOf('class="home-top-widgets"');
assert.ok(homeSummaryStart < html.indexOf('class="home-kpi-grid"') && html.indexOf('class="home-kpi-grid"') < homeWidgetsStart, "Çalışma özeti ve haftalık göstergeler tek üst bölümde birleştirilmeli");
assert.doesNotMatch(html.slice(homeSummaryStart, homeWidgetsStart), />\+ Efor ekle<\/button>/, "Çalışma özeti bölümünde Efor ekle düğmesi bulunmamalı");
assert.match(html.slice(homeSummaryStart, homeWidgetsStart), /class="home-kpi-card home-kpi-primary"[^>]*data-home-target="effortsView"[\s\S]*class="home-kpi-card"[^>]*data-home-target="effortsView"[\s\S]*class="home-kpi-card"[^>]*data-home-target="tasksView"[\s\S]*class="home-kpi-card"[^>]*data-home-target="tasksView"/, "Çalışma özeti kartları ilgili Eforlar ve Görevler bölümlerine bağlanmalı");
assert.match(css, /home-kpi-card:hover[^{]*\{[^}]*transform:\s*translateY/, "Tıklanabilir çalışma özeti kartları hover geri bildirimi vermeli");
assert.match(app, /data-home-target[\s\S]*targetView[\s\S]*activateMainView\(targetView\)[\s\S]*targetView === "tasksView"[\s\S]*activateTaskSubview\("taskReportView"\)/, "Görev özet kartları Görevler rapor sayfasını açmalı");
assert.ok(html.indexOf('class="panel home-quick-reminder"') < html.indexOf('class="home-dashboard-grid"'), "Önemli Notlar ve Hatırlatmalar Ana Sayfanın üst kısmında olmalı");
assert.ok(html.indexOf('class="home-top-widgets"') < html.indexOf('class="panel outlook-calendar-dashboard"') && html.indexOf('class="panel outlook-calendar-dashboard"') < html.indexOf('class="panel home-quick-reminder"'), "Outlook Takvim solda, Önemli Notlar ve Hatırlatmalar sağda aynı üst bölümde olmalı");
assert.match(css, /home-top-widgets[^{]*\{[^}]*display:\s*grid[^}]*grid-template-columns:[^}]*1\.15fr[^}]*\.85fr/, "Takvim ve hatırlatma kutuları masaüstünde yan yana grid olarak yerleşmeli");
assert.match(css, /home-top-widgets[^{]*\{[^}]*align-items:\s*stretch/, "Takvim ve hatırlatma kutularının yükseklikleri eşit olmalı");
assert.match(css, /@media\s*\(max-width:\s*850px\)[\s\S]*home-top-widgets[^{]*\{[^}]*grid-template-columns:\s*1fr/, "Takvim ve hatırlatma kutuları dar ekranda alt alta geçmeli");
assert.match(html, /id="openReminderModal"[\s\S]*id="reminderTickerWindow"[\s\S]*id="reminderModal"[\s\S]*id="reminderForm"/, "Hatırlatma ekleme formu Ana Sayfayı kaplamadan popup içinde açılmalı");
assert.match(app, /openReminderModal"\)\.addEventListener\("click", openReminderCreateModal\)/, "Hatırlatma ekle düğmesi popup formunu açmalı");
assert.match(app, /classList\.toggle\("is-ticker", reminders\.length > 1\)[\s\S]*cloneNode\(true\)/, "Hatırlatmalar kesintisiz kayan akış için çoğaltılmalı");
assert.match(css, /reminder-ticker-window[^{]*\{[^}]*height:\s*76px[\s\S]*@keyframes reminder-flow[^{]*\{[^}]*translateY/, "Hatırlatma kutusu kompakt olmalı ve aşağıdan yukarı akmalı");
assert.match(app, /weeklyEntries[\s\S]*homeWeeklyHours[\s\S]*homeWeeklyEntryCount/, "Haftalık efor özeti eksik");
assert.match(app, /function formatEffortDays|const formatEffortDays[\s\S]*\/ 8/, "Efor gün karşılığı 8 saat üzerinden hesaplanmalı");
assert.match(app, /formatRoundedHours[\s\S]*Math\.round/, "Efor istatistiklerinde saat küsuratları gösterilmemeli");
assert.match(html, /<strong id="effortWeekDays">[\s\S]*<small id="effortWeekHours">/, "Eforlar ekranında gün sayısı saat detayından daha görünür olmalı");
assert.match(app, /hours-badge"\)\.textContent = formatEffortDays\(entry\.hours\)[\s\S]*Süre: \$\{formatRoundedHours\(entry\.hours\)\}/, "Efor geçmişinde gün karşılığı öne çıkmalı, küsuratsız saat açıklama detayı olarak gösterilmeli");
assert.match(app, /weekTotal[\s\S]*monthTotal[\s\S]*effortWeekHours[\s\S]*effortMonthHours[\s\S]*effortTotalDays/, "Eforlar ekranı haftalık, aylık ve toplam istatistikleri saat ve gün bazında göstermeli");
assert.match(html, /id="addTimesheetEffort"[^>]*>\+ Efor ekle<\/button>/, "Yeni efor yalnızca Timesheet üzerinden açılabilmeli");
assert.doesNotMatch(html, /data-home-target="effortsView"[^>]*>\+ Efor ekle<\/button>/, "Ana Sayfadaki efor ekleme kısayolu Timesheet dışındaki bir ekleme ekranına gitmemeli");
assert.match(app, /addTimesheetEffort"\)\.addEventListener\("click"[\s\S]*openEffortCreateModal/, "Timesheet efor ekleme düğmesi popup formunu açmalı");
assert.match(app, /edit-button"\)\.addEventListener\("click", \(\) => openEffortEditModal\(\[entry\]\)\)/, "Efor geçmişindeki düzenleme işlemi popup açmalı");
assert.match(html, /class="panel form-panel hidden"[^>]*aria-hidden="true"/, "Eski Eforlar ekleme formu arayüzde görünmemeli");
assert.match(app, /plannedTasks[\s\S]*inProgressTasks[\s\S]*completedTasks/, "Görev durum özeti eksik");
assert.match(app, /weekly-bar-column[\s\S]*task-donut[\s\S]*jira-effort-row/, "Dashboard grafikleri eksik");
assert.match(app, /renderTimesheet\(\);\s*renderHomeDashboard\(\);/, "Efor render sonrası Ana Sayfa güncellenmeli");
assert.match(app, /function renderTasks[\s\S]*renderHomeDashboard\(\);\s*\}/, "Görev render sonrası Ana Sayfa güncellenmeli");
assert.match(css, /home-dashboard-grid[^{]*\{[^}]*grid-template-columns/, "Ana Sayfa responsive grid yapısı eksik");
assert.doesNotMatch(html, /id="projectInput"/, "Efor formunda bağımsız proje alanı olmamalı");
assert.match(html, /id="descriptionInput"[^>]*maxlength="1000"/, "Ana efor açıklaması 1000 karakter desteklemeli");
assert.match(html, /id="modalDescriptionInput"[^>]*maxlength="1000"/, "Timesheet efor açıklaması 1000 karakter desteklemeli");
assert.match(html, /descriptionCount">0<\/span>\/1000 karakter/, "Efor açıklaması karakter sayacı 1000 limitini göstermeli");
assert.match(html, /id="jiraItemInput"[^>]*required/, "Efor formunda JIRA seçimi zorunlu olmalı");
assert.match(html, /id="jiraItemPickerButton"[^>]*aria-haspopup="listbox"[^>]*aria-controls="jiraItemPickerDropdown"/, "Efor JIRA seçimi erişilebilir bir açılır liste olmalı");
assert.match(html, /id="jiraItemPickerDropdown" class="jira-picker-dropdown hidden"[\s\S]*id="jiraItemSearchInput"[^>]*type="search"[^>]*aria-controls="jiraItemOptionList"/, "Efor JIRA araması açılır listenin içinde yer almalı");
assert.match(app, /function normalizeJiraSearch[\s\S]*toLocaleLowerCase\("tr-TR"\)[\s\S]*replaceAll\("ı", "i"\)/, "Efor JIRA araması büyük-küçük harf ve Türkçe I karakterlerinden etkilenmemeli");
assert.match(app, /function jiraMatchesSearch[\s\S]*item\.name[\s\S]*item\.description[\s\S]*item\.assignee[\s\S]*item\.status/, "Efor JIRA araması Key, Summary, kişi ve durum alanlarını filtrelemeli");
assert.match(app, /jiraItemSearchInput"\)\.addEventListener\("input"[\s\S]*filterEffortJiraOptions/, "Efor JIRA seçenekleri kullanıcı yazarken anlık filtrelenmeli");
assert.match(app, /function renderEffortJiraOptionList[\s\S]*jira-picker-option[\s\S]*aria-selected/, "Filtrelenen JIRA maddeleri açılır listede seçilebilir gösterilmeli");
assert.match(app, /function setEffortJiraPickerOpen[\s\S]*jiraItemPickerDropdown[\s\S]*aria-expanded/, "JIRA açılır listesinin açık-kapalı durumu yönetilmeli");
assert.match(app, /project:\s*selectedJira\.name/, "Eforun proje karşılığı seçilen JIRA anahtarından türetilmeli");
assert.ok(html.indexOf('src="jira-cloud.js') < html.indexOf('src="app.js'), "JIRA Cloud istemcisi uygulamadan önce yüklenmeli");
assert.doesNotMatch(jiraCloudClient, /JIRA_API_TOKEN|Authorization:\s*`Basic/, "JIRA API token tarayıcı kodunda bulunmamalı");
assert.match(jiraCloudClient, /credentials:\s*"include"/, "JIRA OAuth oturum çerezi backend isteklerinde güvenli biçimde gönderilmeli");
assert.match(jiraCloudClient, /function getOAuthStatus[\s\S]*\/oauth\/status[\s\S]*function getOAuthStartUrl[\s\S]*\/oauth\/start[\s\S]*function signOutFromJira[\s\S]*\/oauth\/logout/, "JIRA istemcisi giriş durumu, yönlendirme ve çıkış akışlarını desteklemeli");
assert.match(aiServer, /process\.env\.JIRA_API_TOKEN[\s\S]*Basic \$\{Buffer\.from/, "JIRA API token yalnızca backend kimlik doğrulamasında kullanılmalı");
assert.match(aiServer, /JIRA_OAUTH_CLIENT_ID[\s\S]*JIRA_OAUTH_CLIENT_SECRET[\s\S]*JIRA_OAUTH_REDIRECT_URI/, "JIRA OAuth sırları yalnızca backend ortam ayarlarından okunmalı");
assert.match(aiServer, /\/api\/jira\/oauth\/start[\s\S]*crypto\.randomBytes[\s\S]*auth\.atlassian\.com\/authorize[\s\S]*state[\s\S]*prompt:\s*"consent"/, "JIRA OAuth başlangıcı tahmin edilemez state ve Atlassian consent yönlendirmesi kullanmalı");
assert.match(aiServer, /auth\.atlassian\.com\/oauth\/token[\s\S]*grant_type:\s*"refresh_token"[\s\S]*session\.refreshToken = token\.refresh_token/, "JIRA rotating refresh token her yenilemede güvenli biçimde değiştirilmelidir");
assert.match(aiServer, /oauth\/token\/accessible-resources/, "JIRA OAuth yetkilendirilen siteleri accessible-resources üzerinden almalı");
assert.match(aiServer, /api\.atlassian\.com\/ex\/jira\/\$\{encodeURIComponent\(session\.cloudId\)\}/, "JIRA OAuth API çağrıları yetkilendirilen cloudId üzerinden yapılmalı");
assert.match(aiServer, /JIRA_SESSION_COOKIE[\s\S]*HttpOnly[\s\S]*SameSite=None[\s\S]*Secure/, "JIRA OAuth oturumu HttpOnly ve HTTPS üzerinde cross-site güvenli çerez kullanmalı");
assert.doesNotMatch(jiraCloudClient, /client_secret|JIRA_OAUTH_CLIENT_SECRET|access_token|refresh_token/, "JIRA OAuth sırları ve tokenları frontend kodunda bulunmamalı");
assert.match(supabaseCloudClient, /async function invokeJira[\s\S]*functions\.invoke\("jira-proxy"[\s\S]*getSession/, "GitHub Pages JIRA istekleri Supabase oturumuyla Edge Function'a gönderilmeli");
assert.match(jiraCloudClient, /supabase:jira-proxy[\s\S]*SupabaseCloud\.invokeJira[\s\S]*function saveCredentials[\s\S]*function removeCredentials/, "JIRA istemcisi Supabase proxy ve kullanıcı bağlantı bakımını desteklemeli");
assert.match(jiraCloudClient, /githubPages[\s\S]*saved\.startsWith\("\/"\)[\s\S]*supabase:jira-proxy/, "GitHub Pages'teki eski göreli backend ayarı otomatik olarak Supabase proxy'ye taşınmalı");
assert.match(jiraEdgeFunction, /admin\.auth\.getUser\(token\)[\s\S]*get_jira_credentials[\s\S]*save_jira_credentials[\s\S]*delete_jira_credentials/, "JIRA Edge Function Supabase kullanıcısını doğrulayıp kişisel bağlantıyı güvenli RPC üzerinden yönetmeli");
assert.match(jiraEdgeFunction, /Authorization:\s*`Basic[\s\S]*\/rest\/api\/3\/search\/jql[\s\S]*\/worklog/, "JIRA Edge Function issue ve worklog işlemlerini sunucu tarafında gerçekleştirmeli");
assert.doesNotMatch(jiraEdgeFunction, /ATATT|sb_secret_[A-Za-z0-9_-]+|JIRA_API_TOKEN\s*=/, "Edge Function kaynak kodunda gerçek bir JIRA veya Supabase sırrı bulunmamalı");
assert.match(jiraVaultMigration, /private\.jira_credentials[\s\S]*vault\.create_secret[\s\S]*vault\.decrypted_secrets[\s\S]*revoke all[\s\S]*service_role/, "JIRA tokenı Vault'ta şifreli tutulmalı ve yalnızca service_role RPC erişimine açık olmalı");
assert.match(app, /async function saveJiraCredentials[\s\S]*JiraCloudClient\.saveCredentials[\s\S]*async function removeJiraCredentials[\s\S]*JiraCloudClient\.removeCredentials/, "JIRA bağlantı bilgileri uygulamadan kaydedilip kaldırılabilmeli");
assert.match(html, /class="header-utility-nav"[\s\S]*id="supabaseHeaderMenu"[\s\S]*id="driveHeaderMenu"[\s\S]*id="jiraHeaderMenu"[\s\S]*id="jiraCredentialTitle"[\s\S]*id="jiraSyncJql"[\s\S]*id="jiraAutoWorklog"/, "JIRA bağlantı ve senkronizasyon ayarları Bulut hesabı ile Yedekleme yanındaki ana menüde bulunmalı");
assert.doesNotMatch(html, /id="jiraApiEndpoint"|id="saveJiraApiEndpoint"|JIRA servis yöntemi|Adresi kaydet/, "Kullanıcının JIRA servis adresini elle yönetmesine gerek kalmamalı");
assert.match(app, /function refreshJiraHeaderMenu[\s\S]*headerJiraMenuLabel[\s\S]*is-connected[\s\S]*Ayarlar aktif/, "JIRA ana menüsü etkin bağlantıyı yeşil durumla göstermeli");
assert.match(css, /header-jira-menu\.is-connected[^{]*\{[^}]*background:\s*#1f9d74[\s\S]*jira-header-popover/, "Bağlı JIRA menüsü yeşil görünmeli ve ayarlar açılır pencerede yer almalı");
assert.match(app, /function renderJiraOAuthState[\s\S]*jiraOAuthBadge[\s\S]*connectJiraOAuth[\s\S]*disconnectJiraOAuth/, "JIRA OAuth bağlantı durumu arayüzde gösterilmeli");
assert.match(app, /connectJiraOAuth"\)\.addEventListener\("click"[\s\S]*signInWithJira[\s\S]*disconnectJiraOAuth"\)\.addEventListener\("click"[\s\S]*signOutFromJira/, "JIRA giriş ve çıkış düğmeleri OAuth istemcisine bağlanmalı");
assert.match(aiServer, /\/rest\/api\/3\/search\/jql[\s\S]*mapJiraIssue/, "Backend JQL ile JIRA maddelerini senkronize etmeli");
assert.match(aiServer, /singleJiraIssueMatch[\s\S]*\/rest\/api\/3\/issue\/\$\{encodeURIComponent\(issueKey\)\}\?fields=[\s\S]*mapJiraIssue/, "Backend tek bir JIRA Key ile tüm issue alanlarını almalı");
assert.match(jiraCloudClient, /function getIssue\(issueKey\)[\s\S]*request\(`\/issues\/\$\{encodeURIComponent\(key\)\}`/, "JIRA istemcisi Key ile tekil madde sorgulamalı");
assert.match(jiraCloudClient, /function transitionIssue\(issueKey, targetStatus\)[\s\S]*\/transitions[\s\S]*method:\s*"POST"/, "JIRA istemcisi issue statü transition işlemini desteklemeli");
assert.match(app, /function fetchJiraIssueByKey[\s\S]*JiraCloudClient\.getIssue\(key\)[\s\S]*JiraStore\.mergeAll/, "JIRA ekleme formu yalnızca Key ile JIRA Cloud'dan veri çekip birleştirmeli");
assert.match(html, /id="jiraForm"[\s\S]*id="jiraNameInput"[^>]*pattern="\[A-Za-z\]\[A-Za-z0-9_\]\*-\[0-9\]\+"[\s\S]*id="jiraSubmitButton"/, "JIRA formu yalnızca Key sorgusu içermeli");
assert.doesNotMatch(html, /id="jira(?:Description|Url|IssueType|Assignee|Reporter|Priority|Status|Resolution|Created|Updated|DueDate)Input"/, "JIRA formunda elle doldurulan detay alanları bulunmamalı");
assert.match(aiServer, /\/rest\/api\/3\/issue\/\$\{encodeURIComponent\(issueKey\)\}\/worklog/, "Backend JIRA worklog API'sine bağlanmalı");
assert.match(aiServer, /jiraTransitionMatch[\s\S]*\/transitions[\s\S]*transition:\s*\{\s*id:[\s\S]*mapJiraIssue/, "Backend hedef statüye uygun JIRA transition işlemini uygulamalı");
assert.match(aiServer, /worklogAuthor = currentUser\(\)[\s\S]*startedAfter[\s\S]*mapped\.authorAccountId === account\.accountId/, "Backend seçili tarih aralığında yalnızca oturum kullanıcısının JIRA workloglarını almalı");
assert.match(jiraCloudClient, /function syncWorklogs\(from, to\)[\s\S]*request\(`\/worklogs\?\$\{params\}`/, "JIRA istemcisi tarih aralığıyla worklog senkronizasyonunu desteklemeli");
assert.match(app, /function syncTimesheetJiraWorklogs[\s\S]*mergeJiraWorklogs[\s\S]*JIRA’dan alınan eforlar Drive’a gönderildi/, "Timesheet JIRA eforlarını mükerrer oluşturmadan yerel veriye ve Drive yedeğine aktarmalı");
assert.match(dataStore, /function mergeJiraWorklogs[\s\S]*byWorklogId[\s\S]*conflicts/, "JIRA worklog kimliğiyle mükerrer ve yerel değişiklik çakışmaları yönetilmeli");
assert.match(app, /function syncJiraCloudIssues[\s\S]*JiraStore\.mergeAll/, "Canlı JIRA senkronizasyonu mevcut Key kayıtlarını birleştirmeli");
assert.match(html, /class="jira-subtab-button active"[^>]*data-jira-tab="jiraItemsView"[\s\S]*data-jira-tab="jiraRequestsView"/, "JIRA ekranında JIRA Maddeleri ve Talepler alt sekmeleri bulunmalı");
assert.match(app, /function activateJiraSubview[\s\S]*jira-subtab-button[\s\S]*jira-subview/, "JIRA alt sekme geçişleri bağlanmalı");
assert.match(app, /function groupJiraRequestsByStatus[\s\S]*item\.status[\s\S]*function renderJiraRequests[\s\S]*jira-request-column/, "Talepler JIRA statüsüne göre Kanban sütunlarında gruplanmalı");
assert.match(app, /function renderJiraRequestStatusFilters[\s\S]*selectedJiraRequestStatuses[\s\S]*checkbox[\s\S]*renderJiraRequests/, "Talepler görünümünde çoklu statü seçimi bulunmalı");
assert.match(app, /selectAllJiraRequestStatuses[\s\S]*selectedJiraRequestStatuses\.add[\s\S]*clearJiraRequestStatuses[\s\S]*selectedJiraRequestStatuses\.clear/, "Tüm statüleri seçme ve temizleme işlemleri bağlanmalı");
assert.match(app, /function transitionJiraRequest[\s\S]*JiraCloudClient\.transitionIssue[\s\S]*JiraStore\.update\(previousItem\.id, previousItem\)/, "Kanban statü geçişi JIRA'ya gönderilmeli ve hatada yerel statü geri alınmalı");
assert.match(app, /function transitionJiraRequest[\s\S]*confirm\([\s\S]*JIRA’ya gönderilsin mi[\s\S]*if \(!approved\)[\s\S]*statü değişikliği iptal edildi/, "Kanban statü değişikliği JIRA'ya gönderilmeden önce kullanıcı onayı istemeli");
assert.match(app, /column\.addEventListener\("dragover"[\s\S]*column\.addEventListener\("drop"[\s\S]*card\.draggable[\s\S]*dragstart/, "Talep kartları statü sütunları arasında sürüklenip bırakılabilmeli");
assert.match(app, /jiraRequestsSearch[\s\S]*renderJiraRequests/, "Talepler görünümünde anlık arama bulunmalı");
assert.match(css, /jira-subtabs[\s\S]*jira-request-status-filters[\s\S]*jira-request-board[\s\S]*grid-auto-flow:\s*column[\s\S]*jira-request-column\.is-drop-target[\s\S]*jira-request-card\.is-dragging/, "Talepler Kanban'ında sürükleme hedefi ve taşınan kart stillendirilmeli");
assert.match(app, /function syncEffortToJira[\s\S]*updateWorklog[\s\S]*createWorklog/, "Efor kaydı JIRA worklog oluşturma ve güncelleme akışına bağlanmalı");
assert.match(app, /function syncEffortToJira[\s\S]*approvalMessage[\s\S]*confirm\(approvalMessage\)[\s\S]*approvalDeclined/, "JIRA worklog kullanıcı onayı olmadan gönderilmemeli");
assert.match(app, /bağlı JIRA worklog da silinsin mi[\s\S]*deleteWorklog/, "JIRA worklog silme işlemi ayrıca kullanıcı onayı istemeli");
assert.match(html, /class="jira-worklog-status hidden"/, "Efor geçmişi JIRA worklog durumunu göstermeli");
assert.match(app, /jira-worklog-status-icon[\s\S]*synced:\s*"✓"[\s\S]*JIRA’ya gönderildi/, "Başarılı JIRA worklog kaydı yeşil onay simgesiyle belirtilmeli");
assert.match(css, /jira-worklog-status\[data-status="synced"\][\s\S]*jira-worklog-status-icon[^{]*\{[^}]*background:\s*#1f9d74/, "Başarılı JIRA simgesi yeşil görünmeli");
assert.match(app, /function sanitizeTaskHtml/, "Görev HTML açıklaması güvenli biçimde temizlenmeli");
assert.match(taskDetailApp, /description\.innerHTML\s*=\s*sanitizeTaskHtml\(task\.descriptionHtml\)/, "Görev HTML açıklaması ayrı detay sayfasında yalnızca temizlenerek gösterilmeli");
assert.match(app, /blockedTags.*SCRIPT.*IFRAME.*OBJECT/s, "Tehlikeli HTML etiketleri engellenmeli");
assert.match(html, /data-task-command="bold"[\s\S]*data-task-command="insertUnorderedList"/, "Görev HTML biçimlendirme araçları eksik");
assert.match(app, /function applyTaskEditorCommand[\s\S]*button\.dataset\.taskCommand/, "Görev HTML araç çubuğu komutları bağlanmalı");
assert.match(html, /data-task-tab="taskCreateView"[\s\S]*data-task-tab="taskReportView"/, "Görev Ekle ve Yapılacak İşler alt sekmeleri eksik");
assert.match(html, /class="task-subtab-button active"[^>]*data-task-tab="taskReportView"/, "Görevler ilk açıldığında görev raporu görünmeli");
assert.match(html, /id="taskReportView" class="panel task-subview task-list-panel"/, "Görev raporu başlangıçta açık olmalı");
assert.match(html, /id="taskTypeFilter"[\s\S]*value="" selected[\s\S]*value="architecture_roadmap"/, "Görev raporu tüm görev tipi gruplarıyla açılmalı");
assert.match(html, /taskTypeGroupTemplate[\s\S]*task-type-group-total[\s\S]*data-priority="high"[\s\S]*data-priority="medium"[\s\S]*data-priority="low"[\s\S]*data-priority="none"/, "Görev tipi grup satırı toplam ve öncelik sayaçlarını içermeli");
assert.match(app, /function groupTasksByType[\s\S]*priorities:[\s\S]*high:[\s\S]*medium:[\s\S]*low:[\s\S]*none:/, "Görevler tip bazında toplam ve öncelik sayılarına göre gruplanmalı");
assert.match(app, /task-type-group-toggle[\s\S]*new URLSearchParams\(\{ type: group\.taskType \}\)[\s\S]*task-type-report\.html\?\$\{params\}/, "Görev tipi başlığı ayrı rapor sayfasına yönlenmeli");
assert.match(css, /task-type-priority-count\[data-priority="high"\][\s\S]*task-type-priority-count\[data-priority="medium"\][\s\S]*task-type-priority-count\[data-priority="low"\]/, "Öncelik sayaçları farklı renklerle gösterilmeli");
assert.match(app, /migrateExistingTasksToArchitectureRoadmap\(\)/, "Mevcut görevler Architecture Roadmap tipine dönüştürülmeli");
assert.match(html, /task-report-table[\s\S]*<thead><tr><th>Görev<\/th><th class="task-status-column">Durum<\/th><\/tr><\/thead>/, "Yapılacak İşler raporunda yalnızca Görev ve Durum başlıkları olmalı");
assert.doesNotMatch(html, /<thead><tr><th>Görev<\/th><th class="task-status-column">Durum<\/th><th/, "Görev ve Durum dışında ana rapor sütunu bulunmamalı");
assert.match(taskDetailHtml, /task-detail-overview-table[\s\S]*Tamamlandı[\s\S]*Görev \/ Alt Görev[\s\S]*Bağlı Ana Görev[\s\S]*Atanan \/ Kimde Bekliyor[\s\S]*Öncelik[\s\S]*Yıl \/ Çeyrek[\s\S]*Teslim Tarihi[\s\S]*Durum[\s\S]*İşlemler/, "Eski rapor sütunlarının tamamı ayrı görev detay sayfasında gösterilmeli");
assert.match(taskTypeReportHtml, /task-type-report-table[\s\S]*Tamamlandı[\s\S]*Görev \/ Alt Görev[\s\S]*Bağlı Ana Görev[\s\S]*Atanan \/ Kimde Bekliyor[\s\S]*Öncelik[\s\S]*Yıl \/ Çeyrek[\s\S]*Teslim Tarihi[\s\S]*Durum[\s\S]*İşlemler/, "Görev tipi raporu eski detay sütunlarının tamamını göstermeli");
assert.match(taskTypeReportApp, /TaskStore\.TASK_TYPES[\s\S]*filter\(\(task\)[\s\S]*task\.taskType[\s\S]*taskTypeReportBody/, "Görev tipi raporu yalnızca seçilen tipe ait maddeleri listelemeli");
assert.match(html, /taskPriorityInput[\s\S]*taskYearInput[\s\S]*taskQuarterInput/, "Görev formunda öncelik, yıl ve çeyrek alanları eksik");
assert.match(html, /taskTypeInput[\s\S]*meeting_organization[\s\S]*management_request/, "Görev tipi seçenekleri eksik");
assert.match(html, /taskTypeInput[\s\S]*architecture_roadmap/, "Architecture Roadmap görev tipi eksik");
assert.match(html, /id="taskAssigneeInput"[^>]*>[\s\S]*Atanmamış[\s\S]*Kişileri Ekip → Kişiler ekranından tanımlayabilirsiniz/, "Görev ataması kişi tanım ekranındaki seçim listesine bağlanmalı");
assert.doesNotMatch(html, /<thead><tr>[\s\S]*?<th>Görev tipi<\/th>[\s\S]*?<\/tr><\/thead>/, "Görev tipi grup başlığında olduğu için rapor tablosunda yinelenmemeli");
assert.doesNotMatch(html, /id="taskDueDateInput"[^>]*required/, "Yıl ve çeyrek kullanılan görevlerde teslim tarihi zorunlu olmamalı");
assert.doesNotMatch(html, /<thead><tr>[^<]*(?:<th[^>]*>[^<]*<\/th>)*<th>Detaylı açıklama<\/th>/, "Görev raporunda detaylı açıklama sütunu olmamalı");
assert.match(app, /function activateTaskSubview[\s\S]*activateTaskSubview\("taskReportView"\)/, "Görev alt sayfa geçişleri bağlanmalı");
assert.match(app, /function showTaskDetail[\s\S]*task-detail\.html\?id=[\s\S]*encodeURIComponent\(task\.id\)/, "Görev başlığı ayrı detay sayfasına gitmeli");
assert.match(taskDetailApp, /URLSearchParams[\s\S]*TaskStore\.get[\s\S]*sanitizeTaskHtml/, "Ayrı görev detay sayfası görevi okuyup açıklamayı güvenli göstermeli");
assert.match(taskDetailApp, /detailPageRevise[\s\S]*editTask=[\s\S]*encodeURIComponent\(task\.id\)/, "Görev detayından revizyon bağlantısı eksik");
assert.match(taskDetailApp, /fromType[\s\S]*task-type-report\.html\?type=[\s\S]*taskDetailBackLink/, "Tekil görev detayından görev tipi raporuna dönüş bağlantısı eksik");
assert.match(app, /function applyInitialRoute[\s\S]*editTask[\s\S]*startTaskEdit/, "Revizyon bağlantısı görev formunu açmalı");
assert.match(app, /store\?\.create/, "Create entegrasyonu eksik");
assert.match(app, /store\?\.update/, "Update entegrasyonu eksik");
assert.match(app, /store\?\.remove/, "Delete entegrasyonu eksik");
assert.doesNotMatch(html, /class="icon-button calendar-button"/, "Takvim düğmesi efor satırlarında olmamalı");
assert.match(html, /id="addNextTaskToCalendar"/, "Dashboard Google Takvim düğmesi eksik");
assert.match(app, /calendar\.google\.com\/calendar\/render/, "Google Takvim etkinlik adresi eksik");
assert.match(app, /dates:\s*`\$\{start\}\/\$\{end\}`/, "Takvim tarih aralığı eksik");
assert.match(html, /id="addNextTaskToOutlookCalendar"[^>]*>Outlook Takvim’e ekle<\/button>/, "Dashboard Outlook Takvim düğmesi eksik");
assert.match(app, /function outlookCalendarUrl[\s\S]*outlook\.office\.com\/calendar\/deeplink\/compose/, "Outlook Web etkinlik adresi eksik");
assert.match(app, /startdt:[\s\S]*enddt:[\s\S]*allday:\s*"true"[\s\S]*body:/, "Outlook etkinlik tarih ve açıklama alanları eksik");
assert.match(app, /addNextTaskToOutlookCalendar"\)\.addEventListener\("click"[\s\S]*outlookCalendarUrl/, "Outlook Takvim düğmesi etkinlik akışına bağlanmalı");
assert.ok(html.indexOf('src="drive-sync.js') < html.indexOf('src="app.js'), "Drive modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="tasks-store.js') < html.indexOf('src="app.js'), "Görev modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="people-store.js') < html.indexOf('src="app.js'), "Kişi modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="jira-store.js') < html.indexOf('src="app.js'), "JIRA modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="reminders-store.js') < html.indexOf('src="app.js'), "Hatırlatma modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="ai-assistant.js') < html.indexOf('src="app.js'), "AI istemci modülü uygulamadan önce yüklenmeli");
assert.match(html, /id="backupToDrive"/, "Drive yedekleme düğmesi eksik");
assert.match(html, /id="restoreFromDrive"/, "Drive geri yükleme düğmesi eksik");
assert.match(drive, /drive\.appdata/, "En az yetkili Drive kapsamı kullanılmalı");
assert.match(drive, /drive\.file/, "Göreve eklenen kullanıcı dosyaları için dar kapsamlı drive.file izni kullanılmalı");
assert.match(drive, /parents:\s*\["appDataFolder"\]/, "Yedek appDataFolder içine yazılmalı");
assert.match(drive, /uploadType=resumable[\s\S]*X-Upload-Content-Type[\s\S]*uploadTaskDocuments/, "Görev dokümanları Drive'a resumable upload ile gönderilmeli");
assert.match(drive, /application\/vnd\.google-apps\.folder[\s\S]*dailyEffortTrackerTaskId/, "Dokümanlar görev kimliğiyle işaretlenmiş ayrı Drive klasörlerinde tutulmalı");
assert.doesNotMatch(drive, /client_secret/i, "Client Secret tarayıcı kodunda bulunmamalı");
assert.match(tasks, /attachments:[\s\S]*normalizeAttachment[\s\S]*MAX_ATTACHMENTS/, "Görev veri modeli yalnızca normalize edilmiş doküman metadatasını saklamalı");
assert.match(app, /attachments:\s*taskExistingAttachments\.slice\(\)[\s\S]*uploadTaskDocuments[\s\S]*payload\.attachments\s*=\s*\[\.\.\.taskExistingAttachments,\s*\.\.\.uploaded\]/, "Görev formu seçilen dokümanları Drive'a yükleyip görevle ilişkilendirmeli");
assert.match(taskDetailApp, /safeDocumentUrl[\s\S]*task\.attachments[\s\S]*detailPageDocumentList/, "Görev detay sayfası Drive dokümanlarını güvenli bağlantılarla göstermeli");
assert.match(html, /class="drive-compact-panel"/, "Kompakt Drive yedekleme paneli eksik");
const pageHeaderEnd = html.indexOf("</header>");
const homeViewStart = html.indexOf('id="homeView"');
const mainMenuStart = html.indexOf('class="main-menu-bar"');
assert.ok(mainMenuStart > pageHeaderEnd && mainMenuStart < homeViewStart, "Ana navigasyon ve işlem menüleri üst başlığın altında yer almalı");
assert.ok(html.indexOf('id="driveHeaderMenu"') > pageHeaderEnd && html.indexOf('id="driveCompactPanel"') < homeViewStart, "Drive durumu, ayarları ve yedekleme işlemleri tek ana menü panelinde olmalı");
assert.match(css, /\.main-menu-bar\s*\{[^}]*display:\s*flex/, "Ana menü navigasyon ve işlem kontrollerini aynı satırda toplamalı");
assert.match(css, /\.header-menu-popover\s*\{[^}]*position:\s*absolute/, "Ana menü işlem kontrolleri kompakt açılır panel olarak stillendirilmeli");
assert.match(app, /function refreshDriveHeaderMenu[\s\S]*configured:\s*"Ayarlar kayıtlı"[\s\S]*driveConnectionBadge/, "Drive paneli kayıtlı ayarı ve bağlantı durumunu göstermeli");
assert.doesNotMatch(app, /function setRestorePromptVisible/, "Drive paneli sayfa açılışında otomatik açılan geri yükleme çağrısı kullanmamalı");
assert.doesNotMatch(html, /appEditMenu|Çalışma modu|Görüntüleme modu|Düzenleme modu/, "Çalışma modu menüsü tamamen kaldırılmalı");
assert.match(app, /backupAndReport\(editing \? "Güncellenen kayıt bekliyor\." : "Yeni kayıt bekliyor\."\)/, "Efor değişiklikleri Drive'a gönderilmek üzere bekleyen olarak işaretlenmeli");
assert.doesNotMatch(app, /Yeni kayıt Drive’a gönderildi|Timesheet üzerinden eklenen efor Drive’a gönderildi/, "Yeni efor ekleme işlemi Drive yedeği tetiklememeli");
assert.match(app, /skipInitialRestore"\)\.addEventListener\("click"[\s\S]*driveHeaderMenu"\)\.open\s*=\s*false/, "Şimdilik değil seçeneği Drive panelini kapatmalı");
assert.match(drive, /LAST_BACKUP_KEY/, "Son Drive sürümü zamanı saklanmalı");
assert.match(drive, /tasks:\s*Array\.isArray/, "Drive yedeği görevleri de içermeli");
assert.match(drive, /people:\s*Array\.isArray/, "Drive yedeği kişileri de içermeli");
assert.match(drive, /jiraItems:\s*Array\.isArray/, "Drive yedeği JIRA maddelerini de içermeli");
assert.match(drive, /reminders:\s*Array\.isArray/, "Drive yedeği hatırlatmaları da içermeli");
assert.match(app, /reminders:\s*window\.ReminderStore\.list\(\)/, "Hatırlatmalar Drive yedek paketine eklenmeli");
assert.match(app, /people:\s*window\.PeopleStore\.list\(\)/, "Kişiler Drive yedek paketine eklenmeli");
assert.match(tasks, /planned.*in_progress.*completed/, "Görev durumları eksik");
assert.match(tasks, /PRIORITIES[\s\S]*high[\s\S]*medium[\s\S]*low/, "Görev öncelik değerleri eksik");
assert.match(tasks, /QUARTERS[\s\S]*Q1[\s\S]*Q4/, "Görev çeyrek değerleri eksik");
assert.match(tasks, /TASK_TYPES[\s\S]*standard[\s\S]*meeting_organization[\s\S]*management_request/, "Görev tipi veri modeli eksik");
assert.match(taskDetailApp, /taskTypeLabel[\s\S]*detailPageAssignee/, "Görev tipi ve atanan kişi ayrı detay sayfasına bağlanmalı");
assert.match(app, /function populateTaskAssigneeOptions[\s\S]*PeopleStore\.list[\s\S]*person\.fullName[\s\S]*person\.email/, "Görev atama listesi tanımlı kişilerden oluşturulmalı");
assert.match(app, /function selectedTaskAssignment[\s\S]*assigneeId:[\s\S]*person\.id/, "Görev kaydı seçilen kişinin kimliğini ve adını saklamalı");
assert.match(tasks, /assigneeId:[\s\S]*Atanan kişi bağlantısı geçersiz/, "Görev veri modeli kişi bağlantısını doğrulamalı");
assert.match(peopleStore, /function validate[\s\S]*fullName[\s\S]*email[\s\S]*function duplicateEmail[\s\S]*function replaceAll/, "Kişi veri modeli ad-soyad, e-posta tekilliği ve yedek geri yüklemeyi desteklemeli");
assert.match(peopleStore, /function mergeJiraUsers[\s\S]*jiraAccountId[\s\S]*emailMatchIndex[\s\S]*created[\s\S]*updated/, "JIRA kullanıcıları Account ID ve e-posta üzerinden mevcut kişileri koruyarak birleştirilmeli");
assert.match(jiraCloudClient, /function syncUsers[\s\S]*\/users\?/, "JIRA istemcisi aktif kullanıcı senkronizasyonunu desteklemeli");
assert.match(aiServer, /\/api\/jira\/users[\s\S]*\/rest\/api\/3\/users\/search[\s\S]*user\.active[\s\S]*accountType/, "Backend yalnızca aktif Atlassian kullanıcılarını güvenli proxy üzerinden döndürmeli");
assert.match(app, /async function syncJiraPeople[\s\S]*JiraCloudClient\.syncUsers[\s\S]*PeopleStore\.mergeJiraUsers[\s\S]*backupAndReport/, "Kişiler ekranı JIRA kullanıcılarını yerel değişiklik olarak içe aktarmalı");
assert.match(app, /function renderPeople[\s\S]*peopleSearchInput[\s\S]*person-avatar[\s\S]*person-source-badge[\s\S]*E-posta JIRA’da gizli/, "Kişiler ekranı JIRA profil bilgilerini, kaynağı ve gizli e-posta durumunu göstermeli");
assert.match(css, /people-sync-panel/, "JIRA kullanıcı senkronizasyon paneli stillendirilmeli");
assert.match(css, /person-avatar[\s\S]*person-source-badge/, "JIRA kullanıcı profil görseli ve kaynak rozeti stillendirilmeli");
assert.match(css, /person-card\[data-source="jira"\]/, "JIRA kaynaklı kişi kartları görsel olarak ayrıştırılmalı");
assert.match(peopleStore, /ROLES[\s\S]*title:[\s\S]*role:[\s\S]*managerId:[\s\S]*function relationshipError/, "Kişi veri modeli ünvan, lider rolü ve yönetici ilişkisini desteklemeli");
assert.match(peopleStore, /Organizasyon yapısında döngü oluşturulamaz/, "Organizasyon şeması döngüsel yönetici bağlantılarını engellemeli");
assert.match(app, /function renderPeople[\s\S]*person-card[\s\S]*mailto:[\s\S]*Düzenle[\s\S]*Sil/, "Kişiler ekranı kişi bakım işlemlerini göstermeli");
assert.match(app, /personForm\.addEventListener\("submit"[\s\S]*PeopleStore\.(?:update|create)[\s\S]*synchronizeTasksForPerson/, "Kişi formu CRUD ve mevcut görev atamalarını koruma akışına bağlanmalı");
assert.match(app, /currentTaskCount[\s\S]*Önce bu görevleri başka bir kişiye atayın/, "Görev atanmış kişi silinmeye karşı korunmalı");
assert.match(html, /data-tab="teamView"[\s\S]*id="teamView"[\s\S]*data-team-tab="peopleView"[\s\S]*data-team-tab="organizationView"[\s\S]*id="organizationLeaderFilter"/, "Kişiler ve organizasyon Ekip ana sekmesinin alt sekmeleri olmalı");
assert.doesNotMatch(html, /class="tab-button"[^>]*data-tab="(?:peopleView|organizationView)"/, "Kişiler ve organizasyon ayrı ana menü öğeleri olmamalı");
assert.match(app, /function activateTeamSubview[\s\S]*team-subtab-button[\s\S]*team-subview/, "Ekip alt sekmeleri bağımsız görünüm değiştirmeli");
assert.match(app, /function renderOrganization\([\s\S]*teamIds[\s\S]*teamTasks[\s\S]*organizationTaskList/, "Seçilen liderin tüm alt ekibine ait görevler gösterilmeli");
assert.doesNotMatch(html, /Raporlama hattı|organizationTreeTitle|id="organizationTree"/, "Organizasyon ekranında raporlama hattı ve ekip yapısı paneli bulunmamalı");
assert.match(css, /organization-layout[^{]*\{[^}]*display:\s*block[\s\S]*organization-task-table/, "Organizasyon ekip iş yükü görünümü tam genişlikte stillendirilmeli");
assert.match(tasks, /function mergeAll/, "Görev planı toplu içe aktarma desteği eksik");
assert.match(tasks, /function ensureHierarchy[\s\S]*parentTaskId/, "Ana görev-alt görev veri bağlantısı eksik");
assert.match(app, /function parseTaskPlanText[\s\S]*priorityMap[\s\S]*quarterEndDate/, "Görev planı TSV ayrıştırıcısı eksik");
assert.match(app, /taskPlanImport[\s\S]*importTaskPlan/, "Görev planı dosya seçimi bağlanmalı");
assert.match(app, /taskPlanPasteForm[\s\S]*importTaskPlanSource/, "Görev planı metin yapıştırma akışı bağlanmalı");
assert.match(app, /function startSubtaskCreate[\s\S]*parentTaskId\.value\s*=\s*parentTask\.id/, "Alt görev ekleme akışı eksik");
assert.match(taskDetailHtml, /id="detailPageAddSubtask"/, "Alt görev ekleme seçeneği ayrı görev detay sayfasında bulunmalı");
assert.match(app, /parentTask[\s\S]*startSubtaskCreate/, "Görev detayından alt görev ekleme rotası bağlanmalı");
assert.match(taskDetailApp, /detailPageSubtaskList[\s\S]*taskUrl\(subtask\.id\)/, "Ayrı görev detay sayfasında alt görev bağlantıları eksik");
assert.match(taskTypeReportApp, /function orderTasksByHierarchy[\s\S]*parentTaskId[\s\S]*depth/, "Görev tipi raporunda ana görev-alt görev sırası korunmalı");
assert.match(taskTypeReportApp, /function detailUrl[\s\S]*new URLSearchParams\(\{ id: taskId, fromType: taskType \}\)[\s\S]*task-detail\.html\?\$\{params\}/, "Görev tipi raporundaki maddeler tekil görev detayına bağlanmalı");
assert.match(app, /function tasksForType[\s\S]*includedIds/, "Görev tipi filtresinde hiyerarşik bağlam korunmalı");
assert.match(app, /taskTypeFilter[\s\S]*tasksForType[\s\S]*renderTasks/, "Görev tipi filtresi rapora bağlanmalı");
assert.match(app, /taskType:\s*"architecture_roadmap"/, "Yapıştırılan görev planı Architecture Roadmap olarak işaretlenmeli");
assert.match(html, /driveSettingsSummary[\s\S]*editDriveSettings[\s\S]*driveSettingsEditor[\s\S]*backupToDrive[\s\S]*restoreFromDrive[\s\S]*skipInitialRestore/, "Drive ayarı ve tüm yedekleme işlemleri tek kompakt panelde olmalı");
assert.match(app, /editDriveSettings"\)\.addEventListener[\s\S]*setDriveSettingsEditing\(true\)[\s\S]*cancelDriveSettings/, "Kayıtlı Drive ayarı yalnızca kullanıcı düzenlemek istediğinde açılmalı");
assert.match(html, /value="week"[\s\S]*value="month"[\s\S]*value="custom"/, "Timesheet dönem seçenekleri eksik");
assert.match(app, /getTimesheetRange/, "Timesheet tarih aralığı hesaplaması eksik");
assert.match(app, /includeWeekends/, "Hafta sonu filtresi eksik");
assert.match(app, /dayTotals/, "Timesheet günlük toplamları eksik");
assert.match(css, /timesheet-scroll[^{]*\{[^}]*overflow-x:\s*auto/, "Timesheet yatay kaydırma eksik");
assert.match(app, /groupedByDate/, "Aynı gün eforlarının tarih bazında gruplanması eksik");
assert.match(app, /formatEffortDays\(dayTotal\)[\s\S]*dayEntries\.length/, "Günlük kayıt sayısı ve gün karşılığı eksik");
assert.doesNotMatch(html, /class="entry-date"/, "Her efor satırında tekrarlanan tarih kutusu olmamalı");
assert.match(app, /dayTotal\s*>=\s*8/, "Günlük 8 saat tamamlanma eşiği eksik");
assert.match(app, /day-progress/, "Günlük efor ilerleme göstergesi eksik");
assert.match(app, /dayTotals.*total\s*>=\s*8/s, "Timesheet 8 saat tamamlanma göstergesi eksik");
assert.match(css, /entry-day-group\.day-complete/, "Tamamlanan gün görsel stili eksik");
assert.match(html, /value="jira"[^>]*selected[\s\S]*value="day"/, "Timesheet JIRA ve günlük satır seçenekleri eksik");
assert.match(app, /issueKey:[\s\S]*jiraItem\?\.name/, "Timesheet satırları JIRA anahtarına bağlanmalı");
assert.match(app, /"Key"[\s\S]*"Issue"[\s\S]*"Priority"/, "Timesheet JIRA sabit sütunları eksik");
assert.match(app, /timesheet-month-row/, "Timesheet ay başlık satırı eksik");
assert.match(app, /group\.days\.set\(entry\.date,\s*\(group\.days\.get\(entry\.date\)/, "Aynı gün eforları tek hücrede toplanmalı");
assert.match(app, /grouping\s*===\s*"day"\s*\?\s*"__daily_summary__"/, "Günlük birleşik Timesheet grubu eksik");
assert.match(app, /function timesheetGroupKey[\s\S]*no-jira:\$\{entry\.id\}/, "JIRA'sı olmayan eforlar Timesheet'te ayrı satırlara ayrılmalı");
assert.match(app, /!hasRealJira\s*\?\s*"JIRA-YOK"[\s\S]*description/, "JIRA'sı olmayan satır kendi efor açıklamasını göstermeli");
assert.match(app, /countLabel\.textContent\s*=\s*`\$\{count\}\s*kayıt`/, "Birleşen günlük kayıt sayısı gösterilmeli");
assert.doesNotMatch(app, /timesheet-row-toggle|expandedTimesheetGroups/, "Timesheet satır kulakçıkları kaldırılmalı");
assert.match(app, /timesheet-effort-button[\s\S]*openEffortEditModal/, "Timesheet efor düzenleme popup bağlantısı eksik");
assert.match(app, /const effortDescription\s*=\s*entriesForCell[\s\S]*entry\.task\s*\|\|\s*entry\.description[\s\S]*effortButton\.title\s*=\s*effortDescription/, "Timesheet eforunun üzerine gelindiğinde efor açıklaması gösterilmeli");
assert.match(app, /jiraSyncCounts[\s\S]*timesheet-jira-sync-summary[\s\S]*"synced", "✓", "JIRA’ya gönderildi"[\s\S]*"imported", "↓", "JIRA’dan alındı"[\s\S]*"local", "○", "JIRA’ya gönderilmedi"[\s\S]*"pending", "↑"[\s\S]*"failed", "!"/, "Timesheet hücreleri JIRA gönderim, içe aktarma ve yerel kayıt durumlarını göstermeli");
assert.match(css, /timesheet-jira-status\[data-status="synced"\][^{]*\{[^}]*background:\s*#1f9d74/, "Timesheet başarılı JIRA gönderimi yeşil simgeyle gösterilmeli");
assert.match(css, /timesheet-jira-status\[data-status="imported"\][^{]*\{[^}]*background:\s*#1f9d74/, "Timesheet JIRA’dan alınan eforu yeşil simgeyle göstermeli");
assert.match(css, /timesheet-jira-status\[data-status="local"\][^{]*\{[^}]*background:\s*#d29b19/, "Timesheet JIRA’ya gönderilmeyen yerel eforu sarı simgeyle göstermeli");
assert.match(app, /timesheet-empty-effort-button[\s\S]*openEffortCreateModal\(row\.jiraId, iso\)/, "Boş Timesheet hücresinden JIRA ve tarih bazlı efor ekleme eksik");
assert.match(app, /function openEffortCreateModal[\s\S]*modalDateInput[\s\S]*showModal/, "Yeni Timesheet efor popup akışı eksik");
assert.match(html, /id="modalRepeatEntryToggle"[\s\S]*Ardışık çoklu giriş[\s\S]*yalnızca tarih ve süreyi girersiniz/, "Efor popup'ında ardışık çoklu giriş seçeneği bulunmalı");
assert.match(app, /function renderRepeatEntryMode[\s\S]*modalRepeatEntryToggle[\s\S]*Kaydet ve yeni giriş aç/, "Çoklu giriş seçeneği kaydetme düğmesini ardışık giriş moduna çevirmeli");
assert.match(app, /const repeatEntry = \$\("#modalRepeatEntryToggle"\)\.checked[\s\S]*saveEntry\(\{ \.\.\.payload, date:[\s\S]*syncEffortToJira[\s\S]*if \(repeatEntry\)[\s\S]*modalDateInput"\)\.value = ""[\s\S]*modalHoursInput"\)\.value = ""[\s\S]*modalDateInput"\)\.focus\(\)/, "Ardışık çoklu girişte kayıt sonrası yalnızca tarih ve süre temizlenip popup açık kalmalı");
assert.match(css, /repeat-entry-toggle:has\(input:checked\)/, "Ardışık çoklu giriş seçimi görsel olarak belirtilmeli");
assert.match(css, /timesheet-empty-effort-button/, "Boş Timesheet hücresi ekleme düğmesi stili eksik");
assert.match(app, /effortEditModalForm\.addEventListener\("submit"[\s\S]*getStore\(\)\.update/, "Popup üzerinden efor revizyonu eksik");
assert.match(deleteEffortBlock, /confirm\([\s\S]*removeEntry\(entry\.id\)[\s\S]*render\(\)/, "Efor silme işlemi kullanıcı onayıyla çalışmalı");
assert.doesNotMatch(deleteEffortBlock, /backupAndReport|Drive/, "Efor silme işlemi Drive yedeği tetiklememeli");
assert.doesNotMatch(effortModalSubmitBlock.slice(0, effortModalSubmitBlock.indexOf("const result = entry")), /backupAndReport|Drive’a gönderildi/, "Timesheet efor ekleme işlemi Drive yedeği tetiklememeli");
assert.match(app, /deleteEffortModal"\)\.addEventListener\("click"[\s\S]*deleteEffortEntry\(entry\)[\s\S]*closeEffortModal/, "Timesheet düzenleme popup'ı efor silme akışına bağlanmalı");
assert.match(app, /jiraWorklogId[\s\S]*bağlı JIRA worklog da silinsin mi[\s\S]*JiraCloudClient\.deleteWorklog/, "Efora bağlı JIRA worklog ayrı onayla silinebilmeli");
assert.match(app, /issueSummary:[\s\S]*jiraItem\?\.description/, "Timesheet Issue alanında JIRA summary gösterilmeli");
assert.match(html, /entry-jira-summary[\s\S]*entry-effort-description/, "Efor geçmişinde JIRA summary ve efor açıklaması ayrılmalı");
assert.match(app, /jiraId:\s*fields\.jiraId\.value/, "Efor kaydında JIRA seçimi saklanmalı");
assert.match(app, /id:\s*"__dummy_jira__"[\s\S]*name:\s*"JIRA-YOK"/, "Geçici dummy JIRA tanımı eksik");
assert.match(html, /id="jiraItemInput"[\s\S]*JIRA-YOK/, "Efor formunda geçici JIRA seçeneği açıklanmalı");
assert.match(app, /const getJiraItem[\s\S]*DUMMY_JIRA/, "Dummy JIRA kayıt çözümleme akışına bağlanmalı");
assert.match(jira, /name.*description.*url/s, "JIRA adı, açıklaması ve URL alanları eksik");
assert.match(app, /JIRA_TABLE_COLUMNS[\s\S]*Issue Type[\s\S]*Key[\s\S]*Summary[\s\S]*Assignee[\s\S]*Reporter[\s\S]*Priority[\s\S]*Status[\s\S]*Resolution[\s\S]*Created[\s\S]*Updated[\s\S]*Due date/, "JIRA tablo sütunları eksik");
assert.match(app, /function renderJiraTableHeader[\s\S]*draggable\s*=\s*true[\s\S]*dragstart[\s\S]*drop/, "JIRA kolonları sürükle-bırak ile sıralanabilmeli");
assert.match(app, /function beginJiraColumnResize[\s\S]*pointermove[\s\S]*jiraTableLayout\.widths/, "JIRA kolon genişlikleri kullanıcı tarafından değiştirilebilmeli");
assert.match(app, /function renderJiraColumnOptions[\s\S]*checkbox[\s\S]*jiraTableLayout\.visible/, "JIRA kolonları görünümden çıkarılıp yeniden eklenebilmeli");
assert.match(app, /function autoFitJiraColumns[\s\S]*scrollWidth[\s\S]*applyJiraColumnWidths/, "JIRA kolonları içerik genişliğine otomatik sığdırılmalı");
assert.match(app, /function scheduleJiraAutoFit[\s\S]*requestAnimationFrame[\s\S]*autoFitJiraColumns\(false\)/, "JIRA otomatik sığdırma görünür tablo yerleşiminden sonra çalışmalı");
assert.match(app, /function activateMainView[\s\S]*mainViewId === "jiraView"[\s\S]*scheduleJiraAutoFit\(\)[\s\S]*function activateJiraSubview[\s\S]*viewId === "jiraItemsView"[\s\S]*scheduleJiraAutoFit\(\)/, "JIRA Maddeleri tabı ve alt görünümü açıldığında kolonlar yeniden sığdırılmalı");
assert.match(css, /jira-issue-table[^{]*\{[^}]*width:\s*max-content[\s\S]*jira-column-resizer[^{]*\{[^}]*cursor:\s*col-resize/, "JIRA tablosu sıkı içerik genişliği ve kolon boyutlandırma tutamacı kullanmalı");
assert.match(app, /DOMParser[\s\S]*#issuetable/, "JIRA HTML içe aktarma ayrıştırıcısı eksik");
assert.match(jira, /mergeAll/, "JIRA HTML kayıtlarını birleştirme desteği eksik");
assert.match(jira, /normalizeKey[\s\S]*duplicateCount[\s\S]*idRemap/, "JIRA HTML içe aktarımında Key tekilleştirme ve bağlantı eşleme desteği eksik");
assert.match(app, /function relinkMergedJiraEntries[\s\S]*idRemap\[entry\.jiraId\]/, "Mükerrer JIRA'ya bağlı eforlar korunan JIRA kaydına taşınmalı");
assert.doesNotMatch(app, /pagehide|visibilitychange/, "Drive yedeği yalnızca kullanıcı Kaydet dediğinde gönderilmeli");
assert.doesNotMatch(app, /APP_EDIT_SESSION_KEY|requireAppEditMode|setAppEditMode|EDIT_ACTION_SELECTOR/, "Veri değiştiren kontroller çalışma modu ile kilitlenmemeli");
assert.doesNotMatch(css, /body:not\(\.app-edit-mode\)/, "Düzenleme işlemleri CSS ile çalışma moduna göre devre dışı bırakılmamalı");
assert.match(cloudDataRuntime, /const records = new Map[\s\S]*function write[\s\S]*upserts[\s\S]*deletedIds[\s\S]*function suspend/, "Uygulama verileri yalnızca bellekte tutulup değişiklikler izlenmeli");
assert.doesNotMatch([dataStore, tasks, peopleStore, jira, reminders].join("\n"), /localStorage\.(?:getItem|setItem)/, "Efor, görev, kişi, JIRA ve hatırlatma mağazaları localStorage kullanmamalı");
assert.match(app, /supabaseAuthForm[\s\S]*SupabaseCloud\.signIn[\s\S]*supabaseSignUp[\s\S]*SupabaseCloud\.signUp[\s\S]*supabaseForgotPassword[\s\S]*sendPasswordReset/, "Supabase hesap menüsü giriş, kayıt ve e-posta şifre yenilemeye bağlanmalı");
assert.match(app, /function refreshSupabaseAccount[\s\S]*ensureCloudDataLoaded\(\)[\s\S]*function pullFromSupabase[\s\S]*replaceLocalBundle[\s\S]*setCloudDataGate\("ready"\)/, "Supabase oturumu açıldığında bulut verileri otomatik yüklenmeli");
assert.match(app, /function queueCloudChange[\s\S]*SupabaseCloud\.applyChanges\(change\)[\s\S]*Tüm değişiklikler Supabase’e kaydedildi/, "Her bellek değişikliği otomatik olarak Supabase'e gönderilmeli");
assert.match(app, /CloudDataRuntime\.setChangeHandler\(queueCloudChange\)/, "Bulut çalışma katmanı otomatik Supabase kaydına bağlanmalı");
assert.doesNotMatch(html, /id="supabasePush"|Yerel verileri gönder|Supabase’den yükle/, "Bulut-öncelikli uygulamada manuel yerel veri gönderme akışı bulunmamalı");
assert.match(taskDetailApp, /initializeTaskDetail[\s\S]*SupabaseCloud\.getSession[\s\S]*SupabaseCloud\.pullBundle[\s\S]*TaskStore\.replaceAll/, "Görev detay sayfası veriyi Supabase'den yüklemeli");
assert.match(taskTypeReportApp, /initializeTaskTypeReport[\s\S]*SupabaseCloud\.getSession[\s\S]*SupabaseCloud\.pullBundle[\s\S]*TaskStore\.replaceAll/, "Görev tipi raporu veriyi Supabase'den yüklemeli");
assert.match(drive, /keepalive:\s*Boolean\(options\.keepalive\)/, "Kapanış isteği keepalive kullanmalı");

console.log("✓ frontend DOM/veri katmanı sözleşmesi");
console.log("✓ responsive kırılımlar ve güvenli metin render kontrolü");
