(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  const statusLabel = (status) => ({ planned: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı" })[status] || status;
  const priorityLabel = (priority) => ({ high: "Yüksek", medium: "Orta", low: "Düşük" })[priority] || "Belirtilmedi";
  const taskTypeLabel = (taskType) => ({
    standard: "Standart görev",
    architecture_roadmap: "Architecture Roadmap",
    meeting_organization: "Toplantı organizasyonu",
    management_request: "Yönetim talebi",
    other: "Diğer"
  })[taskType] || "Standart görev";

  function sanitizeTaskHtml(input) {
    const template = document.createElement("template");
    template.innerHTML = String(input || "");
    const allowedTags = new Set(["P", "DIV", "BR", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "CODE", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR", "SPAN"]);
    const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "META", "LINK"]);
    Array.from(template.content.querySelectorAll("*")).forEach((element) => {
      if (blockedTags.has(element.tagName)) { element.remove(); return; }
      if (!allowedTags.has(element.tagName)) { element.replaceWith(...element.childNodes); return; }
      const safeHref = element.tagName === "A" ? element.getAttribute("href") || "" : "";
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
      if (element.tagName !== "A") return;
      try {
        const url = new URL(safeHref, document.baseURI);
        if (["http:", "https:", "mailto:"].includes(url.protocol)) {
          element.href = url.href;
          element.target = "_blank";
          element.rel = "noopener noreferrer";
        }
      } catch { /* Geçersiz bağlantı düz metin olarak kalır. */ }
    });
    return template.innerHTML;
  }

  function formatDate(value) {
    if (!value) return "Belirtilmedi";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "Belirtilmedi" : dateFormatter.format(date);
  }

  function formatDateTime(value) {
    if (!value) return "Belirtilmedi";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Belirtilmedi" : dateTimeFormatter.format(date);
  }

  function formatDocumentSize(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  }

  function safeDocumentUrl(attachment) {
    const value = String(attachment?.webViewLink || attachment?.webContentLink || "").trim();
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
  }

  function taskUrl(taskId) {
    return `task-detail.html?id=${encodeURIComponent(taskId)}`;
  }

  function renderTaskDetail() {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("id") || "";
    const fromType = params.get("fromType") || "";
    const requestedStatus = params.get("fromStatus") || "";
    const fromStatus = ["planned", "in_progress", "completed"].includes(requestedStatus) ? requestedStatus : "";
    const task = window.TaskStore.get(taskId);
    if (!task) {
      $("#taskDetailPageError").classList.remove("hidden");
      return;
    }

    const tasks = window.TaskStore.list();
    const parent = task.parentTaskId ? tasks.find((item) => item.id === task.parentTaskId) : null;
    const subtasks = tasks.filter((item) => item.parentTaskId === task.id);
    document.title = `${task.title} · Görev Detayı`;
    if (window.TaskStore.TASK_TYPES.includes(fromType)) {
      $("#taskDetailBackLink").href = `task-type-report.html?type=${encodeURIComponent(fromType)}${fromStatus ? `&status=${encodeURIComponent(fromStatus)}` : ""}`;
      $("#taskDetailBackLink").textContent = `← ${taskTypeLabel(fromType)} raporuna dön`;
    }
    $("#taskDetailPageContent").classList.remove("hidden");
    $("#detailPageTitle").textContent = task.title;

    const type = $("#detailPageTaskType");
    type.textContent = taskTypeLabel(task.taskType);
    type.dataset.type = task.taskType || "standard";
    const priority = $("#detailPagePriority");
    priority.textContent = priorityLabel(task.priority);
    priority.dataset.priority = task.priority || "none";
    const status = $("#detailPageStatus");
    status.textContent = statusLabel(task.status);
    status.dataset.status = task.status;

    $("#detailPageCompleted").textContent = task.status === "completed" ? "✓ Evet" : "Hayır";
    $("#detailPageCompleted").dataset.completed = String(task.status === "completed");
    $("#detailPageOverviewTask").textContent = task.title;
    $("#detailPageAssignee").textContent = task.assignee || "Atanmamış";
    const priorityValue = $("#detailPagePriorityValue");
    priorityValue.textContent = priorityLabel(task.priority);
    priorityValue.dataset.priority = task.priority || "none";
    $("#detailPagePlan").textContent = [task.year, task.quarter].filter(Boolean).join(" · ") || "Belirtilmedi";
    const dueDate = $("#detailPageDueDate");
    if (task.dueDate) dueDate.dateTime = task.dueDate;
    dueDate.textContent = formatDate(task.dueDate);
    const statusValue = $("#detailPageStatusValue");
    statusValue.textContent = statusLabel(task.status);
    statusValue.dataset.status = task.status;
    $("#detailPageCreatedAt").textContent = formatDateTime(task.createdAt);
    $("#detailPageUpdatedAt").textContent = formatDateTime(task.updatedAt);

    $("#detailPageRevise").href = `index.html?view=tasks&editTask=${encodeURIComponent(task.id)}`;
    $("#detailPageAddSubtask").href = `index.html?view=tasks&parentTask=${encodeURIComponent(task.id)}`;
    const parentLink = $("#detailPageParent");
    if (parent) {
      parentLink.href = taskUrl(parent.id);
      parentLink.textContent = parent.title;
    } else {
      parentLink.removeAttribute("href");
      parentLink.textContent = "—";
      parentLink.classList.add("is-empty");
    }

    const description = $("#detailPageDescription");
    description.innerHTML = sanitizeTaskHtml(task.descriptionHtml);
    if (!description.textContent.trim()) description.textContent = "Bu görev için detaylı açıklama girilmemiş.";

    const attachments = Array.isArray(task.attachments) ? task.attachments : [];
    $("#detailPageDocumentCount").textContent = String(attachments.length);
    const documentList = $("#detailPageDocumentList");
    if (!attachments.length) {
      const empty = document.createElement("p");
      empty.className = "task-detail-document-empty";
      empty.textContent = "Bu göreve henüz doküman eklenmedi.";
      documentList.append(empty);
    } else {
      attachments.forEach((attachment) => {
        const url = safeDocumentUrl(attachment);
        const card = document.createElement(url ? "a" : "div");
        card.className = "task-detail-page-document";
        if (url) {
          card.href = url;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
        }
        const icon = document.createElement("span");
        icon.className = "task-detail-document-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "↗";
        const copy = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = attachment.name || "İsimsiz doküman";
        const meta = document.createElement("small");
        meta.textContent = [formatDocumentSize(attachment.size), attachment.mimeType || "Dosya", formatDateTime(attachment.uploadedAt)].join(" · ");
        copy.append(name, meta);
        card.append(icon, copy);
        documentList.append(card);
      });
    }

    $("#detailPageSubtaskCount").textContent = String(subtasks.length);
    const subtaskList = $("#detailPageSubtaskList");
    if (!subtasks.length) {
      const empty = document.createElement("p");
      empty.className = "task-detail-subtask-empty";
      empty.textContent = "Bu göreve henüz alt görev eklenmedi.";
      subtaskList.append(empty);
      return;
    }
    subtasks.forEach((subtask) => {
      const link = document.createElement("a");
      link.className = "task-detail-page-subtask";
      link.href = taskUrl(subtask.id);
      const title = document.createElement("strong");
      title.textContent = subtask.title;
      const meta = document.createElement("span");
      meta.textContent = `${statusLabel(subtask.status)} · ${priorityLabel(subtask.priority)} · ${subtask.assignee || "Atanmamış"}`;
      link.append(title, meta);
      subtaskList.append(link);
    });
  }

  renderTaskDetail();
})();
