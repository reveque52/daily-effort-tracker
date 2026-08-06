(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const form = $("#effortForm");
  const fields = {
    id: $("#entryId"), date: $("#dateInput"), project: $("#projectInput"),
    description: $("#descriptionInput"), hours: $("#hoursInput")
  };
  let entries = [];

  const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const shortMonthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short" });
  const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
  const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  const isoToday = () => new Date().toLocaleDateString("en-CA");
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const formatHours = (value) => `${numberFormatter.format(Number(value) || 0)} sa`;

  function googleCalendarUrl(entry) {
    const start = entry.date.replaceAll("-", "");
    const nextDay = parseDate(entry.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = [nextDay.getFullYear(), String(nextDay.getMonth() + 1).padStart(2, "0"), String(nextDay.getDate()).padStart(2, "0")].join("");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${entry.project} – ${formatHours(entry.hours)}`,
      dates: `${start}/${end}`,
      details: `${entry.task || entry.description || ""}\n\nKaydedilen efor: ${formatHours(entry.hours)}`
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
      card.querySelector(".calendar-button").addEventListener("click", () => {
        window.open(googleCalendarUrl(entry), "_blank", "noopener,noreferrer");
      });
      card.querySelector(".edit-button").addEventListener("click", () => startEdit(entry));
      card.querySelector(".delete-button").addEventListener("click", () => {
        if (confirm(`“${entry.project}” kaydı silinsin mi?`)) { removeEntry(entry.id); render(); backupAndReport("Silme işlemi Drive’a gönderildi."); }
      });
      list.append(card);
    });
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

  function setDriveBusy(busy) {
    ["#saveDriveSettings", "#backupToDrive", "#restoreFromDrive", "#initialRestoreButton"].forEach((selector) => {
      $(selector).disabled = busy;
    });
  }

  async function backupAndReport(message = "Kayıt Drive’a otomatik gönderildi.") {
    setDriveStatus("Veriler Google Drive’a gönderiliyor…");
    try {
      const result = await window.DriveSync.backup(readEntries());
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
    window.DriveSync.backup(readEntries(), { silent: true, keepalive: true }).catch(() => {});
  }

  async function restoreFromDrive() {
    const backup = await window.DriveSync.restore();
    if (readEntries().length && !confirm(`Drive yedeğindeki ${backup.entries.length} kayıt mevcut yerel kayıtların yerine yüklensin mi?`)) {
      setDriveStatus("Geri yükleme iptal edildi.");
      return;
    }
    const result = getStore().replaceAll(backup.entries);
    if (!result.valid) throw new Error(Object.values(result.errors || {}).join(" ") || "Yedek doğrulanamadı.");
    render();
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
  render();
})();
