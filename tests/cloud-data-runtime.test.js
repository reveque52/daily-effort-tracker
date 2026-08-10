"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const localWrites = [];
const window = {
  structuredClone,
  localStorage: { setItem(key) { localWrites.push(key); }, getItem() { return null; } },
  crypto: { randomUUID: () => "cloud-entry-1" }
};
const context = { window, structuredClone, JSON, Map, Set, Date, Math, Number, Object, Array, String };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "cloud-data-runtime.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "data-store.js"), "utf8"), context);

const changes = [];
window.CloudDataRuntime.setChangeHandler((change) => changes.push(change));
const created = window.EffortStore.create({ date: "2026-08-11", project: "RD-23", task: "Bulut kayıt", jiraId: "jira-23", hours: 2 });
assert.equal(created.valid, true);
assert.equal(window.EffortStore.list().length, 1);
assert.equal(localWrites.length, 0, "Uygulama verileri localStorage'a yazılmamalı");
assert.equal(changes.length, 1);
assert.equal(changes[0].collection, "entries");
assert.equal(changes[0].upserts[0].id, "cloud-entry-1");

window.EffortStore.remove("cloud-entry-1");
assert.deepEqual(Array.from(changes[1].deletedIds), ["cloud-entry-1"]);

window.CloudDataRuntime.suspend(() => window.EffortStore.replaceAll([]));
assert.equal(changes.length, 2, "Buluttan yükleme yeni bir bulut yazımı tetiklememeli");
console.log("✓ bulut çalışma katmanı veriyi bellekte tutar ve satır değişikliklerini bildirir");
