"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const requiredIds = [
  "effortForm", "entryId", "dateInput", "hoursInput", "projectInput",
  "descriptionInput", "filterDateInput", "entryList", "entryTemplate",
  "dailyTotal", "grandTotal", "entryCount", "formMessage",
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
assert.match(html, /class="icon-button calendar-button"/, "Google Takvim düğmesi eksik");
assert.match(app, /calendar\.google\.com\/calendar\/render/, "Google Takvim etkinlik adresi eksik");
assert.match(app, /dates:\s*`\$\{start\}\/\$\{end\}`/, "Takvim tarih aralığı eksik");

console.log("✓ frontend DOM/veri katmanı sözleşmesi");
console.log("✓ responsive kırılımlar ve güvenli metin render kontrolü");
