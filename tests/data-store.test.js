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
});

test("CRUD akışı veriyi localStorage içinde kalıcı tutar", () => {
  const { store, values } = loadStore();
  const created = store.create({ date: "2026-08-05", project: "Alpha", task: "Test", hours: 2, notes: " Not " });
  assert.equal(created.valid, true);
  assert.equal(store.get("test-id").notes, "Not");
  assert.equal(JSON.parse(values.get(store.STORAGE_KEY)).length, 1);

  const updated = store.update("test-id", { date: "2026-08-05", project: "Beta", task: "Test 2", hours: 3.5 });
  assert.equal(updated.valid, true);
  assert.equal(store.get("test-id").project, "Beta");
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

test("bozuk localStorage içeriğini güvenle boş liste kabul eder", () => {
  assert.equal(loadStore("not-json").store.list().length, 0);
  assert.equal(loadStore("{}").store.list().length, 0);
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

