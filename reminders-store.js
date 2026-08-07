((global) => {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.reminders.v1";
  const IMPORTANCE_LEVELS = ["normal", "important"];

  function validReminderDate(value) {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    return !Number.isNaN(new Date(value).getTime());
  }

  function validate(input) {
    const value = {
      text: String(input?.text || "").trim(),
      remindAt: String(input?.remindAt || "").trim(),
      importance: String(input?.importance || "normal").trim(),
      completed: Boolean(input?.completed)
    };
    const errors = {};
    if (!value.text) errors.text = "Not veya hatırlatma metni zorunludur.";
    else if (value.text.length > 300) errors.text = "Not en fazla 300 karakter olabilir.";
    if (!validReminderDate(value.remindAt)) errors.remindAt = "Geçerli bir hatırlatma tarihi seçin.";
    if (!IMPORTANCE_LEVELS.includes(value.importance)) errors.importance = "Geçerli bir önem seviyesi seçin.";
    return { valid: Object.keys(errors).length === 0, errors, value };
  }

  function readAll() {
    try {
      const rows = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }

  function writeAll(rows) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }

  function makeId() {
    return global.crypto?.randomUUID?.() || `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function list() {
    return readAll().slice().sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.importance !== b.importance) return a.importance === "important" ? -1 : 1;
      const aDate = a.remindAt || "9999-12-31T23:59";
      const bDate = b.remindAt || "9999-12-31T23:59";
      return aDate.localeCompare(bDate) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function get(id) {
    return readAll().find((item) => item.id === id) || null;
  }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    const now = new Date().toISOString();
    const item = { id: makeId(), ...result.value, createdAt: now, updatedAt: now };
    writeAll([...readAll(), item]);
    return { valid: true, errors: {}, value: item };
  }

  function update(id, input) {
    const rows = readAll();
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0) return { valid: false, errors: { id: "Not bulunamadı." } };
    const result = validate(input);
    if (!result.valid) return result;
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

  function replaceAll(importedItems) {
    if (!Array.isArray(importedItems)) return { valid: false, errors: { reminders: "Not yedeği geçersiz." } };
    const normalized = [];
    for (const item of importedItems) {
      const result = validate(item);
      if (!result.valid) return result;
      const now = new Date().toISOString();
      normalized.push({
        id: item.id || makeId(),
        ...result.value,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now
      });
    }
    writeAll(normalized);
    return { valid: true, errors: {}, value: normalized };
  }

  global.ReminderStore = Object.freeze({ STORAGE_KEY, IMPORTANCE_LEVELS, validate, list, get, create, update, remove, replaceAll });
})(window);
