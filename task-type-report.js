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

  function createCell(text, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
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
    $(".task-type-report-scroll").classList.toggle("hidden", reportTasks.length === 0);

    const body = $("#taskTypeReportBody");
    orderTasksByHierarchy(reportTasks).forEach(({ task, depth }) => {
      const row = document.createElement("tr");
      row.className = `task-type-report-row${task.status === "completed" ? " completed" : ""}${depth ? " is-subtask" : ""}`;

      const completedCell = document.createElement("td");
      const completed = document.createElement("span");
      completed.className = "task-detail-completed";
      completed.dataset.completed = String(task.status === "completed");
      completed.textContent = task.status === "completed" ? "✓ Evet" : "Hayır";
      completedCell.append(completed);

      const taskCell = document.createElement("td");
      const taskLink = document.createElement("a");
      taskLink.className = "task-type-report-task-link";
      taskLink.href = detailUrl(task.id, taskType, selectedStatus);
      taskLink.style.paddingLeft = `${Math.min(depth, 4) * 1.05}rem`;
      taskLink.textContent = `${depth ? "↳ " : ""}${task.title}`;
      taskCell.append(taskLink);

      const parent = task.parentTaskId ? allTasks.find((item) => item.id === task.parentTaskId) : null;
      const parentCell = document.createElement("td");
      if (parent) {
        const parentLink = document.createElement("a");
        parentLink.className = "task-type-report-parent-link";
        parentLink.href = detailUrl(parent.id, taskType, selectedStatus);
        parentLink.textContent = parent.title;
        parentCell.append(parentLink);
      } else parentCell.textContent = "—";

      const priorityCell = document.createElement("td");
      const priority = document.createElement("span");
      priority.className = "task-priority";
      priority.dataset.priority = task.priority || "none";
      priority.textContent = priorityLabel(task.priority);
      priorityCell.append(priority);

      const dueDateCell = document.createElement("td");
      const dueDate = document.createElement("time");
      if (task.dueDate) dueDate.dateTime = task.dueDate;
      dueDate.textContent = formatDate(task.dueDate);
      dueDateCell.append(dueDate);

      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "task-status";
      status.dataset.status = task.status;
      status.textContent = statusLabel(task.status);
      statusCell.append(status);

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

      row.append(
        completedCell,
        taskCell,
        parentCell,
        createCell(task.assignee || "Atanmamış"),
        priorityCell,
        createCell([task.year, task.quarter].filter(Boolean).join(" · ") || "Belirtilmedi"),
        dueDateCell,
        statusCell,
        actionsCell
      );
      body.append(row);
    });
  }

  async function initializeTaskTypeReport() {
    try {
      const session = await window.SupabaseCloud.getSession();
      if (!session?.user) throw new Error("Görev raporunu görüntülemek için ana sayfadan Supabase hesabınıza giriş yapın.");
      const bundle = await window.SupabaseCloud.pullBundle();
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

  initializeTaskTypeReport();
})();
