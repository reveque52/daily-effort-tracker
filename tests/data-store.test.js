"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadStore(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) {
    values.set("daily-effort-tracker.entries.v1", initialValue);
  }
  const window = {
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
    },
    crypto: { randomUUID: () => "test-id" },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "data-store.js"), "utf8"),
    { window, Date, Math, JSON, Number, Object, Array },
  );
  if (initialValue !== undefined) {
    try {
      const rows = JSON.parse(initialValue);
      if (Array.isArray(rows)) window.EffortStore.replaceAll(rows);
    } catch { /* Geçersiz eski tarayıcı verisi artık dikkate alınmaz. */ }
  }
  return { store: window.EffortStore, values };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("zorunlu alanları ve saat sınırlarını doğrular", () => {
  const { store } = loadStore();
  assert.equal(store.validate({}).valid, false);
  assert.equal(store.validate({ date: "2026-02-30", project: "P", task: "T", hours: 1 }).valid, false);
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "T", hours: 0 }).valid, false);
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "T", hours: 24.01 }).valid, false);
  assert.equal(store.validate({ date: "2026-08-05", project: " P ", task: " T ", hours: "1.255" }).value.hours, 1.25);
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "T", hours: 1 }).errors.jiraId.length > 0, true);
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "T", jiraId: " jira-1 ", hours: 1 }).value.jiraId, "jira-1");
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "A".repeat(1000), jiraId: "jira-1", hours: 1 }).valid, true);
  assert.equal(store.validate({ date: "2026-08-05", project: "P", task: "A".repeat(1001), jiraId: "jira-1", hours: 1 }).valid, false);
});

test("CRUD akışı veriyi yalnızca çalışma belleğinde tutar", () => {
  const { store, values } = loadStore();
  const created = store.create({ date: "2026-08-05", project: "PROJ-1", task: "Test", jiraId: "jira-1", hours: 2, notes: " Not " });
  assert.equal(created.valid, true);
  assert.equal(store.get("test-id").notes, "Not");
  assert.equal(values.has(store.STORAGE_KEY), false);

  const updated = store.update("test-id", { date: "2026-08-05", project: "PROJ-2", task: "Test 2", jiraId: "jira-2", hours: 3.5 });
  assert.equal(updated.valid, true);
  assert.equal(store.get("test-id").project, "PROJ-2");
  assert.equal(store.remove("test-id"), true);
  assert.equal(store.remove("test-id"), false);
  assert.equal(store.list().length, 0);
});

test("filtreleme, sıralama ve özet hesapları doğrudur", () => {
  const rows = [
    { id: "1", date: "2026-08-04", project: "Alpha", task: "A", hours: 1.25, notes: "", createdAt: "2026-08-04T10:00:00Z", updatedAt: "2026-08-04T10:00:00Z" },
    { id: "2", date: "2026-08-05", project: "Alpha", task: "B", hours: 2.5, notes: "", createdAt: "2026-08-05T10:00:00Z", updatedAt: "2026-08-05T10:00:00Z" },
    { id: "3", date: "2026-08-05", project: "Beta", task: "C", hours: 0.25, notes: "", createdAt: "2026-08-05T11:00:00Z", updatedAt: "2026-08-05T11:00:00Z" },
  ];
  const { store } = loadStore(JSON.stringify(rows));
  assert.deepEqual(Array.from(store.list({ project: "alpha" }), x => x.id), ["2", "1"]);
  assert.deepEqual(Array.from(store.list({ from: "2026-08-05", to: "2026-08-05" }), x => x.id), ["3", "2"]);
  const summary = store.summarize(store.list());
  assert.equal(summary.recordCount, 3);
  assert.equal(summary.totalHours, 4);
  assert.equal(summary.averageHours, 1.33);
  assert.equal(summary.byProject.Alpha, 3.75);
});

test("eski veya bozuk localStorage içeriğini kullanmaz", () => {
  assert.equal(loadStore("not-json").store.list().length, 0);
  assert.equal(loadStore("{}").store.list().length, 0);
});

