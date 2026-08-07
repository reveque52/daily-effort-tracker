"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadStore() {
  const values = new Map();
  let idCounter = 0;
  const window = {
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    },
    crypto: { randomUUID: () => `jira-test-id-${++idCounter}` }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "jira-store.js"), "utf8"), {
    window, localStorage: window.localStorage, URL, Date, Math, JSON, Object, Array, String
  });
  return window.JiraStore;
}

const store = loadStore();
assert.equal(store.validate({}).valid, false);
assert.equal(store.validate({ name: "PROJ-1", description: "İş", url: "not-a-url" }).valid, false);

const created = store.create({ name: "PROJ-1", description: "İlk madde", url: "https://jira.example.com/browse/PROJ-1", issueType: "Task", assignee: "Selçuk", status: "Open" });
assert.equal(created.valid, true);
assert.equal(store.get("jira-test-id-1").name, "PROJ-1");
assert.equal(store.get("jira-test-id-1").assignee, "Selçuk");
assert.equal(store.create({ name: "proj-1", description: "Mükerrer", url: "https://jira.example.com/browse/PROJ-1" }).valid, false, "Manuel kayıtta aynı JIRA Key tekrar oluşturulmamalı");

const updated = store.update("jira-test-id-1", { name: "PROJ-1", description: "Güncel", url: "https://jira.example.com/browse/PROJ-1" });
assert.equal(updated.value.description, "Güncel");
const second = store.create({ name: "PROJ-2", description: "İkinci", url: "https://jira.example.com/browse/PROJ-2" });
assert.equal(second.valid, true);
assert.equal(store.update("jira-test-id-1", { name: "PROJ-2", description: "Çakışan", url: "https://jira.example.com/browse/PROJ-2" }).valid, false, "Revizyonda başka kaydın JIRA Key değeri kullanılamamalı");

assert.equal(store.replaceAll([{ id: "restored", name: "PROJ-2", description: "Yedek", url: "https://jira.example.com/browse/PROJ-2" }]).valid, true);
assert.equal(store.list()[0].id, "restored");
const merged = store.mergeAll([
  { name: "PROJ-2", description: "HTML dışa aktarımı", url: "https://jira.example.com/browse/PROJ-2", reporter: "Fatih", dueDate: "29/Apr/27" },
  { name: "PROJ-3", description: "Yeni kayıt", url: "https://jira.example.com/browse/PROJ-3" },
  { name: "proj-3", description: "HTML içindeki son sürüm", url: "https://jira.example.com/browse/PROJ-3", status: "In Progress" }
]);
assert.equal(merged.valid, true);
assert.equal(merged.value.imported, 3);
assert.equal(merged.value.created, 1);
assert.equal(merged.value.updated, 1);
assert.equal(merged.value.duplicateCount, 1);
assert.equal(store.list().length, 2, "İlgisiz mevcut JIRA kayıtları korunmalı");
assert.equal(store.list().find((item) => item.name === "PROJ-2").reporter, "Fatih");
assert.equal(store.list().find((item) => item.name.toUpperCase() === "PROJ-3").description, "HTML içindeki son sürüm");
assert.equal(store.remove("restored"), true);

store.replaceAll([
  { id: "canonical", name: "DUP-1", description: "İlk", url: "https://jira.example.com/browse/DUP-1" },
  { id: "duplicate", name: "dup-1", description: "Son", url: "https://jira.example.com/browse/DUP-1" }
]);
const deduplicated = store.mergeAll([]);
assert.equal(deduplicated.value.total, 1);
assert.equal(deduplicated.value.duplicateCount, 1);
assert.equal(deduplicated.value.idRemap.duplicate, "canonical");
assert.equal(store.list()[0].description, "Son");

console.log("✓ JIRA doğrulama, Key tekilliği, koruyucu HTML birleştirme, CRUD ve yedek geri yükleme");
