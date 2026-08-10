((global) => {
  "use strict";

  const STORAGE_KEY = "daily-effort-tracker.tasks.v1";
  const ARCHITECTURE_MIGRATION_KEY = "daily-effort-tracker.tasks.architecture-roadmap.v1";
  const STATUSES = ["planned", "in_progress", "completed"];
  const PRIORITIES = ["", "high", "medium", "low"];
  const QUARTERS = ["", "Q1", "Q2", "Q3", "Q4"];
  const TASK_TYPES = ["standard", "architecture_roadmap", "meeting_organization", "management_request", "other"];
  const MAX_DESCRIPTION_HTML_LENGTH = 50000;
  const MAX_ATTACHMENTS = 100;

  function normalizeAttachment(input) {
    const webViewLink = String(input?.webViewLink || "").trim();
    const webContentLink = String(input?.webContentLink || "").trim();
    return {
      id: String(input?.id || "").trim(),
      name: String(input?.name || "").trim(),
      mimeType: String(input?.mimeType || "application/octet-stream").trim(),
      size: Math.max(0, Number(input?.size) || 0),
      webViewLink: /^https:\/\//i.test(webViewLink) ? webViewLink : "",
      webContentLink: /^https:\/\//i.test(webContentLink) ? webContentLink : "",
      uploadedAt: String(input?.uploadedAt || "").trim()
    };
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validate(input) {
    const value = {
      title: String(input?.title || "").trim(),
      parentItem: String(input?.parentItem || "").trim(),
      parentTaskId: String(input?.parentTaskId || "").trim(),
      assignee: String(input?.assignee || "").trim(),
      assigneeId: String(input?.assigneeId || "").trim(),
      taskType: String(input?.taskType || "standard").trim(),
      priority: String(input?.priority || "").trim(),
      year: String(input?.year || "").trim(),
      quarter: String(input?.quarter || "").trim().toUpperCase(),
      dueDate: String(input?.dueDate || "").trim(),
      status: String(input?.status || "planned"),
      descriptionHtml: String(input?.descriptionHtml || "").trim(),
      attachments: Array.isArray(input?.attachments) ? input.attachments.map(normalizeAttachment) : []
    };
    const errors = {};
    if (!value.title) errors.title = "Görev başlığı zorunludur.";
    else if (value.title.length > 300) errors.title = "Görev başlığı en fazla 300 karakter olabilir.";
    if (value.parentItem.length > 300) errors.parentItem = "Ana madde en fazla 300 karakter olabilir.";
    if (value.parentTaskId.length > 120) errors.parentTaskId = "Ana görev bağlantısı geçersiz.";
    if (value.assignee.length > 120) errors.assignee = "Atanan kişi en fazla 120 karakter olabilir.";
    if (value.assigneeId.length > 120) errors.assigneeId = "Atanan kişi bağlantısı geçersiz.";
    if (!TASK_TYPES.includes(value.taskType)) errors.taskType = "Geçerli bir görev tipi seçin.";
    if (!PRIORITIES.includes(value.priority)) errors.priority = "Geçerli bir öncelik seçin.";
    if (value.year && !/^(20\d{2}|2100)$/.test(value.year)) errors.year = "Yıl 2000–2100 arasında olmalıdır.";
    if (!QUARTERS.includes(value.quarter)) errors.quarter = "Geçerli bir çeyrek seçin.";
    if (value.dueDate && !validDate(value.dueDate)) errors.dueDate = "Geçerli bir teslim tarihi seçin.";
    if (!STATUSES.includes(value.status)) errors.status = "Geçerli bir görev durumu seçin.";
    if (value.descriptionHtml.length > MAX_DESCRIPTION_HTML_LENGTH) errors.descriptionHtml = "Görev açıklaması en fazla 50.000 karakter olabilir.";
    if (value.attachments.length > MAX_ATTACHMENTS) errors.attachments = `Bir göreve en fazla ${MAX_ATTACHMENTS} doküman bağlanabilir.`;
    else if (value.attachments.some((item) => !item.id || !item.name || item.id.length > 200 || item.name.length > 300)) errors.attachments = "Görev dokümanlarından biri geçersiz.";
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
      const aPlan = a.dueDate || `${a.year || "9999"}-${a.quarter || "Q9"}`;
      const bPlan = b.dueDate || `${b.year || "9999"}-${b.quarter || "Q9"}`;
      return aPlan.localeCompare(bPlan) || a.title.localeCompare(b.title, "tr");
    });
  }

  function get(id) { return readAll().find((task) => task.id === id) || null; }

  function create(input) {
    const result = validate(input);
    if (!result.valid) return result;
    const now = new Date().toISOString();
    const requestedId = String(input?.id || "").trim();
    if (requestedId.length > 160) return { valid: false, errors: { id: "Görev kimliği geçersiz." } };
    if (requestedId && readAll().some((task) => task.id === requestedId)) return { valid: false, errors: { id: "Bu görev kimliği zaten kullanılıyor." } };
    const task = { id: requestedId || makeId(), ...result.value, createdAt: now, updatedAt: now };
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
    if (rows.some((task) => task.parentTaskId === id)) return false;
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

  function mergeAll(importedTasks) {
    if (!Array.isArray(importedTasks)) return { valid: false, errors: { tasks: "Görev içe aktarma verisi geçersiz." } };
    const rows = readAll();
    const signature = (task) => [task.title, task.parentItem, task.year, task.quarter]
      .map((value) => String(value || "").trim().toLocaleLowerCase("tr-TR")).join("|");
    const bySignature = new Map(rows.map((task, index) => [signature(task), index]));
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    for (const item of importedTasks) {
      const result = validate(item);
      if (!result.valid) return result;
      const key = signature(result.value);
      const index = bySignature.get(key);
      if (index === undefined) {
        rows.push({ id: item.id || makeId(), ...result.value, createdAt: item.createdAt || now, updatedAt: now });
        bySignature.set(key, rows.length - 1);
        created += 1;
      } else {
        const attachments = Array.isArray(item?.attachments) ? result.value.attachments : (rows[index].attachments || []);
        rows[index] = { ...rows[index], ...result.value, attachments, updatedAt: now };
        updated += 1;
      }
    }
    writeAll(rows);
    return { valid: true, errors: {}, value: { imported: importedTasks.length, created, updated, total: rows.length } };
  }

  function ensureHierarchy() {
    const rows = readAll();
    const normalizeTitle = (value) => String(value || "").trim().toLocaleLowerCase("tr-TR");
    const byTitle = new Map();
    rows.forEach((task) => {
      const key = normalizeTitle(task.title);
      if (key && !byTitle.has(key) && !task.parentTaskId) byTitle.set(key, task);
    });
    let created = 0;
    let linked = 0;
    const now = new Date().toISOString();
    Array.from(new Set(rows.map((task) => task.parentItem).filter(Boolean))).forEach((parentTitle) => {
      const key = normalizeTitle(parentTitle);
      if (byTitle.has(key)) return;
      const parent = {
        id: makeId(), title: parentTitle, parentItem: "", parentTaskId: "", assignee: "", assigneeId: "",
        taskType: "standard", priority: "", year: "", quarter: "", dueDate: "",
        status: "planned", descriptionHtml: "", attachments: [], createdAt: now, updatedAt: now
      };
      rows.push(parent);
      byTitle.set(key, parent);
      created += 1;
    });
    rows.forEach((task) => {
      if (task.parentTaskId || !task.parentItem) return;
      const parent = byTitle.get(normalizeTitle(task.parentItem));
      if (parent && parent.id !== task.id) {
        task.parentTaskId = parent.id;
        task.updatedAt = now;
        linked += 1;
      }
    });
    if (created || linked) writeAll(rows);
    return { created, linked, total: rows.length };
  }

  function migrateExistingTasksToArchitectureRoadmap() {
    const rows = readAll();
    if (localStorage.getItem(ARCHITECTURE_MIGRATION_KEY) === "done") {
      return { updated: 0, total: rows.length };
    }
    const now = new Date().toISOString();
    let updated = 0;
    rows.forEach((task) => {
      if (task.taskType === "architecture_roadmap") return;
      task.taskType = "architecture_roadmap";
      task.updatedAt = now;
      updated += 1;
    });
    if (updated) writeAll(rows);
    localStorage.setItem(ARCHITECTURE_MIGRATION_KEY, "done");
    return { updated, total: rows.length };
  }

  global.TaskStore = Object.freeze({ STORAGE_KEY, STATUSES, PRIORITIES, QUARTERS, TASK_TYPES, validate, list, get, create, update, remove, replaceAll, mergeAll, ensureHierarchy, migrateExistingTasksToArchitectureRoadmap });
})(window);
