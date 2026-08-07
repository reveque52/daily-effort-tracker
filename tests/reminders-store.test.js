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
    crypto: { randomUUID: () => `reminder-${++idCounter}` }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "reminders-store.js"), "utf8"), {
    window, Date, Math, JSON, Object, Array, String, Boolean, Number
  });
  return window.ReminderStore;
}

const store = loadStore();
assert.equal(store.validate({}).valid, false);
assert.equal(store.validate({ text: "Toplantı", remindAt: "hatalı", importance: "normal" }).valid, false);

const normal = store.create({ text: "Dokümanı kontrol et", remindAt: "2026-08-10T09:30", importance: "normal" });
const important = store.create({ text: "Yönetim sunumunu gönder", remindAt: "2026-08-11T14:00", importance: "important" });
assert.equal(normal.valid, true);
assert.equal(important.valid, true);
assert.equal(store.list()[0].id, important.value.id, "Önemli notlar önce gösterilmeli");

const completed = store.update(important.value.id, { ...important.value, completed: true });
assert.equal(completed.valid, true);
assert.equal(store.list().at(-1).completed, true, "Tamamlanan hatırlatmalar sona taşınmalı");
assert.equal(store.remove(normal.value.id), true);

const restored = store.replaceAll([{ id: "restored", text: "Yedekten gelen not", remindAt: "", importance: "important", completed: false }]);
assert.equal(restored.valid, true);
assert.equal(store.get("restored").text, "Yedekten gelen not");

console.log("✓ önemli not ve hatırlatma doğrulama, sıralama, CRUD ve yedek geri yükleme");
