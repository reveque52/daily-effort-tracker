((global) => {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.people.v1";
  const ROLES = ["member", "leader"];
  let fallbackRows = [];

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeJiraAccountId(value) {
    return String(value || "").trim();
  }

  function normalizeAvatarUrl(value) {
    const avatarUrl = String(value || "").trim();
    return /^https:\/\//i.test(avatarUrl) ? avatarUrl : "";
  }

  function validate(input) {
    const value = {
      fullName: String(input?.fullName || "").trim().replace(/\s+/g, " "),
      email: normalizeEmail(input?.email),
      title: String(input?.title || "").trim().replace(/\s+/g, " "),
      role: String(input?.role || "member").trim(),
      managerId: String(input?.managerId || "").trim(),
      jiraAccountId: normalizeJiraAccountId(input?.jiraAccountId),
      avatarUrl: normalizeAvatarUrl(input?.avatarUrl),
      active: input?.active !== false,
      accountType: String(input?.accountType || "").trim(),
      timeZone: String(input?.timeZone || "").trim(),
      locale: String(input?.locale || "").trim(),
      source: normalizeJiraAccountId(input?.jiraAccountId) ? "jira" : String(input?.source || "manual").trim()
    };
    const errors = {};
    if (!value.fullName) errors.fullName = "Ad soyad zorunludur.";
    else if (value.fullName.length > 120) errors.fullName = "Ad soyad en fazla 120 karakter olabilir.";
    if (!value.email && !value.jiraAccountId) errors.email = "Manuel kişi kaydında e-posta adresi zorunludur.";
    else if (value.email && (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) errors.email = "Geçerli bir e-posta adresi girin.";
    if (value.title.length > 120) errors.title = "Ünvan en fazla 120 karakter olabilir.";
    if (!ROLES.includes(value.role)) errors.role = "Geçerli bir organizasyon rolü seçin.";
    if (value.managerId.length > 120) errors.managerId = "Yönetici bağlantısı geçersiz.";
    if (value.jiraAccountId.length > 255) errors.jiraAccountId = "JIRA kullanıcı kimliği geçersiz.";
    if (value.accountType.length > 80) errors.accountType = "JIRA hesap tipi geçersiz.";
    if (value.timeZone.length > 120) errors.timeZone = "Saat dilimi geçersiz.";
    if (value.locale.length > 40) errors.locale = "Dil bilgisi geçersiz.";
    return { valid: Object.keys(errors).length === 0, errors, value };
  }

  function readAll() {
    return global.CloudDataRuntime ? global.CloudDataRuntime.read("people") : JSON.parse(JSON.stringify(fallbackRows));
  }

  function writeAll(rows) {
    if (global.CloudDataRuntime) global.CloudDataRuntime.write("people", rows);
    else fallbackRows = JSON.parse(JSON.stringify(rows));
  }

  function makeId() {
    return global.crypto?.randomUUID?.() || `person-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function list() {
    return readAll().slice().sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || ""), "tr"));
  }

  function get(id) {
    return readAll().find((person) => person.id === id) || null;
  }

  function duplicateEmail(email, excludedId = "") {
    const normalized = normalizeEmail(email);
    return Boolean(normalized) && readAll().some((person) => person.id !== excludedId && normalizeEmail(person.email) === normalized);
  }

  function duplicateJiraAccountId(jiraAccountId, excludedId = "") {
    const normalized = normalizeJiraAccountId(jiraAccountId);
    return Boolean(normalized) && readAll().some((person) => person.id !== excludedId && normalizeJiraAccountId(person.jiraAccountId) === normalized);
  }

  function relationshipError(personId, managerId, rows) {
    if (!managerId) return "";
    if (managerId === personId) return "Bir kişi kendi yöneticisi olamaz.";
    if (!rows.some((person) => person.id === managerId)) return "Seçilen yönetici bulunamadı.";
    const visited = new Set([personId]);
    let currentId = managerId;
    while (currentId) {
      if (visited.has(currentId)) return "Organizasyon yapısında döngü oluşturulamaz.";
      visited.add(currentId);
      currentId = rows.find((person) => person.id === currentId)?.managerId || "";
    }
    return "";
  }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    if (duplicateEmail(result.value.email)) return { valid: false, errors: { email: "Bu e-posta adresiyle kayıtlı bir kişi zaten var." } };
    if (duplicateJiraAccountId(result.value.jiraAccountId)) return { valid: false, errors: { jiraAccountId: "Bu JIRA kullanıcısı zaten kayıtlı." } };
    const now = new Date().toISOString();
    const person = { id: makeId(), ...result.value, createdAt: now, updatedAt: now };
    const rows = readAll();
    const relationError = relationshipError(person.id, person.managerId, rows);
    if (relationError) return { valid: false, errors: { managerId: relationError } };
    writeAll([...rows, person]);
    return { valid: true, errors: {}, value: person };
  }

  function update(id, input) {
    const rows = readAll();
    const index = rows.findIndex((person) => person.id === id);
    if (index < 0) return { valid: false, errors: { id: "Kişi bulunamadı." } };
    const result = validate({ ...rows[index], ...input });
    if (!result.valid) return result;
    if (duplicateEmail(result.value.email, id)) return { valid: false, errors: { email: "Bu e-posta adresiyle kayıtlı bir kişi zaten var." } };
    if (duplicateJiraAccountId(result.value.jiraAccountId, id)) return { valid: false, errors: { jiraAccountId: "Bu JIRA kullanıcısı zaten kayıtlı." } };
    const relationError = relationshipError(id, result.value.managerId, rows);
    if (relationError) return { valid: false, errors: { managerId: relationError } };
    rows[index] = { ...rows[index], ...result.value, updatedAt: new Date().toISOString() };
    writeAll(rows);
    return { valid: true, errors: {}, value: rows[index] };
  }

  function remove(id) {
    const rows = readAll();
    if (rows.some((person) => person.managerId === id)) return false;
    const next = rows.filter((person) => person.id !== id);
    if (next.length === rows.length) return false;
    writeAll(next);
    return true;
  }

  function replaceAll(importedPeople) {
    if (!Array.isArray(importedPeople)) return { valid: false, errors: { people: "Kişi yedeği geçersiz." } };
    const normalized = [];
    const emails = new Set();
    const jiraAccountIds = new Set();
    for (const item of importedPeople) {
      const result = validate(item);
      if (!result.valid) return result;
      if (result.value.email && emails.has(result.value.email)) return { valid: false, errors: { email: "Kişi yedeğinde mükerrer e-posta adresi var." } };
      if (result.value.jiraAccountId && jiraAccountIds.has(result.value.jiraAccountId)) return { valid: false, errors: { jiraAccountId: "Kişi yedeğinde mükerrer JIRA kullanıcısı var." } };
      if (result.value.email) emails.add(result.value.email);
      if (result.value.jiraAccountId) jiraAccountIds.add(result.value.jiraAccountId);
      const now = new Date().toISOString();
      normalized.push({
        id: item.id || makeId(),
        ...result.value,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now
      });
    }
    for (const person of normalized) {
      const relationError = relationshipError(person.id, person.managerId, normalized);
      if (relationError) return { valid: false, errors: { managerId: `${person.fullName}: ${relationError}` } };
    }
    writeAll(normalized);
    return { valid: true, errors: {}, value: normalized };
  }

  function mergeJiraUsers(importedUsers) {
    if (!Array.isArray(importedUsers)) return { valid: false, errors: { people: "JIRA kullanıcı listesi geçersiz." } };
    const rows = readAll();
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const seenAccounts = new Set();

    for (const item of importedUsers) {
      const accountId = normalizeJiraAccountId(item?.jiraAccountId || item?.accountId);
      if (!accountId || item?.active === false || (item?.accountType && item.accountType !== "atlassian") || seenAccounts.has(accountId)) {
        skipped += 1;
        continue;
      }
      seenAccounts.add(accountId);
      const incomingEmail = normalizeEmail(item?.email || item?.emailAddress);
      const existingIndex = rows.findIndex((person) => normalizeJiraAccountId(person.jiraAccountId) === accountId);
      const emailMatchIndex = incomingEmail ? rows.findIndex((person) => normalizeEmail(person.email) === incomingEmail) : -1;
      const index = existingIndex >= 0 ? existingIndex : emailMatchIndex;
      const existing = index >= 0 ? rows[index] : null;
      const candidate = {
        ...(existing || {}),
        fullName: String(item?.fullName || item?.displayName || existing?.fullName || "").trim(),
        email: incomingEmail || existing?.email || "",
        title: existing?.title || "",
        role: existing?.role || "member",
        managerId: existing?.managerId || "",
        jiraAccountId: accountId,
        avatarUrl: item?.avatarUrl || existing?.avatarUrl || "",
        active: true,
        accountType: String(item?.accountType || "atlassian"),
        timeZone: String(item?.timeZone || existing?.timeZone || ""),
        locale: String(item?.locale || existing?.locale || ""),
        source: "jira"
      };
      const result = validate(candidate);
      if (!result.valid) return result;
      if (index >= 0) {
        rows[index] = { ...existing, ...result.value, updatedAt: now };
        updated += 1;
      } else {
        rows.push({ id: makeId(), ...result.value, createdAt: now, updatedAt: now });
        created += 1;
      }
    }

    writeAll(rows);
    return { valid: true, errors: {}, value: { created, updated, skipped, total: rows.length, people: list() } };
  }

  global.PeopleStore = Object.freeze({ STORAGE_KEY, ROLES, validate, list, get, create, update, remove, replaceAll, mergeJiraUsers });
})(window);
