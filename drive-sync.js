(() => {
  "use strict";

  const SCOPE = [
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.file"
  ].join(" ");
  const FILE_NAME = "daily-effort-tracker.json";
  const DOCUMENT_ROOT_NAME = "Günlük Efor Takibi Dokümanları";
  const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
  const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024;
  const MAX_DOCUMENTS_PER_UPLOAD = 10;
  let tokenClient;
  let accessToken = "";
  let clientIdValue = "";
  let lastBackupTime = "";
  // LAST_BACKUP_KEY kalıcı tarayıcı anahtarı kaldırıldı; değer Supabase user_settings üzerinden belleğe yüklenir.

  const getClientId = () => clientIdValue;
  const getLastBackupTime = () => lastBackupTime;
  const rememberBackupTime = (value) => {
    lastBackupTime = String(value || "");
  };

  function setClientId(value) {
    const clientId = String(value || "").trim();
    if (clientId && !clientId.endsWith(".apps.googleusercontent.com")) {
      throw new Error("Geçerli bir Google OAuth Client ID girin.");
    }
    clientIdValue = clientId;
    tokenClient = undefined;
    accessToken = "";
  }

  function authorize(options = {}) {
    const clientId = getClientId();
    if (!clientId) return Promise.reject(new Error("Önce Google OAuth Client ID’nizi kaydedin."));
    if (!window.google?.accounts?.oauth2) return Promise.reject(new Error("Google oturum kütüphanesi yüklenemedi."));
    if (accessToken) return Promise.resolve(accessToken);

    return new Promise((resolve, reject) => {
      const callback = (response) => {
        if (response.error) reject(new Error(response.error_description || response.error));
        else { accessToken = response.access_token; resolve(accessToken); }
      };
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback,
          error_callback: (error) => reject(new Error(error.message || error.type || "Google yetkilendirmesi tamamlanamadı."))
        });
      } else tokenClient.callback = callback;
      const prompt = options.silent ? "" : (accessToken ? "" : "consent");
      tokenClient.requestAccessToken({ prompt });
    });
  }

  async function driveFetch(url, options = {}) {
    const token = accessToken || await authorize();
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!response.ok) {
      if (response.status === 401) accessToken = "";
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error?.message || `Google Drive hatası (${response.status}).`);
    }
    return response;
  }

  async function findBackup(options = {}) {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name='${FILE_NAME}' and trashed=false`,
      orderBy: "modifiedTime desc",
      pageSize: "1",
      fields: "files(id,name,modifiedTime)"
    });
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`, { keepalive: Boolean(options.keepalive) });
    return (await response.json()).files?.[0] || null;
  }

  async function backup(data, options = {}) {
    await authorize({ silent: Boolean(options.silent) });
    const bundle = Array.isArray(data) ? { entries: data, tasks: [] } : {
      entries: Array.isArray(data?.entries) ? data.entries : [],
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      people: Array.isArray(data?.people) ? data.people : [],
      jiraItems: Array.isArray(data?.jiraItems) ? data.jiraItems : [],
      reminders: Array.isArray(data?.reminders) ? data.reminders : []
    };
    const payload = JSON.stringify({ version: 5, exportedAt: new Date().toISOString(), ...bundle }, null, 2);
    let file = await findBackup(options);
    if (!file) {
      const created = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime", {
        method: "POST",
        keepalive: Boolean(options.keepalive),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" })
      });
      file = await created.json();
    }
    const uploaded = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(file.id)}?uploadType=media&fields=id,name,modifiedTime`, {
      method: "PATCH",
      keepalive: Boolean(options.keepalive),
      headers: { "Content-Type": "application/json" },
      body: payload
    });
    const result = await uploaded.json();
    rememberBackupTime(result.modifiedTime);
    return result;
  }

  async function restore(options = {}) {
    await authorize({ silent: Boolean(options.silent) });
    const file = await findBackup(options);
    if (!file) throw new Error("Google Drive’da daha önce oluşturulmuş bir yedek bulunamadı.");
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
    const payload = await response.json();
    if (![1, 2, 3, 4, 5].includes(payload.version) || !Array.isArray(payload.entries)) throw new Error("Drive yedeğinin biçimi geçersiz.");
    rememberBackupTime(file.modifiedTime);
    return {
      file,
      entries: payload.entries,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      people: Array.isArray(payload.people) ? payload.people : [],
      jiraItems: Array.isArray(payload.jiraItems) ? payload.jiraItems : [],
      reminders: Array.isArray(payload.reminders) ? payload.reminders : [],
      exportedAt: payload.exportedAt
    };
  }

  async function getBackupInfo() {
    await authorize();
    const file = await findBackup();
    if (file?.modifiedTime) rememberBackupTime(file.modifiedTime);
    return file;
  }

  function escapeDriveQueryValue(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  async function findFolder(query) {
    const params = new URLSearchParams({
      spaces: "drive",
      q: `${query} and trashed=false`,
      orderBy: "createdTime asc",
      pageSize: "1",
      fields: "files(id,name,webViewLink)"
    });
    const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    return (await response.json()).files?.[0] || null;
  }

  async function createFolder(metadata) {
    const response = await driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...metadata, mimeType: DRIVE_FOLDER_MIME })
    });
    return response.json();
  }

  async function findOrCreateDocumentRoot() {
    const marker = "daily-effort-tracker-task-documents";
    const query = `mimeType='${DRIVE_FOLDER_MIME}' and appProperties has { key='dailyEffortTracker' and value='${marker}' }`;
    return await findFolder(query) || createFolder({
      name: DOCUMENT_ROOT_NAME,
      appProperties: { dailyEffortTracker: marker }
    });
  }

  async function findOrCreateTaskFolder(task) {
    const root = await findOrCreateDocumentRoot();
    const taskId = escapeDriveQueryValue(task.taskId);
    const query = `mimeType='${DRIVE_FOLDER_MIME}' and '${escapeDriveQueryValue(root.id)}' in parents and appProperties has { key='dailyEffortTrackerTaskId' and value='${taskId}' }`;
    const existing = await findFolder(query);
    if (existing) return existing;
    const safeTitle = String(task.title || "İsimsiz görev").trim().replace(/[\r\n]+/g, " ").slice(0, 180);
    return createFolder({
      name: `Görev - ${safeTitle}`,
      parents: [root.id],
      appProperties: {
        dailyEffortTracker: "task-document-folder",
        dailyEffortTrackerTaskId: String(task.taskId)
      }
    });
  }

  function validateDocumentFiles(files) {
    const rows = Array.from(files || []);
    if (!rows.length) throw new Error("Yüklenecek doküman seçilmedi.");
    if (rows.length > MAX_DOCUMENTS_PER_UPLOAD) throw new Error(`Tek seferde en fazla ${MAX_DOCUMENTS_PER_UPLOAD} doküman yükleyebilirsiniz.`);
    rows.forEach((file) => {
      if (!(file instanceof Blob) || !file.name) throw new Error("Geçersiz bir doküman seçildi.");
      if (file.size <= 0) throw new Error(`“${file.name}” dosyası boş.`);
      if (file.size > MAX_DOCUMENT_SIZE) throw new Error(`“${file.name}” 100 MB sınırını aşıyor.`);
    });
    return rows;
  }

  async function uploadTaskDocument(task, folder, file) {
    const mimeType = file.type || "application/octet-stream";
    const session = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(file.size)
      },
      body: JSON.stringify({
        name: file.name,
        parents: [folder.id],
        mimeType,
        appProperties: {
          dailyEffortTracker: "task-document",
          dailyEffortTrackerTaskId: String(task.taskId)
        }
      })
    });
    const uploadUrl = session.headers.get("Location");
    if (!uploadUrl) throw new Error("Google Drive yükleme oturumu başlatılamadı.");
    const uploaded = await driveFetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: file
    });
    const result = await uploaded.json();
    return {
      id: result.id,
      name: result.name || file.name,
      mimeType: result.mimeType || mimeType,
      size: Number(result.size || file.size),
      webViewLink: result.webViewLink || "",
      webContentLink: result.webContentLink || "",
      uploadedAt: result.modifiedTime || new Date().toISOString()
    };
  }

  async function uploadTaskDocuments(task, files, onProgress) {
    const taskId = String(task?.taskId || "").trim();
    const title = String(task?.title || "").trim();
    if (!taskId || !title) throw new Error("Doküman yüklemek için önce geçerli bir görev başlığı girin.");
    const rows = validateDocumentFiles(files);
    await authorize();
    const folder = await findOrCreateTaskFolder({ taskId, title });
    const uploaded = [];
    for (let index = 0; index < rows.length; index += 1) {
      onProgress?.({ current: index + 1, total: rows.length, file: rows[index] });
      uploaded.push(await uploadTaskDocument({ taskId, title }, folder, rows[index]));
    }
    return uploaded;
  }

  const hasAccessToken = () => Boolean(accessToken);

  window.DriveSync = Object.freeze({
    getClientId, setClientId, getLastBackupTime, setLastBackupTime: rememberBackupTime, hasAccessToken, authorize,
    getBackupInfo, backup, restore, uploadTaskDocuments
  });
})();
