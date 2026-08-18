(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const statusLabel = (status) => ({ planned: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı" })[status] || status;
  const priorityLabel = (priority) => ({ high: "Yüksek", medium: "Orta", low: "Düşük" })[priority] || "Belirtilmedi";
  const taskTypeLabel = (taskType) => ({
    standard: "Standart görev",
    architecture_roadmap: "Architecture Roadmap",
    meeting_organization: "Toplantı organizasyonu",
    management_request: "Yönetim talebi",
    other: "Diğer"
  })[taskType] || "Standart görev";
  const REPORT_COLUMNS = Object.freeze([
    { id: "completed", label: "Tamamlandı", min: 88, weight: .8 },
    { id: "task", label: "Görev / Alt Görev", min: 210, weight: 2.5 },
    { id: "parent", label: "Bağlı Ana Görev", min: 170, weight: 1.7 },
    { id: "assignee", label: "Atanan / Kimde Bekliyor", min: 150, weight: 1.5 },
    { id: "priority", label: "Öncelik", min: 95, weight: .9 },
    { id: "plan", label: "Yıl / Çeyrek", min: 105, weight: 1 },
    { id: "dueDate", label: "Teslim Tarihi", min: 135, weight: 1.2 },
    { id: "status", label: "Durum", min: 120, weight: 1.1 },
    { id: "actions", label: "İşlemler", min: 125, weight: 1.3 }
  ]);
  let reportLayout = loadReportLayout();

  function loadReportLayout(saved = {}) {
    const columnIds = REPORT_COLUMNS.map((column) => column.id);
    const visible = Array.isArray(saved.visible) ? saved.visible.filter((id) => columnIds.includes(id)) : columnIds;
    return { visible: visible.length ? visible : ["task"], fitScreen: saved.fitScreen !== false };
  }

  function visibleReportColumns() {
    return REPORT_COLUMNS.filter((column) => reportLayout.visible.includes(column.id));
  }

  function markColumn(cell, columnId) {
    cell.dataset.columnId = columnId;
    return cell;
  }

  function formatDate(value) {
    if (!value) return "Belirtilmedi";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "Belirtilmedi" : dateFormatter.format(date);
  }

  function orderTasksByHierarchy(source) {
    const byId = new Map(source.map((task) => [task.id, task]));
    const children = new Map();
    source.forEach((task) => {
      const parentId = task.parentTaskId && byId.has(task.parentTaskId) ? task.parentTaskId : "";
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(task);
    });
    const ordered = [];
    const visited = new Set();
    const append = (task, depth) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      ordered.push({ task, depth });
      (children.get(task.id) || []).forEach((child) => append(child, depth + 1));
    };
    (children.get("") || []).forEach((task) => append(task, 0));
    source.forEach((task) => append(task, 0));
    return ordered;
  }

  function detailUrl(taskId, taskType, status = "") {
    const params = new URLSearchParams({ id: taskId, fromType: taskType });
    if (status) params.set("fromStatus", status);
    return `task-detail.html?${params}`;
  }

  function createCell(text, columnId, className = "") {
    const cell = document.createElement("td");
    cell.dataset.columnId = columnId;
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function renderReportHeader() {
    const header = $("#taskTypeReportHeaderRow");
    header.replaceChildren(...visibleReportColumns().map((column) => {
      const cell = document.createElement("th");
      cell.dataset.columnId = column.id;
      cell.textContent = column.label;
      return cell;
    }));
  }

  function applyReportFitMode() {
    const columns = visibleReportColumns();
    const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0) || 1;
    const table = $("#taskTypeReportTable");
    const scroll = $("#taskTypeReportScroll");
    scroll.classList.toggle("fit-screen", reportLayout.fitScreen);
    table.classList.toggle("fit-screen", reportLayout.fitScreen);
    table.style.width = reportLayout.fitScreen ? "100%" : `${columns.reduce((sum, column) => sum + column.min, 0)}px`;
    table.style.minWidth = reportLayout.fitScreen ? "0" : table.style.width;
    columns.forEach((column) => {
      document.querySelectorAll(`#taskTypeReportTable [data-column-id="${column.id}"]`).forEach((cell) => {
        cell.style.width = reportLayout.fitScreen ? `${(column.weight / totalWeight) * 100}%` : `${column.min}px`;
      });
    });
    const toggle = $("#taskTypeReportFitToggle");
    toggle.classList.toggle("active", reportLayout.fitScreen);
    toggle.setAttribute("aria-pressed", String(reportLayout.fitScreen));
    toggle.textContent = `Ekrana sığdır: ${reportLayout.fitScreen ? "Açık" : "Kapalı"}`;
  }

  function renderReportColumnOptions() {
    const options = $("#taskTypeReportColumnOptions");
    options.replaceChildren();
    REPORT_COLUMNS.forEach((column) => {
      const label = document.createElement("label");
      label.className = "jira-column-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = reportLayout.visible.includes(column.id);
      checkbox.disabled = checkbox.checked && reportLayout.visible.length === 1;
      const text = document.createElement("span");
      text.textContent = column.label;
      checkbox.addEventListener("change", () => {
        reportLayout.visible = checkbox.checked
          ? [...reportLayout.visible, column.id]
          : reportLayout.visible.filter((id) => id !== column.id);
        renderTaskTypeReport();
        saveReportLayout(`${column.label} kolonu ${checkbox.checked ? "gösterildi" : "gizlendi"}.`);
      });
      label.append(checkbox, text);
      options.append(label);
    });
  }

  async function saveReportLayout(message) {
    $("#taskTypeReportColumnStatus").textContent = message;
    try {
      await window.SupabaseCloud.updateUserSettings({ taskTypeReportLayout: reportLayout });
    } catch (error) {
      $("#taskTypeReportColumnStatus").textContent = `${message} Tercih Supabase'e kaydedilemedi: ${error.message}`;
    }
  }

  function renderTaskTypeReport() {
    const params = new URLSearchParams(window.location.search);
    const taskType = params.get("type") || "";
    const requestedStatus = params.get("status") || "";
    const selectedStatus = ["planned", "in_progress", "completed"].includes(requestedStatus) ? requestedStatus : "";
    if (!window.TaskStore.TASK_TYPES.includes(taskType)) {
      $("#taskTypeReportError").classList.remove("hidden");
      return;
    }

    const allTasks = window.TaskStore.list();
    const typeTasks = allTasks.filter((task) => (task.taskType || "standard") === taskType);
    const reportTasks = selectedStatus ? typeTasks.filter((task) => task.status === selectedStatus) : typeTasks;
    const typeLabel = taskTypeLabel(taskType);
    document.title = `${typeLabel} · Görev Tipi Raporu`;
    $("#taskTypeReportTitle").textContent = typeLabel;
    $("#taskTypeReportSubtitle").textContent = selectedStatus
      ? `${statusLabel(selectedStatus)} durumundaki ${reportTasks.length} madde için detaylı görev raporu`
      : `${reportTasks.length} madde için detaylı görev raporu`;
    if (selectedStatus) $("#taskTypeReportBackLink").href = `index.html?view=tasks&taskStatus=${encodeURIComponent(selectedStatus)}`;
    $("#taskTypeReportContent").classList.remove("hidden");
    $("#taskTypeReportTotal").textContent = String(typeTasks.length);
    $("#taskTypeReportOpen").textContent = String(typeTasks.filter((task) => task.status !== "completed").length);
    $("#taskTypeReportInProgress").textContent = String(typeTasks.filter((task) => task.status === "in_progress").length);
    $("#taskTypeReportCompleted").textContent = String(typeTasks.filter((task) => task.status === "completed").length);
    $("#taskTypeReportEmpty").classList.toggle("hidden", reportTasks.length > 0);
    $("#taskTypeReportScroll").classList.toggle("hidden", reportTasks.length === 0);

    const body = $("#taskTypeReportBody");
    body.replaceChildren();
    renderReportHeader();
    orderTasksByHierarchy(reportTasks).forEach(({ task, depth }) => {
      const row = document.createElement("tr");
      row.className = `task-type-report-row${task.status === "completed" ? " completed" : ""}${depth ? " is-subtask" : ""}`;

      const completedCell = document.createElement("td");
      const completed = document.createElement("span");
      completed.className = "task-detail-completed";
      completed.dataset.completed = String(task.status === "completed");
      completed.textContent = task.status === "completed" ? "✓ Evet" : "Hayır";
      completedCell.append(completed);
      markColumn(completedCell, "completed");

      const taskCell = document.createElement("td");
      const taskLink = document.createElement("a");
      taskLink.className = "task-type-report-task-link";
      taskLink.href = detailUrl(task.id, taskType, selectedStatus);
      taskLink.style.paddingLeft = `${Math.min(depth, 4) * 1.05}rem`;
      taskLink.textContent = `${depth ? "↳ " : ""}${task.title}`;
      taskCell.append(taskLink);
      markColumn(taskCell, "task");

      const parent = task.parentTaskId ? allTasks.find((item) => item.id === task.parentTaskId) : null;
      const parentCell = document.createElement("td");
      if (parent) {
        const parentLink = document.createElement("a");
        parentLink.className = "task-type-report-parent-link";
        parentLink.href = detailUrl(parent.id, taskType, selectedStatus);
        parentLink.textContent = parent.title;
        parentCell.append(parentLink);
      } else parentCell.textContent = "—";
      markColumn(parentCell, "parent");

      const priorityCell = document.createElement("td");
      const priority = document.createElement("span");
      priority.className = "task-priority";
      priority.dataset.priority = task.priority || "none";
      priority.textContent = priorityLabel(task.priority);
      priorityCell.append(priority);
      markColumn(priorityCell, "priority");

      const dueDateCell = document.createElement("td");
      const dueDate = document.createElement("time");
      if (task.dueDate) dueDate.dateTime = task.dueDate;
      dueDate.textContent = formatDate(task.dueDate);
      dueDateCell.append(dueDate);
      markColumn(dueDateCell, "dueDate");

      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "task-status";
      status.dataset.status = task.status;
      status.textContent = statusLabel(task.status);
      statusCell.append(status);
      markColumn(statusCell, "status");

      const actionsCell = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "task-type-report-actions";
      const detailLink = document.createElement("a");
      detailLink.className = "button secondary";
      detailLink.href = detailUrl(task.id, taskType, selectedStatus);
      detailLink.textContent = "Detay";
      const reviseLink = document.createElement("a");
      reviseLink.className = "button primary";
      reviseLink.href = `index.html?view=tasks&editTask=${encodeURIComponent(task.id)}${selectedStatus ? `&taskStatus=${encodeURIComponent(selectedStatus)}` : ""}`;
      reviseLink.textContent = "Revize";
      actions.append(detailLink, reviseLink);
      actionsCell.append(actions);
      markColumn(actionsCell, "actions");

      const cells = new Map([
        ["completed", completedCell],
        ["task", taskCell],
        ["parent", parentCell],
        ["assignee", createCell(task.assignee || "Atanmamış", "assignee")],
        ["priority", priorityCell],
        ["plan", createCell([task.year, task.quarter].filter(Boolean).join(" · ") || "Belirtilmedi", "plan")],
        ["dueDate", dueDateCell],
        ["status", statusCell],
        ["actions", actionsCell]
      ]);
      row.append(...visibleReportColumns().map((column) => cells.get(column.id)).filter(Boolean));
      body.append(row);
    });
    renderReportColumnOptions();
    applyReportFitMode();
  }

  async function initializeTaskTypeReport() {
    try {
      const session = await window.SupabaseCloud.getSession();
      if (!session?.user) throw new Error("Görev raporunu görüntülemek için ana sayfadan Supabase hesabınıza giriş yapın.");
      const bundle = await window.SupabaseCloud.pullBundle();
      const savedTheme = String(bundle.settings?.theme || "violet").toLowerCase();
      const supportedThemes = ["violet", "ocean", "forest", "sunset", "midnight", "graphite", "aurora", "navy", "burgundy"];
      const darkThemes = ["midnight", "graphite", "aurora", "navy", "burgundy"];
      const activeTheme = supportedThemes.includes(savedTheme) ? savedTheme : "violet";
      const colorMode = darkThemes.includes(activeTheme) ? "dark" : "light";
      document.documentElement.dataset.theme = activeTheme;
      document.documentElement.dataset.colorMode = colorMode;
      document.documentElement.style.colorScheme = colorMode;
      reportLayout = loadReportLayout(bundle.settings?.taskTypeReportLayout);
      window.CloudDataRuntime.suspend(() => {
        const result = window.TaskStore.replaceAll(bundle.tasks || []);
        if (!result.valid) throw new Error("Supabase görev verileri doğrulanamadı.");
      });
      renderTaskTypeReport();
    } catch (error) {
      $("#taskTypeReportErrorTitle").textContent = "Supabase verileri açılamadı";
      $("#taskTypeReportErrorMessage").textContent = error.message;
      $("#taskTypeReportError").classList.remove("hidden");
    }
  }

  $("#taskTypeReportFitToggle").addEventListener("click", () => {
    reportLayout.fitScreen = !reportLayout.fitScreen;
    applyReportFitMode();
    saveReportLayout(`Ekrana sığdır modu ${reportLayout.fitScreen ? "açıldı" : "kapatıldı"}.`);
  });
  $("#resetTaskTypeReportColumns").addEventListener("click", () => {
    reportLayout = loadReportLayout();
    renderTaskTypeReport();
    saveReportLayout("Kolon görünümü varsayılan düzene döndürüldü.");
  });

  initializeTaskTypeReport();
})();
