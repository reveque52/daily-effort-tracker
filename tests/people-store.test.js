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
    crypto: { randomUUID: () => `person-${++idCounter}` }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "people-store.js"), "utf8"), {
    window, Date, Math, JSON, Object, Array, String, Set
  });
  return window.PeopleStore;
}

const store = loadStore();
assert.equal(store.validate({}).valid, false);
assert.equal(store.validate({ fullName: "Selçuk Dere", email: "bozuk" }).valid, false);

const created = store.create({ fullName: "  Selçuk   Dere ", email: " HSDERE@GMAIL.COM ", title: "Takım Lideri", role: "leader" });
assert.equal(created.valid, true);
assert.equal(created.value.fullName, "Selçuk Dere");
assert.equal(created.value.email, "hsdere@gmail.com");
assert.equal(created.value.role, "leader");
assert.equal(store.create({ fullName: "Başka Kişi", email: "HSDERE@gmail.com" }).valid, false, "E-posta tekil olmalı");

const member = store.create({ fullName: "Ekip Üyesi", email: "uye@example.com", title: "Uzman", managerId: created.value.id });
assert.equal(member.valid, true);
assert.equal(member.value.managerId, created.value.id);
assert.equal(store.remove(created.value.id), false, "Kendisine bağlı ekip üyesi bulunan lider silinmemeli");
assert.equal(store.update(created.value.id, { managerId: member.value.id }).valid, false, "Organizasyon döngüsüne izin verilmemeli");

const updated = store.update(created.value.id, { fullName: "Selçuk D.", email: "selcuk@example.com" });
assert.equal(updated.valid, true);
assert.equal(store.get(created.value.id).fullName, "Selçuk D.");
assert.equal(store.get(created.value.id).role, "leader", "Kısmi güncellemede organizasyon alanları korunmalı");

const restored = store.replaceAll([
  { id: "person-a", fullName: "Ayşe Yılmaz", email: "ayse@example.com" },
  { id: "person-b", fullName: "Mehmet Kaya", email: "mehmet@example.com" }
]);
assert.equal(restored.valid, true);
assert.equal(store.list().length, 2);
assert.equal(store.replaceAll([{ fullName: "A", email: "same@example.com" }, { fullName: "B", email: "SAME@example.com" }]).valid, false);
assert.equal(store.list().length, 2, "Geçersiz yedek mevcut kişileri değiştirmemeli");
assert.equal(store.remove("person-a"), true);
assert.equal(store.list().length, 1);

const jiraStore = loadStore();
const manualPerson = jiraStore.create({ fullName: "Eski Ad", email: "jira.user@example.com", title: "Architect", role: "leader" });
assert.equal(manualPerson.valid, true);
const jiraMerge = jiraStore.mergeJiraUsers([
  { accountId: "jira-account-1", displayName: "JIRA User", emailAddress: "jira.user@example.com", avatarUrl: "https://avatar.example.com/1.png", active: true, accountType: "atlassian", timeZone: "Europe/Istanbul" },
  { accountId: "jira-account-2", displayName: "Hidden Mail", emailAddress: "", active: true, accountType: "atlassian" },
  { accountId: "jira-account-3", displayName: "Inactive User", active: false, accountType: "atlassian" }
]);
assert.equal(jiraMerge.valid, true);
assert.equal(jiraMerge.value.created, 1);
assert.equal(jiraMerge.value.updated, 1);
assert.equal(jiraMerge.value.skipped, 1);
assert.equal(jiraStore.list().length, 2, "JIRA eşleşmesi mevcut kişiyi güncellemeli ve mükerrer oluşturmamalı");
assert.equal(jiraStore.get(manualPerson.value.id).fullName, "JIRA User");
assert.equal(jiraStore.get(manualPerson.value.id).title, "Architect", "Yerel organizasyon alanları JIRA güncellemesinde korunmalı");
assert.equal(jiraStore.get(manualPerson.value.id).jiraAccountId, "jira-account-1");
assert.equal(jiraStore.list().find((person) => person.jiraAccountId === "jira-account-2").email, "", "JIRA gizlilik ayarıyla gelmeyen e-posta zorunlu olmamalı");
const repeatedMerge = jiraStore.mergeJiraUsers([{ accountId: "jira-account-1", displayName: "JIRA User", active: true, accountType: "atlassian" }]);
assert.equal(repeatedMerge.value.created, 0);
assert.equal(jiraStore.list().length, 2);

console.log("✓ kişi, JIRA kullanıcı birleştirme, organizasyon ilişkisi, CRUD ve yedek geri yükleme");
