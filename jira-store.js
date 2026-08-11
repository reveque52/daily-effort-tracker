((global) => {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.jira-items.v1";
  const normalizeKey = (value) => String(value || "").trim().toLocaleUpperCase("en-US");
  let fallbackRows = [];

  function validate(input) {
    const value = {
      jiraIssueId: String(input?.jiraIssueId || "").trim(),
      issueType: String(input?.issueType || "Task").trim(),
      name: String(input?.name || "").trim(),
      description: String(input?.description || "").trim(),
      url: String(input?.url || "").trim(),
      assignee: String(input?.assignee || "").trim(),
      assigneeAccountId: String(input?.assigneeAccountId || "").trim(),
      reporter: String(input?.reporter || "").trim(),
      priority: String(input?.priority || "").trim(),
      status: String(input?.status || "Open").trim(),
      resolution: String(input?.resolution || "Unresolved").trim(),
      jiraCreated: String(input?.jiraCreated || "").trim(),
      jiraUpdated: String(input?.jiraUpdated || "").trim(),
      dueDate: String(input?.dueDate || "").trim()
    };
    const errors = {};
    if (!value.name) errors.name = "JIRA madde adı zorunludur.";
    else if (value.name.length > 100) errors.name = "JIRA madde adı en fazla 100 karakter olabilir.";
    if (!value.description) errors.description = "JIRA açıklaması zorunludur.";
    else if (value.description.length > 300) errors.description = "JIRA açıklaması en fazla 300 karakter olabilir.";
    const optionalLimits = { jiraIssueId: 80, issueType: 60, assignee: 100, assigneeAccountId: 180, reporter: 100, priority: 40, status: 80, resolution: 120, jiraCreated: 80, jiraUpdated: 80, dueDate: 80 };
    Object.entries(optionalLimits).forEach(([field, limit]) => {
      if (value[field].length > limit) errors[field] = `${field} alanı en fazla ${limit} karakter olabilir.`;
    });
    try {
      const parsed = new URL(value.url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch { errors.url = "Geçerli bir HTTP veya HTTPS JIRA bağlantısı girin."; }
    return { valid: Object.keys(errors).length === 0, errors, value };
  }

  function readAll() {
    return global.CloudDataRuntime ? global.CloudDataRuntime.read("jiraItems") : JSON.parse(JSON.stringify(fallbackRows));
  }

  function writeAll(rows) {
    if (global.CloudDataRuntime) global.CloudDataRuntime.write("jiraItems", rows);
    else fallbackRows = JSON.parse(JSON.stringify(rows));
  }
  function makeId() { return global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function list() { return readAll().slice().sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true, sensitivity: "base" })); }
  function get(id) { return readAll().find((item) => item.id === id) || null; }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    if (readAll().some((item) => normalizeKey(item.name) === normalizeKey(result.value.name))) {
      return { valid: false, errors: { name: "Bu JIRA Key zaten kayıtlıdır." } };
    }
    const now = new Date().toISOString();
    const item = { id: makeId(), ...result.value, createdAt: now, updatedAt: now };
    writeAll([...readAll(), item]);
    return { valid: true, errors: {}, value: item };
  }

  function update(id, input) {
    const rows = readAll();
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0) return { valid: false, errors: { id: "JIRA maddesi bulunamadı." } };
    const result = validate(input);
    if (!result.valid) return result;
    if (rows.some((item) => item.id !== id && normalizeKey(item.name) === normalizeKey(result.value.name))) {
      return { valid: false, errors: { name: "Bu JIRA Key başka bir kayıtta kullanılıyor." } };
    }
    rows[index] = { ...rows[index], ...result.value, updatedAt: new Date().toISOString() };
    writeAll(rows);
    return { valid: true, errors: {}, value: rows[index] };
  }

  function remove(id) {
    const rows = readAll();
    const next = rows.filter((item) => item.id !== id);
    if (next.length === rows.length) return false;
    writeAll(next);
    return true;
  }

  function removeMany(ids) {
    if (!Array.isArray(ids)) return { valid: false, errors: { ids: "Silinecek JIRA maddeleri geçersiz." } };
    const selected = new Set(ids.map((id) => String(id || "").trim()).filter(Boolean));
    if (!selected.size) return { valid: true, errors: {}, value: { removed: 0, total: readAll().length } };
    const rows = readAll();
    const next = rows.filter((item) => !selected.has(item.id));
    writeAll(next);
    return { valid: true, errors: {}, value: { removed: rows.length - next.length, total: next.length } };
  }

  function replaceAll(importedItems) {
    if (!Array.isArray(importedItems)) return { valid: false, errors: { jiraItems: "JIRA yedeği geçersiz." } };
    const normalized = [];
    for (const item of importedItems) {
      const result = validate(item);
      if (!result.valid) return result;
      const now = new Date().toISOString();
      normalized.push({ id: item.id || makeId(), ...result.value, createdAt: item.createdAt || now, updatedAt: item.updatedAt || now });
    }
    writeAll(normalized);
    return { valid: true, errors: {}, value: normalized };
  }

  function mergeAll(importedItems) {
    if (!Array.isArray(importedItems)) return { valid: false, errors: { jiraItems: "JIRA içe aktarma verisi geçersiz." } };
    const sourceRows = readAll();
    const rows = [];
    const byKey = new Map();
    const idRemap = {};
    const now = new Date().toISOString();
    let duplicateCount = 0;

    sourceRows.forEach((item) => {
      const key = normalizeKey(item.name);
      const index = byKey.get(key);
      if (index === undefined) {
        rows.push(item);
        byKey.set(key, rows.length - 1);
        return;
      }
      const canonical = rows[index];
      rows[index] = { ...canonical, ...item, id: canonical.id, createdAt: canonical.createdAt || item.createdAt, updatedAt: item.updatedAt || canonical.updatedAt };
      if (item.id && item.id !== canonical.id) idRemap[item.id] = canonical.id;
      duplicateCount += 1;
    });

    const existingKeys = new Set(byKey.keys());
    const importedKeys = new Set();
    const createdKeys = new Set();
    const updatedKeys = new Set();
    for (const item of importedItems) {
      const result = validate(item);
      if (!result.valid) return result;
      const key = normalizeKey(result.value.name);
      if (importedKeys.has(key)) duplicateCount += 1;
      importedKeys.add(key);
      const index = byKey.get(key);
      if (index === undefined) {
        rows.push({ id: item.id || makeId(), ...result.value, createdAt: item.createdAt || now, updatedAt: now });
        byKey.set(key, rows.length - 1);
        createdKeys.add(key);
      } else {
        rows[index] = { ...rows[index], ...result.value, updatedAt: now };
        if (existingKeys.has(key)) updatedKeys.add(key);
      }
    }
    writeAll(rows);
    return {
      valid: true,
      errors: {},
      value: {
        imported: importedItems.length,
        created: createdKeys.size,
        updated: updatedKeys.size,
        duplicateCount,
        total: rows.length,
        idRemap
      }
    };
  }

  global.JiraStore = Object.freeze({ STORAGE_KEY, validate, list, get, create, update, remove, removeMany, replaceAll, mergeAll });
})(window);
