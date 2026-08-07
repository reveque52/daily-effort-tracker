"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const drive = fs.readFileSync(path.join(root, "drive-sync.js"), "utf8");
const tasks = fs.readFileSync(path.join(root, "tasks-store.js"), "utf8");
const jira = fs.readFileSync(path.join(root, "jira-store.js"), "utf8");
const reminders = fs.readFileSync(path.join(root, "reminders-store.js"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "ai-assistant.js"), "utf8");
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
  "reminderPanelTitle", "reminderOpenCount", "reminderForm", "reminderId", "reminderTextInput",
  "reminderDateInput", "reminderImportanceInput", "reminderSubmitLabel", "cancelReminderEdit", "reminderFormMessage", "reminderEmptyState", "reminderList",
  "openAiAssistant", "aiAssistantPanel", "aiAssistantTitle", "aiAssistantStatus", "closeAiAssistant",
  "aiAssistantMessages", "aiAssistantForm", "aiAssistantInput", "aiAssistantInputCount", "sendAiAssistantMessage",
  "aiAssistantEndpoint", "saveAiAssistantEndpoint",
  "effortForm", "entryId", "dateInput", "hoursInput",
  "descriptionInput", "filterDateInput", "entryList", "entryTemplate",
  "dailyTotal", "grandTotal", "entryCount", "formMessage", "lastBackupTime",
  "restorePrompt", "initialRestoreButton", "skipInitialRestore",
  "tasksView", "taskForm", "taskTitleInput", "taskDueDateInput", "taskStatusInput", "taskDescriptionInput",
  "taskParentTaskInput", "taskAssigneeInput", "taskAssigneeOptions", "taskTypeInput", "taskPriorityInput", "taskYearInput", "taskQuarterInput", "taskPlanImport",
  "openTaskPlanPaste", "taskPlanImportModal", "taskPlanPasteForm", "taskPlanTextInput", "taskPlanPasteMessage",
  "taskList", "taskTemplate", "taskTypeGroupTemplate", "taskCreateView", "taskReportView", "taskDetailView", "taskDetailTitle",
  "taskDetailDescription", "taskDetailParentItem", "taskDetailAssignee", "taskDetailType", "taskDetailPriority", "taskDetailPlan", "taskDetailSubtaskList", "taskDetailSubtaskCount", "addSubtaskButton", "taskTypeFilter", "taskFilterEmpty", "reviseTaskButton", "backToTaskReport", "taskReportCount", "taskReportTableWrap", "addNextTaskToCalendar",
  "timesheetView", "timesheetPeriod", "timesheetReferenceDate", "timesheetStartDate",
  "timesheetEndDate", "includeWeekends", "timesheetTable", "timesheetTotalHours",
  "timesheetGrouping",
  "jiraItemPicker", "jiraItemPickerButton", "jiraItemPickerValue", "jiraItemPickerDropdown", "jiraItemSearchInput", "jiraItemSearchCount", "jiraItemOptionList", "jiraItemInput", "jiraView", "jiraForm", "jiraNameInput", "jiraDescriptionInput",
  "jiraUrlInput", "jiraList", "jiraTemplate", "jiraIssueTypeInput", "jiraAssigneeInput",
  "jiraReporterInput", "jiraPriorityInput", "jiraStatusInput", "jiraResolutionInput",
  "jiraCreatedInput", "jiraUpdatedInput", "jiraDueDateInput", "jiraHtmlImport",
  "jiraSearchInput", "jiraTableBody", "effortEditModal", "effortEditModalForm", "modalEntrySelect",
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
assert.match(app, /reminderForm\.addEventListener\("submit"[\s\S]*ReminderStore\.(?:update|create)/, "Not ve hatırlatma formu CRUD akışına bağlanmalı");
assert.match(reminders, /function validate[\s\S]*function replaceAll/, "Hatırlatma veri modeli doğrulama ve yedek geri yükleme sağlamalı");
assert.match(app, /weeklyEntries[\s\S]*homeWeeklyHours[\s\S]*homeWeeklyEntryCount/, "Haftalık efor özeti eksik");
assert.match(app, /plannedTasks[\s\S]*inProgressTasks[\s\S]*completedTasks/, "Görev durum özeti eksik");
assert.match(app, /weekly-bar-column[\s\S]*task-donut[\s\S]*jira-effort-row/, "Dashboard grafikleri eksik");
assert.match(app, /renderTimesheet\(\);\s*renderHomeDashboard\(\);/, "Efor render sonrası Ana Sayfa güncellenmeli");
assert.match(app, /function renderTasks[\s\S]*renderHomeDashboard\(\);\s*\}/, "Görev render sonrası Ana Sayfa güncellenmeli");
assert.match(css, /home-dashboard-grid[^{]*\{[^}]*grid-template-columns/, "Ana Sayfa responsive grid yapısı eksik");
assert.doesNotMatch(html, /id="projectInput"/, "Efor formunda bağımsız proje alanı olmamalı");
assert.match(html, /id="jiraItemInput"[^>]*required/, "Efor formunda JIRA seçimi zorunlu olmalı");
assert.match(html, /id="jiraItemPickerButton"[^>]*aria-haspopup="listbox"[^>]*aria-controls="jiraItemPickerDropdown"/, "Efor JIRA seçimi erişilebilir bir açılır liste olmalı");
assert.match(html, /id="jiraItemPickerDropdown" class="jira-picker-dropdown hidden"[\s\S]*id="jiraItemSearchInput"[^>]*type="search"[^>]*aria-controls="jiraItemOptionList"/, "Efor JIRA araması açılır listenin içinde yer almalı");
assert.match(app, /function normalizeJiraSearch[\s\S]*toLocaleLowerCase\("tr-TR"\)[\s\S]*replaceAll\("ı", "i"\)/, "Efor JIRA araması büyük-küçük harf ve Türkçe I karakterlerinden etkilenmemeli");
assert.match(app, /function jiraMatchesSearch[\s\S]*item\.name[\s\S]*item\.description[\s\S]*item\.assignee[\s\S]*item\.status/, "Efor JIRA araması Key, Summary, kişi ve durum alanlarını filtrelemeli");
assert.match(app, /jiraItemSearchInput"\)\.addEventListener\("input"[\s\S]*filterEffortJiraOptions/, "Efor JIRA seçenekleri kullanıcı yazarken anlık filtrelenmeli");
assert.match(app, /function renderEffortJiraOptionList[\s\S]*jira-picker-option[\s\S]*aria-selected/, "Filtrelenen JIRA maddeleri açılır listede seçilebilir gösterilmeli");
assert.match(app, /function setEffortJiraPickerOpen[\s\S]*jiraItemPickerDropdown[\s\S]*aria-expanded/, "JIRA açılır listesinin açık-kapalı durumu yönetilmeli");
assert.match(app, /project:\s*selectedJira\.name/, "Eforun proje karşılığı seçilen JIRA anahtarından türetilmeli");
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
assert.match(app, /dayEntries\.length.*formatHours\(dayTotal\)/s, "Günlük kayıt sayısı ve toplamı eksik");
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
assert.match(html, /Issue Type[\s\S]*Key[\s\S]*Summary[\s\S]*Assignee[\s\S]*Reporter[\s\S]*Priority[\s\S]*Status[\s\S]*Resolution[\s\S]*Created[\s\S]*Updated[\s\S]*Due date/, "JIRA dışa aktarım tablo sütunları eksik");
assert.match(app, /DOMParser[\s\S]*#issuetable/, "JIRA HTML içe aktarma ayrıştırıcısı eksik");
assert.match(jira, /mergeAll/, "JIRA HTML kayıtlarını birleştirme desteği eksik");
assert.match(jira, /normalizeKey[\s\S]*duplicateCount[\s\S]*idRemap/, "JIRA HTML içe aktarımında Key tekilleştirme ve bağlantı eşleme desteği eksik");
assert.match(app, /function relinkMergedJiraEntries[\s\S]*idRemap\[entry\.jiraId\]/, "Mükerrer JIRA'ya bağlı eforlar korunan JIRA kaydına taşınmalı");
assert.match(app, /pagehide/, "Kapanış yedekleme olayı eksik");
assert.match(app, /visibilitychange/, "Arka plana geçiş yedekleme olayı eksik");
assert.match(drive, /keepalive:\s*Boolean\(options\.keepalive\)/, "Kapanış isteği keepalive kullanmalı");

console.log("✓ frontend DOM/veri katmanı sözleşmesi");
console.log("✓ responsive kırılımlar ve güvenli metin render kontrolü");
