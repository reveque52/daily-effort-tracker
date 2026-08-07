(function (global) {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.entries.v1";
  const MAX_TEXT_LENGTH = 120;
  const MAX_NOTES_LENGTH = 1000;

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parts = value.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] &&
      date.getUTCMonth() === parts[1] - 1 &&
      date.getUTCDate() === parts[2];
  }

  function validate(input, options) {
    const value = input && typeof input === "object" ? input : {};
    const normalized = {
      date: cleanText(value.date),
      project: cleanText(value.project),
      task: cleanText(value.task),
      jiraId: cleanText(value.jiraId),
      hours: Number(value.hours),
      notes: cleanText(value.notes),
    };
    const errors = {};

    if (!isValidDate(normalized.date)) errors.date = "Geçerli bir tarih seçin.";
    if (!normalized.project) errors.project = "Proje adı zorunludur.";
    else if (normalized.project.length > MAX_TEXT_LENGTH) errors.project = "Proje adı en fazla 120 karakter olabilir.";
    if (!normalized.jiraId && !(options && options.allowLegacy)) errors.jiraId = "JIRA maddesi seçimi zorunludur.";
    if (!normalized.task) errors.task = "Görev açıklaması zorunludur.";
    else if (normalized.task.length > MAX_TEXT_LENGTH) errors.task = "Görev açıklaması en fazla 120 karakter olabilir.";
    if (!Number.isFinite(normalized.hours) || normalized.hours <= 0 || normalized.hours > 24) {
      errors.hours = "Efor 0 ile 24 saat arasında olmalıdır.";
    } else {
      normalized.hours = Math.round(normalized.hours * 100) / 100;
    }
    if (normalized.notes.length > MAX_NOTES_LENGTH) errors.notes = "Notlar en fazla 1000 karakter olabilir.";

    return { valid: Object.keys(errors).length === 0, errors: errors, value: normalized };
  }

  function readAll() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(function (item) { return validate(item, { allowLegacy: true }).valid && item.id; }) : [];
    } catch (_error) {
      return [];
    }
  }

  function writeAll(entries) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      throw new Error("Kayıtlar tarayıcıda saklanamadı: " + error.message);
    }
  }

  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return global.crypto.randomUUID();
    return "effort-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function list(filters) {
    const options = filters || {};
    return readAll().filter(function (entry) {
      return (!options.date || entry.date === options.date) &&
        (!options.project || entry.project.toLocaleLowerCase("tr-TR") === cleanText(options.project).toLocaleLowerCase("tr-TR")) &&
        (!options.from || entry.date >= options.from) &&
        (!options.to || entry.date <= options.to);
    }).sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    });
  }

  function get(id) {
    return readAll().find(function (entry) { return entry.id === id; }) || null;
  }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    const now = new Date().toISOString();
    const entry = Object.assign({ id: makeId() }, result.value, { createdAt: now, updatedAt: now });
    const entries = readAll();
    entries.push(entry);
    writeAll(entries);
    return { valid: true, errors: {}, value: entry };
  }

  function update(id, input) {
    const entries = readAll();
    const index = entries.findIndex(function (entry) { return entry.id === id; });
    if (index < 0) return { valid: false, errors: { id: "Kayıt bulunamadı." }, value: null };
    const result = validate(input);
    if (!result.valid) return result;
    entries[index] = Object.assign({}, entries[index], result.value, { updatedAt: new Date().toISOString() });
    writeAll(entries);
    return { valid: true, errors: {}, value: entries[index] };
  }

  function remove(id) {
    const entries = readAll();
    const next = entries.filter(function (entry) { return entry.id !== id; });
    if (next.length === entries.length) return false;
    writeAll(next);
    return true;
  }

  function clear() {
    writeAll([]);
  }

  function replaceAll(importedEntries) {
    if (!Array.isArray(importedEntries)) return { valid: false, errors: { entries: "Yedek dosyası geçersiz." } };
    const normalized = [];
    for (const item of importedEntries) {
      const result = validate(item, { allowLegacy: true });
      if (!result.valid) return { valid: false, errors: result.errors };
      const now = new Date().toISOString();
      normalized.push(Object.assign({ id: item.id || makeId() }, result.value, {
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now
      }));
    }
    writeAll(normalized);
    return { valid: true, errors: {}, value: normalized };
  }

  function summarize(entries) {
    const source = Array.isArray(entries) ? entries : readAll();
    const byProject = {};
    const byDate = {};
    let totalHours = 0;

    source.forEach(function (entry) {
      const hours = Number(entry.hours) || 0;
      totalHours += hours;
      byProject[entry.project] = Math.round(((byProject[entry.project] || 0) + hours) * 100) / 100;
      byDate[entry.date] = Math.round(((byDate[entry.date] || 0) + hours) * 100) / 100;
    });

    totalHours = Math.round(totalHours * 100) / 100;
    return {
      recordCount: source.length,
      totalHours: totalHours,
      averageHours: source.length ? Math.round((totalHours / source.length) * 100) / 100 : 0,
      byProject: byProject,
      byDate: byDate,
    };
  }

  global.EffortStore = Object.freeze({
    STORAGE_KEY: STORAGE_KEY,
    validate: validate,
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
    clear: clear,
    replaceAll: replaceAll,
    summarize: summarize,
  });
})(window);