test("Drive yedeğini doğrulayıp yerel kayıtların yerine yükler", () => {
  const { store } = loadStore();
  const imported = [{ id: "drive-1", date: "2026-08-05", project: "Drive", task: "Yedek", hours: 2 }];
  assert.equal(store.replaceAll(imported).valid, true);
  assert.equal(store.list()[0].id, "drive-1");
  assert.equal(store.replaceAll([{ date: "bozuk" }]).valid, false);
  assert.equal(store.list().length, 1);
});

test("aynı tarihte birden fazla efor kaydını ayrı tutup toplamını hesaplar", () => {
  const rows = [
    { id: "same-1", date: "2026-08-06", project: "Alpha", task: "Analiz", hours: 2, notes: "", createdAt: "2026-08-06T08:00:00Z", updatedAt: "2026-08-06T08:00:00Z" },
    { id: "same-2", date: "2026-08-06", project: "Beta", task: "Test", hours: 3.5, notes: "", createdAt: "2026-08-06T10:00:00Z", updatedAt: "2026-08-06T10:00:00Z" }
  ];
  const { store } = loadStore(JSON.stringify(rows));
  assert.equal(store.list({ date: "2026-08-06" }).length, 2);
  assert.equal(store.summarize().byDate["2026-08-06"], 5.5);
});

test("JIRA worklog senkronizasyon bilgisini kayıt ve yedek akışında korur", () => {
  const { store } = loadStore();
  const created = store.create({
    date: "2026-08-07", project: "DIP-43", task: "Hazırlık", jiraId: "jira-43", hours: 2,
    jiraWorklogId: "501", jiraWorklogIssueKey: "DIP-43", jiraSyncStatus: "synced", jiraSyncDirection: "pushed", jiraSyncedAt: "2026-08-07T10:00:00Z"
  });
  assert.equal(created.valid, true);
  assert.equal(store.get("test-id").jiraWorklogId, "501");
  assert.equal(store.get("test-id").jiraSyncStatus, "synced");
  assert.equal(store.get("test-id").jiraSyncDirection, "pushed");
  assert.equal(store.replaceAll(store.list()).value[0].jiraWorklogIssueKey, "DIP-43");
  assert.equal(store.validate({ date: "2026-08-07", project: "DIP-43", task: "Hazırlık", jiraId: "jira-43", hours: 2, jiraSyncStatus: "unknown" }).valid, false);
});

test("JIRA'dan alınan worklogları kimliğine göre mükerrer oluşturmadan birleştirir", () => {
  const { store } = loadStore();
  const first = store.mergeJiraWorklogs([{
    date: "2026-08-06", project: "DIP-43", task: "Analiz", jiraId: "jira-43", hours: 2, notes: "",
    jiraWorklogId: "601", jiraWorklogIssueKey: "DIP-43", jiraSyncStatus: "synced", jiraSyncDirection: "imported", jiraSyncedAt: "2026-08-06T10:00:00Z"
  }]);
  assert.equal(first.valid, true);
  assert.equal(first.value.created, 1);
  assert.equal(store.list().length, 1);

  const repeated = store.mergeJiraWorklogs([{
    date: "2026-08-06", project: "DIP-43", task: "Analiz güncellendi", jiraId: "jira-43", hours: 3, notes: "",
    jiraWorklogId: "601", jiraWorklogIssueKey: "DIP-43", jiraSyncStatus: "synced", jiraSyncDirection: "imported", jiraSyncedAt: "2026-08-06T11:00:00Z"
  }]);
  assert.equal(repeated.value.created, 0);
  assert.equal(repeated.value.updated, 1);
  assert.equal(store.list().length, 1);
  assert.equal(store.list()[0].hours, 3);
  assert.equal(store.list()[0].task, "Analiz güncellendi");

  store.update("test-id", { ...store.get("test-id"), task: "Yerel revizyon", jiraSyncStatus: "pending" });
  const conflict = store.mergeJiraWorklogs([{
    date: "2026-08-06", project: "DIP-43", task: "JIRA revizyonu", jiraId: "jira-43", hours: 4, notes: "",
    jiraWorklogId: "601", jiraWorklogIssueKey: "DIP-43", jiraSyncStatus: "synced", jiraSyncDirection: "imported", jiraSyncedAt: "2026-08-06T12:00:00Z"
  }]);
  assert.equal(conflict.value.conflicts, 1);
  assert.equal(store.get("test-id").task, "Yerel revizyon");
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error.stack);
  }
}
if (failures) process.exitCode = 1;
