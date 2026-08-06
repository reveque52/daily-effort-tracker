"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const drive = fs.readFileSync(path.join(root, "drive-sync.js"), "utf8");
const tasks = fs.readFileSync(path.join(root, "tasks-store.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const requiredIds = [
  "effortForm", "entryId", "dateInput", "hoursInput", "projectInput",
  "descriptionInput", "filterDateInput", "entryList", "entryTemplate",
  "dailyTotal", "grandTotal", "entryCount", "formMessage", "lastBackupTime",
  "restorePrompt", "initialRestoreButton", "skipInitialRestore",
  "tasksView", "taskForm", "taskTitleInput", "taskDueDateInput", "taskStatusInput",
  "taskList", "taskTemplate", "addNextTaskToCalendar",
  "timesheetView", "timesheetPeriod", "timesheetReferenceDate", "timesheetStartDate",
  "timesheetEndDate", "includeWeekends", "timesheetTable", "timesheetTotalHours",
];

for (const id of requiredIds) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Eksik DOM sözleşmesi: #${id}`);
}

assert.ok(html.indexOf('src="data-store.js"') < html.indexOf('src="app.js"'), "Veri katmanı uygulamadan önce yüklenmeli");
assert.match(html, /<meta\s+name="viewport"/i, "Mobil viewport tanımı eksik");
assert.match(css, /@media\s*\(max-width:\s*850px\)/, "Tablet kırılımı eksik");
assert.match(css, /@media\s*\(max-width:\s*600px\)/, "Mobil kırılımı eksik");
assert.doesNotMatch(app, /\.innerHTML\s*=/, "Kullanıcı girdisi innerHTML ile yazılmamalı");
assert.match(app, /textContent\s*=\s*entry\.project/, "Proje adı güvenli metin olarak basılmalı");
assert.match(app, /store\?\.create/, "Create entegrasyonu eksik");
assert.match(app, /store\?\.update/, "Update entegrasyonu eksik");
assert.match(app, /store\?\.remove/, "Delete entegrasyonu eksik");
assert.doesNotMatch(html, /class="icon-button calendar-button"/, "Takvim düğmesi efor satırlarında olmamalı");
assert.match(html, /id="addNextTaskToCalendar"/, "Dashboard Google Takvim düğmesi eksik");
assert.match(app, /calendar\.google\.com\/calendar\/render/, "Google Takvim etkinlik adresi eksik");
assert.match(app, /dates:\s*`\$\{start\}\/\$\{end\}`/, "Takvim tarih aralığı eksik");
assert.ok(html.indexOf('src="drive-sync.js"') < html.indexOf('src="app.js"'), "Drive modülü uygulamadan önce yüklenmeli");
assert.ok(html.indexOf('src="tasks-store.js"') < html.indexOf('src="app.js"'), "Görev modülü uygulamadan önce yüklenmeli");
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
assert.match(tasks, /planned.*in_progress.*completed/, "Görev durumları eksik");
assert.match(html, /drive-settings-popover[\s\S]*restoreFromDrive[\s\S]*backupToDrive/, "Drive işlemleri Ayarlar içinde olmalı");
assert.match(html, /value="week"[\s\S]*value="month"[\s\S]*value="custom"/, "Timesheet dönem seçenekleri eksik");
assert.match(app, /getTimesheetRange/, "Timesheet tarih aralığı hesaplaması eksik");
assert.match(app, /includeWeekends/, "Hafta sonu filtresi eksik");
assert.match(app, /dayTotals/, "Timesheet günlük toplamları eksik");
assert.match(css, /timesheet-scroll[^{]*\{[^}]*overflow-x:\s*auto/, "Timesheet yatay kaydırma eksik");
assert.match(app, /pagehide/, "Kapanış yedekleme olayı eksik");
assert.match(app, /visibilitychange/, "Arka plana geçiş yedekleme olayı eksik");
assert.match(drive, /keepalive:\s*Boolean\(options\.keepalive\)/, "Kapanış isteği keepalive kullanmalı");

console.log("✓ frontend DOM/veri katmanı sözleşmesi");
console.log("✓ responsive kırılımlar ve güvenli metin render kontrolü");
