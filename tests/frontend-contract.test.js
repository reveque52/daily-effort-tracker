"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const dataStore = fs.readFileSync(path.join(root, "data-store.js"), "utf8");
const drive = fs.readFileSync(path.join(root, "drive-sync.js"), "utf8");
const tasks = fs.readFileSync(path.join(root, "tasks-store.js"), "utf8");
const jira = fs.readFileSync(path.join(root, "jira-store.js"), "utf8");
const reminders = fs.readFileSync(path.join(root, "reminders-store.js"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "ai-assistant.js"), "utf8");
const jiraCloudClient = fs.readFileSync(path.join(root, "jira-cloud.js"), "utf8");
const outlookCalendarClient = fs.readFileSync(path.join(root, "outlook-calendar.js"), "utf8");
const aiServer = fs.readFileSync(path.join(root, "server.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const taskDetailHtml = fs.readFileSync(path.join(root, "task-detail.html"), "utf8");
const taskDetailApp = fs.readFileSync(path.join(root, "task-detail.js"), "utf8");
const taskTypeReportHtml = fs.readFileSync(path.join(root, "task-type-report.html"), "utf8");
const taskTypeReportApp = fs.readFileSync(path.join(root, "task-type-report.js"), "utf8");

const requiredIds = [
  "homeView", "homeWeekLabel", "homeWeeklyHours", "homeWeeklyGoal", "homeWeeklyEntryCount",
  "homePlannedTasks", "homeInProgressTasks", "weeklyEffortChart", "taskStatusChart",
  "jiraEffortChart", "homeOpenTaskCount", "homePendingTaskList",
  "reminderPanelTitle", "reminderOpenCount", "openReminderModal", "reminderTickerWindow", "reminderModal", "reminderModalTitle", "closeReminderModal", "reminderForm", "reminderId", "reminderTextInput",
  "reminderDateInput", "reminderImportanceInput", "reminderOptions", "reminderSubmitLabel", "cancelReminderEdit", "reminderFormMessage", "reminderEmptyState", "reminderList",
  "outlookCalendarTitle", "outlookCalendarConnection", "connectOutlookCalendar", "refreshOutlookCalendar", "disconnectOutlookCalendar", "outlookCalendarRange", "outlookCalendarPeriod", "outlookCalendarSettings", "outlookClientId", "outlookTenantId", "saveOutlookSettings", "outlookRedirectUri", "outlookCalendarStatus", "outlookCalendarEmpty", "outlookCalendarList",
  "openAiAssistant", "aiAssistantPanel", "aiAssistantTitle", "aiAssistantStatus", "closeAiAssistant",
  "aiAssistantMessages", "aiAssistantForm", "aiAssistantInput", "aiAssistantInputCount", "sendAiAssistantMessage",
  "aiAssistantEndpoint", "saveAiAssistantEndpoint",
  "effortForm", "entryId", "dateInput", "hoursInput",
  "descriptionInput", "filterDateInput", "entryList", "entryTemplate",
  "dailyTotal", "dailyDays", "effortWeekHours", "effortWeekDays", "effortMonthHours", "effortMonthDays", "grandTotal", "effortTotalDays", "entryCount", "formMessage", "lastBackupTime",
  "restorePrompt", "initialRestoreButton", "skipInitialRestore",
  "tasksView", "taskForm", "taskTitleInput", "taskDueDateInput", "taskStatusInput", "taskDescriptionInput",
  "taskParentTaskInput", "taskAssigneeInput", "taskAssigneeOptions", "taskTypeInput", "taskPriorityInput", "taskYearInput", "taskQuarterInput", "taskPlanImport",
  "openTaskPlanPaste", "taskPlanImportModal", "taskPlanPasteForm", "taskPlanTextInput", "taskPlanPasteMessage",
  "taskList", "taskTemplate", "taskTypeGroupTemplate", "taskCreateView", "taskReportView", "taskDetailView", "taskDetailTitle",
  "taskDetailDescription", "taskDetailParentItem", "taskDetailAssignee", "taskDetailType", "taskDetailPriority", "taskDetailPlan", "taskDetailSubtaskList", "taskDetailSubtaskCount", "addSubtaskButton", "taskTypeFilter", "taskFilterEmpty", "reviseTaskButton", "backToTaskReport", "taskReportCount", "taskReportTableWrap", "addNextTaskToCalendar", "addNextTaskToOutlookCalendar",
  "timesheetView", "timesheetPeriod", "timesheetReferenceDate", "timesheetStartDate",
  "timesheetEndDate", "includeWeekends", "addTimesheetEffort", "syncJiraWorklogs", "timesheetJiraSyncStatus", "timesheetTable", "timesheetTotalHours",
  "timesheetGrouping",
  "jiraItemPicker", "jiraItemPickerButton", "jiraItemPickerValue", "jiraItemPickerDropdown", "jiraItemSearchInput", "jiraItemSearchCount", "jiraItemOptionList", "jiraItemInput", "jiraView", "jiraForm", "jiraNameInput", "jiraSubmitButton", "jiraSubmitLabel",
  "jiraList", "jiraTemplate", "jiraHtmlImport",
  "jiraCloudTitle", "jiraApiEndpoint", "jiraSyncJql", "saveJiraApiEndpoint", "testJiraConnection", "syncJiraIssues", "jiraAutoWorklog", "jiraCloudStatus",
  "jiraSearchInput", "jiraColumnManager", "jiraColumnOptions", "autoFitJiraColumns", "resetJiraColumns", "jiraColumnStatus", "jiraIssueTable", "jiraTableHeaderRow", "jiraTableBody", "effortEditModal", "effortEditModalForm", "modalEntrySelect",
  "modalJiraInput", "modalDateInput", "modalHoursInput", "modalDescriptionInput", "effortEditModalSubmitLabel",
];

for (const id of requiredIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Eksik DOM sözleşmesi: #${id}`);
}

for (const id of ["taskDetailPageContent", "detailPageTitle", "detailPageTaskType", "detailPagePriority", "detailPageStatus", "detailPageCompleted", "detailPageOverviewTask", "detailPageParent", "detailPageAssignee", "detailPagePriorityValue", "detailPagePlan", "detailPageDueDate", "detailPageStatusValue", "detailPageDescription", "detailPageSubtaskList", "detailPageRevise"]) {
  assert.match(taskDetailHtml, new RegExp(`id=["']${id}["']`), `Eksik görev detay sayfası sözleşmesi: #${id}`);
}

for (const id of ["taskTypeReportTitle", "taskTypeReportContent", "taskTypeReportTotal", "taskTypeReportOpen", "taskTypeReportInProgress", "taskTypeReportCompleted", "taskTypeReportBody"]) {
  assert.match(taskTypeReportHtml, new RegExp(`id=["']${id}["']`), `Eksik görev tipi raporu sözleşmesi: #${id}`);
}

assert.ok(html.indexOf('src="data-store.js') < html.indexOf('src="app.js'), "Veri katmanı uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="vendor/msal-browser.min.js') < html.indexOf('src="outlook-calendar.js') && html.indexOf('src="outlook-calendar.js') < html.indexOf('src="app.js'), "MSAL ve Outlook Takvim istemcileri uygulamadan önce yüklenmeli");
assert.match(html, /<meta\s+name="viewport"/i, "Mobil viewport tanımı eksik");
assert.match(css, /@media\s*\(max-width:\s*850px\)/, "Tablet kırılımı eksik");
assert.match(css, /@media\s*\(max-width:\s*600px\)/, "Mobil kırılımı eksik");
assert.match(html, /class="tab-button active"[^>]*data-tab="homeView"/, "Ana Sayfa varsayılan sekme olmalı");
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
assert.match(html, /id="outlookCalendarTitle"[\s\S]*id="connectOutlookCalendar"[\s\S]*id="outlookCalendarList"/, "Ana Sayfada Outlook Takvim ajandası bulunmalı");
assert.match(outlookCalendarClient, /SCOPES\s*=\s*\["Calendars\.ReadBasic"\]/, "Outlook Takvim yalnızca en düşük salt okunur takvim iznini istemeli");
assert.match(outlookCalendarClient, /createStandardPublicClientApplication[\s\S]*cacheLocation:\s*"sessionStorage"[\s\S]*handleRedirectPromise/, "Outlook OAuth akışı PKCE destekli MSAL SPA istemcisi kullanmalı");
assert.match(outlookCalendarClient, /startDateTime[\s\S]*endDateTime[\s\S]*graph\.microsoft\.com\/v1\.0\/me\/calendar\/calendarView/, "Outlook etkinlikleri Microsoft Graph calendarView üzerinden tarih aralığıyla alınmalı");
assert.doesNotMatch(outlookCalendarClient, /clientSecret|CLIENT_SECRET/, "Microsoft client secret tarayıcı kodunda bulunmamalı");
assert.match(app, /function renderOutlookCalendar[\s\S]*outlook-day-group[\s\S]*outlook-event-time[\s\S]*event\.subject/, "Outlook etkinlikleri tarih ve saat bazlı ajanda olarak gösterilmeli");
assert.match(app, /function initializeOutlookCalendar[\s\S]*OutlookCalendar\.initialize[\s\S]*refreshOutlookCalendar/, "Outlook oturumu uygulama açılışında geri yüklenip ajanda yenilenmeli");
assert.match(app, /reminderForm\.addEventListener\("submit"[\s\S]*ReminderStore\.(?:update|create)/, "Not ve hatırlatma formu CRUD akışına bağlanmalı");
assert.match(reminders, /function validate[\s\S]*function replaceAll/, "Hatırlatma veri modeli doğrulama ve yedek geri yükleme sağlamalı");
assert.ok(html.indexOf('class="panel home-quick-reminder"') < html.indexOf('class="home-kpi-grid"'), "Önemli Notlar ve Hatırlatmalar Ana Sayfanın üst kısmında olmalı");
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
assert.match(aiServer, /process\.env\.JIRA_API_TOKEN[\s\S]*Basic \$\{Buffer\.from/, "JIRA API token yalnızca backend kimlik doğrulamasında kullanılmalı");
assert.match(aiServer, /\/rest\/api\/3\/search\/jql[\s\S]*mapJiraIssue/, "Backend JQL ile JIRA maddelerini senkronize etmeli");
assert.match(aiServer, /singleJiraIssueMatch[\s\S]*\/rest\/api\/3\/issue\/\$\{encodeURIComponent\(issueKey\)\}\?fields=[\s\S]*mapJiraIssue/, "Backend tek bir JIRA Key ile tüm issue alanlarını almalı");
assert.match(jiraCloudClient, /function getIssue\(issueKey\)[\s\S]*request\(`\/issues\/\$\{encodeURIComponent\(key\)\}`/, "JIRA istemcisi Key ile tekil madde sorgulamalı");
assert.match(app, /function fetchJiraIssueByKey[\s\S]*JiraCloudClient\.getIssue\(key\)[\s\S]*JiraStore\.mergeAll/, "JIRA ekleme formu yalnızca Key ile JIRA Cloud'dan veri çekip birleştirmeli");
assert.match(html, /id="jiraForm"[\s\S]*id="jiraNameInput"[^>]*pattern="\[A-Za-z\]\[A-Za-z0-9_\]\*-\[0-9\]\+"[\s\S]*id="jiraSubmitButton"/, "JIRA formu yalnızca Key sorgusu içermeli");
assert.doesNotMatch(html, /id="jira(?:Description|Url|IssueType|Assignee|Reporter|Priority|Status|Resolution|Created|Updated|DueDate)Input"/, "JIRA formunda elle doldurulan detay alanları bulunmamalı");
assert.match(aiServer, /\/rest\/api\/3\/issue\/\$\{encodeURIComponent\(issueKey\)\}\/worklog/, "Backend JIRA worklog API'sine bağlanmalı");
assert.match(aiServer, /worklogAuthor = currentUser\(\)[\s\S]*startedAfter[\s\S]*mapped\.authorAccountId === account\.accountId/, "Backend seçili tarih aralığında yalnızca oturum kullanıcısının JIRA workloglarını almalı");
assert.match(jiraCloudClient, /function syncWorklogs\(from, to\)[\s\S]*request\(`\/worklogs\?\$\{params\}`/, "JIRA istemcisi tarih aralığıyla worklog senkronizasyonunu desteklemeli");
assert.match(app, /function syncTimesheetJiraWorklogs[\s\S]*mergeJiraWorklogs[\s\S]*JIRA’dan alınan eforlar Drive’a gönderildi/, "Timesheet JIRA eforlarını mükerrer oluşturmadan yerel veriye ve Drive yedeğine aktarmalı");
assert.match(dataStore, /function mergeJiraWorklogs[\s\S]*byWorklogId[\s\S]*conflicts/, "JIRA worklog kimliğiyle mükerrer ve yerel değişiklik çakışmaları yönetilmeli");
assert.match(app, /function syncJiraCloudIssues[\s\S]*JiraStore\.mergeAll/, "Canlı JIRA senkronizasyonu mevcut Key kayıtlarını birleştirmeli");
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
assert.match(app, /task-type-group-toggle[\s\S]*task-type-report\.html\?type=[\s\S]*encodeURIComponent\(group\.taskType\)/, "Görev tipi başlığı ayrı rapor sayfasına yönlenmeli");
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
assert.match(html, /taskAssigneeInput[^>]*list="taskAssigneeOptions"/, "Atanan kişi öneri listesiyle bağlanmalı");
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
assert.ok(html.indexOf('src="jira-store.js') < html.indexOf('src="app.js'), "JIRA modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="reminders-store.js') < html.indexOf('src="app.js'), "Hatırlatma modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="ai-assistant.js') < html.indexOf('src="app.js'), "AI istemci modülü uygulamadan önce yüklenmeli");
assert.match(html, /id="backupToDrive"/, "Drive yedekleme düğmesi eksik");
assert.match(html, /id="restoreFromDrive"/, "Drive geri yükleme düğmesi eksik");
assert.match(drive, /drive\.appdata/, "En az yetkili Drive kapsamı kullanılmalı");
assert.match(drive, /parents:\s*\["appDataFolder"\]/, "Yedek appDataFolder içine yazılmalı");
assert.doesNotMatch(drive, /client_secret/i, "Client Secret tarayıcı kodunda bulunmamalı");
assert.match(html, /class="drive-toolbar"/, "Drive araç çubuğu eksik");
assert.match(app, /backupAndReport\(editing/, "Kayıt sonrası anlık Drive yedekleme eksik");
assert.match(app, /initialRestoreButton.*restoreFromDrive/s, "Açılış geri yükleme çağrısı eksik");
assert.match(drive, /LAST_BACKUP_KEY/, "Son Drive sürümü zamanı saklanmalı");
assert.match(drive, /tasks:\s*Array\.isArray/, "Drive yedeği görevleri de içermeli");
assert.match(drive, /jiraItems:\s*Array\.isArray/, "Drive yedeği JIRA maddelerini de içermeli");
assert.match(drive, /reminders:\s*Array\.isArray/, "Drive yedeği hatırlatmaları da içermeli");
assert.match(app, /reminders:\s*window\.ReminderStore\.list\(\)/, "Hatırlatmalar Drive yedek paketine eklenmeli");
assert.match(tasks, /planned.*in_progress.*completed/, "Görev durumları eksik");
assert.match(tasks, /PRIORITIES[\s\S]*high[\s\S]*medium[\s\S]*low/, "Görev öncelik değerleri eksik");
assert.match(tasks, /QUARTERS[\s\S]*Q1[\s\S]*Q4/, "Görev çeyrek değerleri eksik");
assert.match(tasks, /TASK_TYPES[\s\S]*standard[\s\S]*meeting_organization[\s\S]*management_request/, "Görev tipi veri modeli eksik");
assert.match(taskDetailApp, /taskTypeLabel[\s\S]*detailPageAssignee/, "Görev tipi ve atanan kişi ayrı detay sayfasına bağlanmalı");
assert.match(app, /taskAssigneeOptions[\s\S]*new Set\(tasks\.map/, "Önceki atanan kişiler seçim önerilerine eklenmeli");
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
assert.match(taskTypeReportApp, /task-detail\.html\?id=[\s\S]*fromType/, "Görev tipi raporundaki maddeler tekil görev detayına bağlanmalı");
assert.match(app, /function tasksForType[\s\S]*includedIds/, "Görev tipi filtresinde hiyerarşik bağlam korunmalı");
assert.match(app, /taskTypeFilter[\s\S]*tasksForType[\s\S]*renderTasks/, "Görev tipi filtresi rapora bağlanmalı");
assert.match(app, /taskType:\s*"architecture_roadmap"/, "Yapıştırılan görev planı Architecture Roadmap olarak işaretlenmeli");
assert.match(html, /drive-settings-popover[\s\S]*restoreFromDrive[\s\S]*backupToDrive/, "Drive işlemleri Ayarlar içinde olmalı");
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
assert.match(app, /jiraSyncCounts[\s\S]*timesheet-jira-sync-summary[\s\S]*"synced", "✓", "JIRA’ya gönderildi"[\s\S]*"imported", "↓", "JIRA’dan alındı"[\s\S]*"local", "○", "JIRA’ya gönderilmedi"[\s\S]*"pending", "↑"[\s\S]*"failed", "!"/, "Timesheet hücreleri JIRA gönderim, içe aktarma ve yerel kayıt durumlarını göstermeli");
assert.match(css, /timesheet-jira-status\[data-status="synced"\][^{]*\{[^}]*background:\s*#1f9d74/, "Timesheet başarılı JIRA gönderimi yeşil simgeyle gösterilmeli");
assert.match(css, /timesheet-jira-status\[data-status="imported"\][^{]*\{[^}]*background:\s*#1f9d74/, "Timesheet JIRA’dan alınan eforu yeşil simgeyle göstermeli");
assert.match(css, /timesheet-jira-status\[data-status="local"\][^{]*\{[^}]*background:\s*#d29b19/, "Timesheet JIRA’ya gönderilmeyen yerel eforu sarı simgeyle göstermeli");
assert.match(app, /timesheet-empty-effort-button[\s\S]*openEffortCreateModal\(row\.jiraId, iso\)/, "Boş Timesheet hücresinden JIRA ve tarih bazlı efor ekleme eksik");
assert.match(app, /function openEffortCreateModal[\s\S]*modalDateInput[\s\S]*showModal/, "Yeni Timesheet efor popup akışı eksik");
assert.match(app, /modalEffortMode\s*===\s*"create"[\s\S]*saveEntry\(payload\)/, "Timesheet popup yeni efor kaydı oluşturmalı");
assert.match(css, /timesheet-empty-effort-button/, "Boş Timesheet hücresi ekleme düğmesi stili eksik");
assert.match(app, /effortEditModalForm\.addEventListener\("submit"[\s\S]*getStore\(\)\.update/, "Popup üzerinden efor revizyonu eksik");
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
assert.match(css, /jira-issue-table[^{]*\{[^}]*width:\s*max-content[\s\S]*jira-column-resizer[^{]*\{[^}]*cursor:\s*col-resize/, "JIRA tablosu sıkı içerik genişliği ve kolon boyutlandırma tutamacı kullanmalı");
assert.match(app, /DOMParser[\s\S]*#issuetable/, "JIRA HTML içe aktarma ayrıştırıcısı eksik");
assert.match(jira, /mergeAll/, "JIRA HTML kayıtlarını birleştirme desteği eksik");
assert.match(jira, /normalizeKey[\s\S]*duplicateCount[\s\S]*idRemap/, "JIRA HTML içe aktarımında Key tekilleştirme ve bağlantı eşleme desteği eksik");
assert.match(app, /function relinkMergedJiraEntries[\s\S]*idRemap\[entry\.jiraId\]/, "Mükerrer JIRA'ya bağlı eforlar korunan JIRA kaydına taşınmalı");
assert.match(app, /pagehide/, "Kapanış yedekleme olayı eksik");
assert.match(app, /visibilitychange/, "Arka plana geçiş yedekleme olayı eksik");
assert.match(drive, /keepalive:\s*Boolean\(options\.keepalive\)/, "Kapanış isteği keepalive kullanmalı");

console.log("✓ frontend DOM/veri katmanı sözleşmesi");
console.log("✓ responsive kırılımlar ve güvenli metin render kontrolü");
