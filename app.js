(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const form = $("#effortForm");
  const taskForm = $("#taskForm");
  const fields = {
    id: $("#entryId"), date: $("#dateInput"), project: $("#projectInput"),
    description: $("#descriptionInput"), hours: $("#hoursInput")
  };
  const taskFields = {
    id: $("#taskId"), title: $("#taskTitleInput"), dueDate: $("#taskDueDateInput"), status: $("#taskStatusInput")
  };
  let entries = [];
  let tasks = [];
  let nextDashboardTask = null;

  const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const shortMonthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
  const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
  const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  const isoToday = () => new Date().toLocaleDateString("en-CA");
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const formatHours = (value) => `${numberFormatter.format(Number(value) || 0)} sa`;
  const isoFromDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };

  function googleCalendarUrl(task) {
    const start = task.dueDate.replaceAll("-", "");
    const nextDay = parseDate(task.dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = [nextDay.getFullYear(), String(nextDay.getMonth() + 1).padStart(2, "0"), String(nextDay.getDate()).padStart(2, "0")].join("");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: task.title,
      dates: `${start}/${end}`,
      details: `Görev teslim tarihi · Durum: ${statusLabel(task.status)}`
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function getStore() {
    return window.effortStore || window.EffortStore || window.dataStore;
  }

  function readEntries() {
    const store = getStore();
    if (store?.list) return store.list();
    if (store?.getAll) return store.getAll();
    try { return JSON.parse(localStorage.getItem("daily-effort-entries") || "[]"); } catch { return []; }
  }

  function saveEntry(entry) {
    const store = getStore();
    if (entry.id && store?.update) return store.update(entry.id, entry);
    if (!entry.id && store?.create) return store.create(entry);
    if (!entry.id && store?.add) return store.add(entry);
    const next = entry.id ? entries.map((item) => item.id === entry.id ? entry : item) : [...entries, { ...entry, id: crypto.randomUUID() }];
    localStorage.setItem("daily-effort-entries", JSON.stringify(next));
  }

  function removeEntry(id) {
    const store = getStore();
    if (store?.remove) return store.remove(id);
    if (store?.delete) return store.delete(id);
    localStorage.setItem("daily-effort-entries", JSON.stringify(entries.filter((entry) => entry.id !== id)));
  }

  function render() {
    entries = Array.from(readEntries() || []).sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    const filterDate = $("#filterDateInput").value;
    const visible = filterDate ? entries.filter((entry) => entry.date === filterDate) : entries;
    const dailyDate = filterDate || fields.date.value || isoToday();
    const dailyTotal = entries.filter((entry) => entry.date === dailyDate).reduce((sum, entry) => sum + Number(entry.hours), 0);
    const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);

    $("#dailyTotal").textContent = formatHours(dailyTotal);
    $("#grandTotal").textContent = formatHours(total);
    $("#entryCount").textContent = String(entries.length);
    $("#selectedDateLabel").textContent = dateFormatter.format(parseDate(dailyDate));
    $("#emptyState").classList.toggle("hidden", visible.length > 0);

    const list = $("#entryList");
    list.replaceChildren();
    visible.forEach((entry) => {
      const card = $("#entryTemplate").content.firstElementChild.cloneNode(true);
      const date = parseDate(entry.date);
      card.dataset.id = entry.id;
      card.querySelector(".entry-date strong").textContent = date.getDate();
      card.querySelector(".entry-date span").textContent = shortMonthFormatter.format(date);
      card.querySelector("h3").textContent = entry.project;
      card.querySelector(".hours-badge").textContent = formatHours(entry.hours);
      card.querySelector("p").textContent = entry.task || entry.description;
      const time = card.querySelector("time");
      time.dateTime = entry.date;
      time.textContent = dateFormatter.format(date);
      card.querySelector(".edit-button").addEventListener("click", () => startEdit(entry));
      card.querySelector(".delete-button").addEventListener("click", () => {
        if (confirm(`“${entry.project}” kaydı silinsin mi?`)) { removeEntry(entry.id); render(); backupAndReport("Silme işlemi Drive’a gönderildi."); }
      });
      list.append(card);
    });
    renderTimesheet();
  }

  function statusLabel(status) {
    return ({ planned: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı" })[status] || status;
  }

  function renderTasks() {
    tasks = window.TaskStore.list();
    const openTasks = tasks.filter((task) => task.status !== "completed");
    $("#taskTabCount").textContent = String(openTasks.length);
    $("#openTaskCount").textContent = `${openTasks.length} açık`;
    $("#taskEmptyState").classList.toggle("hidden", tasks.length > 0);

    nextDashboardTask = openTasks[0] || null;
    $("#nextTaskTitle").textContent = nextDashboardTask?.title || "Görev yok";
    $("#nextTaskDate").textContent = nextDashboardTask ? dateFormatter.format(parseDate(nextDashboardTask.dueDate)) : "Teslim tarihi bulunmuyor";
    $("#addNextTaskToCalendar").disabled = !nextDashboardTask;

    const list = $("#taskList");
    list.replaceChildren();
    tasks.forEach((task) => {
      const card = $("#taskTemplate").content.firstElementChild.cloneNode(true);
      card.dataset.id = task.id;
      card.classList.toggle("completed", task.status === "completed");
      card.querySelector("h3").textContent = task.title;
      const badge = card.querySelector(".task-status");
      badge.textContent = statusLabel(task.status);
      badge.dataset.status = task.status;
      const time = card.querySelector("time");
      time.dateTime = task.dueDate;
      time.textContent = `Teslim: ${dateFormatter.format(parseDate(task.dueDate))}`;
      card.querySelector(".task-check").classList.toggle("checked", task.status === "completed");
      card.querySelector(".task-check").addEventListener("click", () => {
        window.TaskStore.update(task.id, { ...task, status: task.status === "completed" ? "planned" : "completed" });
        renderTasks();
        backupAndReport("Görev durumu Drive’a gönderildi.");
      });
      card.querySelector(".task-edit-button").addEventListener("click", () => startTaskEdit(task));
      card.querySelector(".task-delete-button").addEventListener("click", () => {
        if (confirm(`“${task.title}” görevi silinsin mi?`)) {
          window.TaskStore.remove(task.id);
          renderTasks();
          backupAndReport("Silinen görev Drive’a gönderildi.");
        }
      });
      list.append(card);
    });
  }

  function getTimesheetRange() {
    const period = $("#timesheetPeriod").value;
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if (period === "week") {
      const mondayOffset = (reference.getDay() + 6) % 7;
      const start = addDays(reference, -mondayOffset);
      return { start, end: addDays(start, 6), period };
    }
    if (period === "month") {
      return {
        start: new Date(reference.getFullYear(), reference.getMonth(), 1, 12),
        end: new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 12),
        period
      };
    }
    const startValue = $("#timesheetStartDate").value;
    const endValue = $("#timesheetEndDate").value;
    if (!startValue || !endValue || startValue > endValue) return null;
    return { start: parseDate(startValue), end: parseDate(endValue), period };
  }

  function tableCell(tag, text, className = "") {
    const cell = document.createElement(tag);
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function renderTimesheet() {
    const range = getTimesheetRange();
    const table = $("#timesheetTable");
    const head = table.querySelector("thead");
    const body = table.querySelector("tbody");
    const foot = table.querySelector("tfoot");
    head.replaceChildren(); body.replaceChildren(); foot.replaceChildren();
    if (!range) {
      table.classList.add("hidden");
      $("#timesheetEmpty").classList.remove("hidden");
      $("#timesheetPeriodLabel").textContent = "Geçerli bir tarih aralığı seçin";
      $("#timesheetDayCount").textContent = "";
      $("#timesheetTotalHours").textContent = "0 sa";
      return;
    }

    const includeWeekends = $("#includeWeekends").checked;
    const dates = [];
    for (let date = new Date(range.start); date <= range.end; date = addDays(date, 1)) {
      if (includeWeekends || (date.getDay() !== 0 && date.getDay() !== 6)) dates.push(new Date(date));
    }
    const startIso = isoFromDate(range.start);
    const endIso = isoFromDate(range.end);
    const filtered = readEntries().filter((entry) => entry.date >= startIso && entry.date <= endIso && (includeWeekends || ![0, 6].includes(parseDate(entry.date).getDay())));
    const groups = new Map();
    filtered.forEach((entry) => {
      const key = `${entry.project}\u0000${entry.task || entry.description || ""}`;
      if (!groups.has(key)) groups.set(key, { project: entry.project, task: entry.task || entry.description || "", days: new Map(), total: 0 });
      const group = groups.get(key);
      group.days.set(entry.date, (group.days.get(entry.date) || 0) + Number(entry.hours));
      group.total += Number(entry.hours);
    });
    const rows = Array.from(groups.values()).sort((a, b) => a.project.localeCompare(b.project, "tr") || a.task.localeCompare(b.task, "tr"));
    const dayTotals = new Map(dates.map((date) => [isoFromDate(date), 0]));
    let grandTotal = 0;

    const headerRow = document.createElement("tr");
    headerRow.append(tableCell("th", "Proje", "sticky-column project-column"), tableCell("th", "Açıklama", "sticky-column description-column"));
    dates.forEach((date) => {
      const cell = tableCell("th", "", "day-column");
      const day = document.createElement("strong");
      day.textContent = String(date.getDate()).padStart(2, "0");
      const weekday = document.createElement("span");
      weekday.textContent = new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date);
      cell.append(day, weekday);
      if ([0, 6].includes(date.getDay())) cell.classList.add("weekend");
      headerRow.append(cell);
    });
    headerRow.append(tableCell("th", "Toplam", "total-column"));
    head.append(headerRow);

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.append(tableCell("td", row.project, "sticky-column project-column"), tableCell("td", row.task, "sticky-column description-column"));
      dates.forEach((date) => {
        const iso = isoFromDate(date);
        const hours = row.days.get(iso) || 0;
        dayTotals.set(iso, (dayTotals.get(iso) || 0) + hours);
        const cell = tableCell("td", hours ? numberFormatter.format(hours) : "", "hours-cell");
        if ([0, 6].includes(date.getDay())) cell.classList.add("weekend");
        tr.append(cell);
      });
      grandTotal += row.total;
      tr.append(tableCell("td", formatHours(row.total), "row-total total-column"));
      body.append(tr);
    });

    const totalRow = document.createElement("tr");
    const label = tableCell("th", `Toplam (${rows.length} satır)`, "sticky-column total-label");
    label.colSpan = 2;
    totalRow.append(label);
    dates.forEach((date) => totalRow.append(tableCell("th", dayTotals.get(isoFromDate(date)) ? numberFormatter.format(dayTotals.get(isoFromDate(date))) : "", "hours-cell")));
    totalRow.append(tableCell("th", formatHours(grandTotal), "total-column"));
    foot.append(totalRow);

    table.classList.toggle("hidden", rows.length === 0);
    $("#timesheetEmpty").classList.toggle("hidden", rows.length > 0);
    $("#timesheetTotalHours").textContent = formatHours(grandTotal);
    $("#timesheetPeriodLabel").textContent = `${dateFormatter.format(range.start)} – ${dateFormatter.format(range.end)}`;
    $("#timesheetDayCount").textContent = `${dates.length} gün · ${rows.length} satır`;
  }

  function startTaskEdit(task) {
    taskFields.id.value = task.id;
    taskFields.title.value = task.title;
    taskFields.dueDate.value = task.dueDate;
    taskFields.status.value = task.status;
    $("#taskSubmitLabel").textContent = "Değişiklikleri kaydet";
    $("#cancelTaskEdit").classList.remove("hidden");
    taskFields.title.focus();
  }

  function resetTaskForm() {
    taskForm.reset();
    taskFields.id.value = "";
    taskFields.dueDate.value = isoToday();
    taskFields.status.value = "planned";
    $("#taskSubmitLabel").textContent = "Görevi ekle";
    $("#cancelTaskEdit").classList.add("hidden");
    $("#taskFormMessage").textContent = "";
    $("#taskFormMessage").classList.remove("success");
  }

  function startEdit(entry) {
    fields.id.value = entry.id;
    fields.date.value = entry.date;
    fields.project.value = entry.project;
    fields.description.value = entry.task || entry.description || "";
    fields.hours.value = entry.hours;
    $("#submitLabel").textContent = "Değişiklikleri kaydet";
    $("#cancelEditButton").classList.remove("hidden");
    updateCount();
    fields.project.focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    form.reset();
    fields.id.value = "";
    fields.date.value = isoToday();
    $("#submitLabel").textContent = "Kaydı ekle";
    $("#cancelEditButton").classList.add("hidden");
    $("#formMessage").textContent = "";
    $("#formMessage").classList.remove("success");
    Object.values(fields).forEach((field) => field.removeAttribute("aria-invalid"));
    updateCount();
  }

  function updateCount() { $("#descriptionCount").textContent = fields.description.value.length; }

  function setDriveStatus(message, isError = false) {
    const status = $("#driveStatus");
    status.textContent = message;
    status.classList.toggle("drive-error", isError);
    $(".drive-toolbar-status").classList.toggle("is-connected", window.DriveSync?.hasAccessToken() && !isError);
  }

  function updateLastBackupTime(value = window.DriveSync?.getLastBackupTime()) {
    $("#lastBackupTime").textContent = value ? dateTimeFormatter.format(new Date(value)) : "Henüz yedeklenmedi";
  }

  function backupBundle() {
    return { entries: readEntries(), tasks: window.TaskStore.list() };
  }

  function setDriveBusy(busy) {
    ["#saveDriveSettings", "#backupToDrive", "#restoreFromDrive", "#initialRestoreButton"].forEach((selector) => {
      $(selector).disabled = busy;
    });
  }

  async function backupAndReport(message = "Kayıt Drive’a otomatik gönderildi.") {
    setDriveStatus("Veriler Google Drive’a gönderiliyor…");
    try {
      const result = await window.DriveSync.backup(backupBundle());
      updateLastBackupTime(result.modifiedTime);
      setDriveStatus(message);
      $("#restorePrompt").classList.add("hidden");
      return true;
    } catch (error) {
      setDriveStatus(`Drive yedeklemesi yapılamadı: ${error.message}`, true);
      return false;
    }
  }

  function finalAutoBackup() {
    if (!window.DriveSync?.getClientId() || !window.DriveSync.hasAccessToken()) return;
    window.DriveSync.backup(backupBundle(), { silent: true, keepalive: true }).catch(() => {});
  }

  async function restoreFromDrive() {
    const backup = await window.DriveSync.restore();
    if (readEntries().length && !confirm(`Drive yedeğindeki ${backup.entries.length} kayıt mevcut yerel kayıtların yerine yüklensin mi?`)) {
      setDriveStatus("Geri yükleme iptal edildi.");
      return;
    }
    const result = getStore().replaceAll(backup.entries);
    if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "Yedek doğrulanamadı.");
    const taskResult = window.TaskStore.replaceAll(backup.tasks || []);
    if (!taskResult.valid) throw new Error(Object.values(taskResult.errors || {}).join(" ") || "Görev yedeği doğrulanamadı.");
    render();
    renderTasks();
    updateLastBackupTime(backup.file.modifiedTime);
    $("#restorePrompt").classList.add("hidden");
    setDriveStatus(`${backup.entries.length} kayıt Google Drive’dan geri yüklendi.`);
  }

  async function runDriveAction(action) {
    setDriveBusy(true);
    try { await action(); }
    catch (error) { setDriveStatus(error.message || "Google Drive işlemi tamamlanamadı.", true); }
    finally { setDriveBusy(false); }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalid = Object.values(fields).filter((field) => field !== fields.id && !field.checkValidity());
    Object.values(fields).forEach((field) => field.toggleAttribute("aria-invalid", invalid.includes(field)));
    if (invalid.length) {
      $("#formMessage").textContent = "Lütfen zorunlu alanları geçerli bilgilerle doldurun.";
      invalid[0].focus();
      return;
    }
    const editing = Boolean(fields.id.value);
    const result = saveEntry({
      id: fields.id.value || undefined,
      date: fields.date.value,
      project: fields.project.value.trim(),
      task: fields.description.value.trim(),
      hours: Number(fields.hours.value),
      notes: ""
    });
    if (result?.valid === false) {
      const messages = Object.values(result.errors || {});
      $("#formMessage").textContent = messages.join(" ") || "Kayıt kaydedilemedi.";
      return;
    }
    resetForm();
    $("#formMessage").textContent = editing ? "Kayıt güncellendi." : "Efor kaydı eklendi.";
    $("#formMessage").classList.add("success");
    render();
    backupAndReport(editing ? "Güncellenen kayıt Drive’a gönderildi." : "Yeni kayıt Drive’a gönderildi.");
  });

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const editing = Boolean(taskFields.id.value);
    const payload = {
      title: taskFields.title.value.trim(),
      dueDate: taskFields.dueDate.value,
      status: taskFields.status.value
    };
    const result = editing ? window.TaskStore.update(taskFields.id.value, payload) : window.TaskStore.create(payload);
    if (!result.valid) {
      $("#taskFormMessage").textContent = Object.values(result.errors || {}).join(" ");
      $("#taskFormMessage").classList.remove("success");
      return;
    }
    resetTaskForm();
    $("#taskFormMessage").textContent = editing ? "Görev güncellendi." : "Görev eklendi.";
    $("#taskFormMessage").classList.add("success");
    renderTasks();
    backupAndReport(editing ? "Güncellenen görev Drive’a gönderildi." : "Yeni görev Drive’a gönderildi.");
  });

  $("#cancelTaskEdit").addEventListener("click", resetTaskForm);
  $("#addNextTaskToCalendar").addEventListener("click", () => {
    if (nextDashboardTask) window.open(googleCalendarUrl(nextDashboardTask), "_blank", "noopener,noreferrer");
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll(".tab-view").forEach((view) => view.classList.toggle("hidden", view.id !== button.dataset.tab));
    });
  });

  function updateTimesheetControls() {
    const custom = $("#timesheetPeriod").value === "custom";
    $("#timesheetPeriodNavigation").classList.toggle("hidden", custom);
    $("#timesheetStartField").classList.toggle("hidden", !custom);
    $("#timesheetEndField").classList.toggle("hidden", !custom);
    renderTimesheet();
  }

  $("#timesheetPeriod").addEventListener("change", updateTimesheetControls);
  $("#timesheetReferenceDate").addEventListener("change", renderTimesheet);
  $("#timesheetStartDate").addEventListener("change", renderTimesheet);
  $("#timesheetEndDate").addEventListener("change", renderTimesheet);
  $("#includeWeekends").addEventListener("change", renderTimesheet);
  $("#timesheetPrevious").addEventListener("click", () => {
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if ($("#timesheetPeriod").value === "month") { reference.setDate(1); reference.setMonth(reference.getMonth() - 1); }
    else reference.setDate(reference.getDate() - 7);
    $("#timesheetReferenceDate").value = isoFromDate(reference);
    renderTimesheet();
  });
  $("#timesheetNext").addEventListener("click", () => {
    const reference = parseDate($("#timesheetReferenceDate").value || isoToday());
    if ($("#timesheetPeriod").value === "month") { reference.setDate(1); reference.setMonth(reference.getMonth() + 1); }
    else reference.setDate(reference.getDate() + 7);
    $("#timesheetReferenceDate").value = isoFromDate(reference);
    renderTimesheet();
  });

  fields.description.addEventListener("input", updateCount);
  fields.date.addEventListener("change", render);
  $("#filterDateInput").addEventListener("change", render);
  $("#cancelEditButton").addEventListener("click", resetForm);

  $("#saveDriveSettings").addEventListener("click", () => {
    try {
      window.DriveSync.setClientId($("#googleClientId").value);
      setDriveStatus("OAuth Client ID kaydedildi. Açılış yedeğini şimdi yükleyebilirsiniz.");
      $(".drive-settings").open = false;
      $("#restorePrompt").classList.remove("hidden");
    } catch (error) { setDriveStatus(error.message, true); }
  });

  $("#backupToDrive").addEventListener("click", () => runDriveAction(async () => {
    await backupAndReport("Yedek Google Drive’a kaydedildi.");
  }));

  $("#restoreFromDrive").addEventListener("click", () => runDriveAction(restoreFromDrive));
  $("#initialRestoreButton").addEventListener("click", () => runDriveAction(restoreFromDrive));
  $("#skipInitialRestore").addEventListener("click", () => {
    $("#restorePrompt").classList.add("hidden");
    setDriveStatus("Drive geri yüklemesi bu açılış için atlandı.");
  });

  window.addEventListener("pagehide", finalAutoBackup);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finalAutoBackup();
  });

  $("#todayLabel").textContent = dateFormatter.format(new Date());
  $("#googleClientId").value = window.DriveSync?.getClientId() || "";
  updateLastBackupTime();
  if ($("#googleClientId").value) {
    setDriveStatus("Başlamak için Drive’daki en güncel yedeği yükleyin.");
    $("#restorePrompt").classList.remove("hidden");
  } else {
    setDriveStatus("Ayarlar’dan Google OAuth Client ID’nizi kaydedin.");
  }
  fields.date.value = isoToday();
  taskFields.dueDate.value = isoToday();
  $("#timesheetReferenceDate").value = isoToday();
  const todayForRange = parseDate(isoToday());
  const rangeMonday = addDays(todayForRange, -((todayForRange.getDay() + 6) % 7));
  $("#timesheetStartDate").value = isoFromDate(rangeMonday);
  $("#timesheetEndDate").value = isoFromDate(addDays(rangeMonday, 6));
  render();
  renderTasks();
})();
