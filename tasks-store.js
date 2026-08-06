((global) => {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.tasks.v1";
  const STATUSES = ["planned", "in_progress", "completed"];

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validate(input) {
    const value = {
      title: String(input?.title || "").trim(),
      dueDate: String(input?.dueDate || "").trim(),
      status: String(input?.status || "planned")
    };
    const errors = {};
    if (!value.title) errors.title = "Görev başlığı zorunludur.";
    else if (value.title.length > 120) errors.title = "Görev başlığı en fazla 120 karakter olabilir.";
    if (!validDate(value.dueDate)) errors.dueDate = "Geçerli bir teslim tarihi seçin.";
    if (!STATUSES.includes(value.status)) errors.status = "Geçerli bir görev durumu seçin.";
    return { valid: Object.keys(errors).length === 0, errors, value };
  }

  function readAll() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }

  function writeAll(rows) { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); }
  function makeId() { return global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  function list() {
    return readAll().slice().sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title, "tr");
    });
  }

  function get(id) { return readAll().find((task) => task.id === id) || null; }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    const now = new Date().toISOString();
    const task = { id: makeId(), ...result.value, createdAt: now, updatedAt: now };
    writeAll([...readAll(), task]);
    return { valid: true, errors: {}, value: task };
  }

  function update(id, input) {
    const rows = readAll();
    const index = rows.findIndex((task) => task.id === id);
    if (index < 0) return { valid: false, errors: { id: "Görev bulunamadı." } };
    const result = validate(input);
    if (!result.valid) return result;
    rows[index] = { ...rows[index], ...result.value, updatedAt: new Date().toISOString() };
    writeAll(rows);
    return { valid: true, errors: {}, value: rows[index] };
  }

  function remove(id) {
    const rows = readAll();
    const next = rows.filter((task) => task.id !== id);
    if (next.length === rows.length) return false;
    writeAll(next);
    return true;
  }

  function replaceAll(importedTasks) {
    if (!Array.isArray(importedTasks)) return { valid: false, errors: { tasks: "Görev yedeği geçersiz." } };
    const normalized = [];
    for (const item of importedTasks) {
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

  global.TaskStore = Object.freeze({ STORAGE_KEY, STATUSES, validate, list, get, create, update, remove, replaceAll });
})(window);
