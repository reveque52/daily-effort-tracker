"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadStore() {
  const values = new Map();
  const window = {
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    },
    crypto: { randomUUID: () => `task-${values.size + 1}` }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "tasks-store.js"), "utf8"), {
    window, localStorage: window.localStorage, Date, Math, JSON, Object, Array, String
  });
  return window.TaskStore;
}

const store = loadStore();
assert.equal(store.validate({}).valid, false);
assert.equal(store.validate({ title: "İş", dueDate: "2026-02-30", status: "planned" }).valid, false);

const created = store.create({ title: "Raporu hazırla", dueDate: "2026-08-10", status: "planned" });
assert.equal(created.valid, true);
assert.equal(store.list().length, 1);

const updated = store.update(created.value.id, { title: "Raporu hazırla", dueDate: "2026-08-10", status: "completed" });
assert.equal(updated.valid, true);
assert.equal(store.get(created.value.id).status, "completed");

const restored = store.replaceAll([{ id: "restored", title: "Toplantı", dueDate: "2026-08-09", status: "in_progress" }]);
assert.equal(restored.valid, true);
assert.equal(store.list()[0].id, "restored");
assert.equal(store.remove("restored"), true);
assert.equal(store.list().length, 0);

console.log("✓ görev doğrulama, CRUD, durum ve yedek geri yükleme");
