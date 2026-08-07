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
    crypto: { randomUUID: () => `task-${++idCounter}` }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "tasks-store.js"), "utf8"), {
    window, localStorage: window.localStorage, Date, Math, JSON, Object, Array, String
  });
  return window.TaskStore;
}

const store = loadStore();
assert.equal(store.validate({}).valid, false);
assert.equal(store.validate({ title: "İş", dueDate: "2026-02-30", status: "planned" }).valid, false);
assert.equal(store.validate({ title: "Tarihsiz iş", dueDate: "", status: "planned", priority: "high", year: "2027", quarter: "Q2" }).valid, true);
assert.equal(store.validate({ title: "Hatalı plan", status: "planned", priority: "urgent", year: "1999", quarter: "Q5" }).valid, false);
assert.equal(store.validate({ title: "Hatalı tip", status: "planned", taskType: "unknown" }).valid, false);
assert.equal(store.validate({ title: "Roadmap işi", status: "planned", taskType: "architecture_roadmap" }).valid, true);

const created = store.create({ title: "Raporu hazırla", parentItem: "Raporlama", assignee: "Selçuk Dere", taskType: "management_request", priority: "high", year: "2026", quarter: "Q3", dueDate: "2026-08-10", status: "planned", descriptionHtml: "<p><strong>Detaylı</strong> açıklama</p>" });
assert.equal(created.valid, true);
assert.equal(store.list().length, 1);
assert.match(store.get(created.value.id).descriptionHtml, /<strong>Detaylı<\/strong>/);
assert.equal(store.get(created.value.id).parentItem, "Raporlama");
assert.equal(store.get(created.value.id).priority, "high");
assert.equal(store.get(created.value.id).assignee, "Selçuk Dere");
assert.equal(store.get(created.value.id).taskType, "management_request");

const updated = store.update(created.value.id, { title: "Raporu hazırla", parentItem: "Raporlama", assignee: "Ayşe", taskType: "meeting_organization", priority: "medium", year: "2026", quarter: "Q3", dueDate: "2026-08-10", status: "completed", descriptionHtml: "<ul><li>Bitti</li></ul>" });
assert.equal(updated.valid, true);
assert.equal(store.get(created.value.id).status, "completed");

const restored = store.replaceAll([{ id: "restored", title: "Toplantı", dueDate: "2026-08-09", status: "in_progress", descriptionHtml: "<p>Gündem</p>" }]);
assert.equal(restored.valid, true);
assert.equal(store.list()[0].id, "restored");
assert.equal(store.remove("restored"), true);
assert.equal(store.list().length, 0);

const merged = store.mergeAll([
  { title: "Alt iş", parentItem: "Ana iş", priority: "high", year: "2026", quarter: "Q2", dueDate: "2026-06-30", status: "planned", descriptionHtml: "<p>İlk</p>" },
  { title: "Başka iş", parentItem: "", priority: "low", year: "2027", quarter: "Q1", dueDate: "2027-03-31", status: "planned", descriptionHtml: "" }
]);
assert.equal(merged.valid, true);
assert.equal(merged.value.created, 2);
const mergedAgain = store.mergeAll([{ title: "Alt iş", parentItem: "Ana iş", priority: "medium", year: "2026", quarter: "Q2", dueDate: "2026-06-30", status: "planned", descriptionHtml: "<p>Güncel</p>" }]);
assert.equal(mergedAgain.value.updated, 1);
assert.equal(store.list().find((task) => task.title === "Alt iş").priority, "medium");
const hierarchy = store.ensureHierarchy();
assert.equal(hierarchy.created, 1);
assert.equal(hierarchy.linked, 1);
const parentTask = store.list().find((task) => task.title === "Ana iş");
const childTask = store.list().find((task) => task.title === "Alt iş");
assert.equal(childTask.parentTaskId, parentTask.id);
assert.equal(store.remove(parentTask.id), false, "Alt görevi olan ana görev silinmemeli");

const migration = store.migrateExistingTasksToArchitectureRoadmap();
assert.equal(migration.updated, store.list().length);
assert.ok(store.list().every((task) => task.taskType === "architecture_roadmap"));
assert.equal(store.migrateExistingTasksToArchitectureRoadmap().updated, 0, "Dönüşüm yalnızca bir kez çalışmalı");

console.log("✓ görev doğrulama, ana görev-alt görev ilişkisi, CRUD, toplu içe aktarma ve yedek geri yükleme");
