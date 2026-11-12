(function () {
  const BUNNY_CDN_BASE = "https://vz-ada4eb16-135.b-cdn.net";
  const STORAGE_OVERRIDE_KEY = "mg_webflow_field_override_v1";
  const SESSION_TOKEN_KEY = "mg_uploader_token_v1";
  const TARGET_MAX_BYTES = 1.4 * 1024 * 1024;
  const HARD_MAX_BYTES = 3.7 * 1024 * 1024;

  const state = {
    authenticated: false,
    sessionToken: loadSessionToken(),
    bootstrap: null,
    projects: [],
    selectedProjectId: "",
    queue: [],
    isUploading: false,
    focusEditingId: null,
    draggedId: null,
    fieldOverride: loadFieldOverride(),
  };

  const els = {
    authGate: document.getElementById("authGate"),
    loginForm: document.getElementById("loginForm"),
    passwordInput: document.getElementById("passwordInput"),
    loginBtn: document.getElementById("loginBtn"),
    loginError: document.getElementById("loginError"),

    appShell: document.getElementById("appShell"),
    siteBadge: document.getElementById("siteBadge"),
    schemaBtn: document.getElementById("schemaBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    globalBanner: document.getElementById("globalBanner"),

    projectSearch: document.getElementById("projectSearch"),
    projectSelect: document.getElementById("projectSelect"),
    projectMeta: document.getElementById("projectMeta"),
    compressionPreset: document.getElementById("compressionPreset"),
    publishMode: document.getElementById("publishMode"),

    dropZone: document.getElementById("dropZone"),
    fileInput: document.getElementById("fileInput"),
    browseBtn: document.getElementById("browseBtn"),
    addVideoBtn: document.getElementById("addVideoBtn"),

    queueSection: document.getElementById("queueSection"),
    queueHeading: document.getElementById("queueHeading"),
    queueStats: document.getElementById("queueStats"),
    queueGrid: document.getElementById("queueGrid"),
    toggleAllDesktopBtn: document.getElementById("toggleAllDesktopBtn"),
    toggleAllMobileBtn: document.getElementById("toggleAllMobileBtn"),
    clearQueueBtn: document.getElementById("clearQueueBtn"),

    actionBar: document.getElementById("actionBar"),
    progressSummary: document.getElementById("progressSummary"),
    progressFill: document.getElementById("progressFill"),
    retryFailedBtn: document.getElementById("retryFailedBtn"),
    uploadBtn: document.getElementById("uploadBtn"),

    focusModal: document.getElementById("focusModal"),
    focusStage: document.getElementById("focusStage"),
    focusPreviewImg: document.getElementById("focusPreviewImg"),
    focusCrosshair: document.getElementById("focusCrosshair"),
    focusCoordsText: document.getElementById("focusCoordsText"),
    closeFocusModalBtn: document.getElementById("closeFocusModalBtn"),
    resetFocusBtn: document.getElementById("resetFocusBtn"),
    doneFocusBtn: document.getElementById("doneFocusBtn"),

    schemaModal: document.getElementById("schemaModal"),
    schemaBody: document.getElementById("schemaBody"),
    closeSchemaModalBtn: document.getElementById("closeSchemaModalBtn"),
    resetSchemaBtn: document.getElementById("resetSchemaBtn"),
    saveSchemaBtn: document.getElementById("saveSchemaBtn"),
  };

  function loadSessionToken() {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveSessionToken(token) {
    state.sessionToken = token || "";
    try {
      if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      else sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch { }
  }

  function loadFieldOverride() {
    try {
      const raw = localStorage.getItem(STORAGE_OVERRIDE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveFieldOverride(val) {
    state.fieldOverride = val;
    try {
      if (val) localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(val));
      else localStorage.removeItem(STORAGE_OVERRIDE_KEY);
    } catch { }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function padTwo(n) {
    return String(Math.max(0, Math.round(n))).padStart(2, "0");
  }

  function extractVideoId(input) {
    const trimmed = String(input || "").trim();
    const match = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match ? match[0] : trimmed;
  }

  function getSelectedProject() {
    return state.projects.find((p) => p.id === state.selectedProjectId) || null;
  }

  function showBanner(message, type = "ok") {
    els.globalBanner.textContent = message;
    els.globalBanner.className = `banner is-${type}`;
    els.globalBanner.hidden = false;
  }

  function hideBanner() {
    els.globalBanner.hidden = true;
    els.globalBanner.textContent = "";
  }

  async function apiJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.sessionToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${state.sessionToken}`);
    }
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data?.code === "AUTH_REQUIRED") {
      saveSessionToken("");
      setAuthenticated(false, data?.error || "Session expired. Please sign in again.");
    }
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function setAuthenticated(isAuthed, loginMessage = "") {
    state.authenticated = isAuthed;
    els.authGate.hidden = isAuthed;
    els.appShell.hidden = !isAuthed;
    if (!isAuthed) {
      if (loginMessage) {
        els.loginError.textContent = loginMessage;
        els.loginError.hidden = false;
      }
      els.passwordInput.focus();
    } else {
      els.loginError.hidden = true;
      els.loginError.textContent = "";
    }
  }

  async function checkInitialAuth() {
    try {
      const data = await apiJson("/api/auth");
      if (data.authenticated) {
        setAuthenticated(true);
        await loadBootstrap();
      } else {
        setAuthenticated(false);
      }
    } catch (err) {
      setAuthenticated(false);
      els.loginError.textContent = err.message;
      els.loginError.hidden = false;
    }
  }

  async function loadBootstrap() {
    els.siteBadge.textContent = "Loading Webflow CMS…";
    els.siteBadge.className = "status-pill";
    hideBanner();

    try {
      const data = await apiJson("/api/bootstrap");
      state.bootstrap = data;
      state.projects = data.projects || [];

      els.siteBadge.textContent = `${data.site.displayName} · Ready`;
      els.siteBadge.className = "status-pill is-ok";

      const effectiveMap = getEffectiveFieldMap();
      if (!effectiveMap?.media?.image || (!effectiveMap?.media?.parent && !effectiveMap?.projects?.gallery)) {
        showBanner(
          "Warning: Required Media/Project link fields could not be auto-detected. Open 'Field Mapping' to verify your field slugs before uploading.",
          "warn"
        );
      }

      renderProjectOptions();
      renderQueue();
    } catch (err) {
      els.siteBadge.textContent = "Connection Error";
      els.siteBadge.className = "status-pill is-err";
      showBanner(err.message, "err");
    }
  }

  function getEffectiveFieldMap() {
    const base = state.bootstrap?.fieldMap;
    if (!base) return null;
    if (!state.fieldOverride) return base;
    return {
      projects: { ...base.projects, ...(state.fieldOverride.projects || {}) },
      media: { ...base.media, ...(state.fieldOverride.media || {}) },
    };
  }

  function renderProjectOptions() {
    const query = els.projectSearch.value.trim().toLowerCase();
    const filtered = state.projects.filter((p) => {
      if (!query) return true;
      return `${p.sequence} ${p.client} ${p.name} ${p.subtitle} ${p.slug}`
        .toLowerCase()
        .includes(query);
    });

    const prevId = state.selectedProjectId;
    els.projectSelect.innerHTML = "";

    if (!filtered.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No matching projects";
      els.projectSelect.appendChild(opt);
      state.selectedProjectId = "";
      updateProjectMeta();
      return;
    }

    for (const p of filtered) {
      const opt = document.createElement("option");
      opt.value = p.id;
      const seqLabel = p.sequence !== "" ? padTwo(p.sequence) : "--";
      const titlePart = p.subtitle && p.subtitle !== p.name ? `${p.name} — ${p.subtitle}` : p.name;
      const draftTag = p.isDraft ? " [Draft]" : "";
      opt.textContent = `${seqLabel} · ${titlePart} (${p.existingSlideCount} slides)${draftTag}`;
      els.projectSelect.appendChild(opt);
    }

    const stillExists = filtered.some((p) => p.id === prevId);
    state.selectedProjectId = stillExists ? prevId : filtered[0].id;
    els.projectSelect.value = state.selectedProjectId;
    updateProjectMeta();
  }

  function updateProjectMeta() {
    const p = getSelectedProject();
    if (!p) {
      els.projectMeta.textContent = "No project selected.";
      return;
    }
    const statusText = p.isDraft ? "Draft project" : "Staged/Live project";
    els.projectMeta.textContent = `${statusText} · Currently ${p.existingSlideCount} slide(s) · New slides start at Order #${p.nextOrder}`;
  }

  function getPresetConfig() {
    const val = els.compressionPreset.value;
    if (val === "webp-3000") return { mime: "image/webp", ext: "webp", maxEdge: 3000 };
    if (val === "jpeg-2400") return { mime: "image/jpeg", ext: "jpg", maxEdge: 2400 };
    if (val === "jpeg-3000") return { mime: "image/jpeg", ext: "jpg", maxEdge: 3000 };
    return { mime: "image/webp", ext: "webp", maxEdge: 2400 };
  }

  async function loadBitmap(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file);
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  async function compressImageFile(file, preset) {
    const bitmap = await loadBitmap(file);
    const origW = bitmap.width;
    const origH = bitmap.height;

    let scale = 1;
    const longest = Math.max(origW, origH);
    if (longest > preset.maxEdge) {
      scale = preset.maxEdge / longest;
    }

    let targetW = Math.max(1, Math.round(origW * scale));
    let targetH = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let mime = preset.mime;
    let ext = preset.ext;
    let bestBlob = null;

    const qualities = [0.86, 0.78, 0.7, 0.6];

    for (let shrinkPass = 0; shrinkPass < 3; shrinkPass += 1) {
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);

      for (const q of qualities) {
        let blob = await canvasToBlob(canvas, mime, q);
        if ((!blob || blob.type !== mime) && mime === "image/webp") {
          mime = "image/jpeg";
          ext = "jpg";
          blob = await canvasToBlob(canvas, mime, q);
        }
        if (!blob) continue;
        bestBlob = blob;
        if (blob.size <= TARGET_MAX_BYTES) break;
      }

      if (bestBlob && bestBlob.size <= HARD_MAX_BYTES) break;
      targetW = Math.max(1, Math.round(targetW * 0.8));
      targetH = Math.max(1, Math.round(targetH * 0.8));
    }

    if (typeof bitmap.close === "function") {
      bitmap.close();
    }

    if (!bestBlob || bestBlob.size > HARD_MAX_BYTES) {
      throw new Error("Could not compress image under Webflow's 4 MB limit.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "slide";
    const compressedName = `${baseName}.${ext}`;
    const bytes = new Uint8Array(await bestBlob.arrayBuffer());
    const fileHash = window.mgMd5Hex(bytes);

    return {
      blob: bestBlob,
      fileName: compressedName,
      fileHash,
      width: targetW,
      height: targetH,
      compressedSize: bestBlob.size,
    };
  }

  function makeQueueId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async function addFilesToQueue(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    // Sort dropped batch naturally by filename so IMG_01, IMG_02 stay in sequence
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    const newItems = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        id: makeQueueId(),
        kind: "image",
        file,
        previewUrl,
        name: file.name.replace(/\.[^.]+$/, ""),
        alt: "",
        origSize: file.size,
        compressed: null,
        uploadedAsset: null,
        fillDesktop: false,
        fillMobile: false,
        focusX: 50,
        focusY: 50,
        status: "compressing", // compressing | ready | uploading | uploaded | error
        error: "",
      };
    });

    state.queue.push(...newItems);
    renderQueue();

    const preset = getPresetConfig();
    await runWithConcurrency(newItems, 2, async (item) => {
      try {
        item.compressed = await compressImageFile(item.file, preset);
        item.status = "ready";
      } catch (err) {
        item.status = "error";
        item.error = err?.message || "Compression failed";
      }
      renderQueue();
    });
  }

  function addVideoSlideToQueue() {
    const raw = window.prompt("Paste Bunny Stream Video ID (UUID) or URL:");
    if (!raw || !raw.trim()) return;
    const videoId = extractVideoId(raw);
    if (!videoId) return;

    state.queue.push({
      id: makeQueueId(),
      kind: "video",
      videoId,
      previewUrl: `${BUNNY_CDN_BASE}/${videoId}/thumbnail.jpg`,
      name: `Video ${videoId.slice(0, 8)}`,
      alt: "",
      fillDesktop: false,
      fillMobile: false,
      focusX: 50,
      focusY: 50,
      status: "ready",
      error: "",
    });
    renderQueue();
  }

  function removeQueueItem(id) {
    const idx = state.queue.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [removed] = state.queue.splice(idx, 1);
    if (removed?.previewUrl && removed.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    renderQueue();
  }

  function clearQueue() {
    for (const item of state.queue) {
      if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
    state.queue = [];
    renderQueue();
  }

  function moveQueueItem(fromIndex, toIndex) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= state.queue.length) return;
    const [item] = state.queue.splice(fromIndex, 1);
    state.queue.splice(toIndex, 0, item);
    renderQueue();
  }

  async function runWithConcurrency(items, limit, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const current = items[cursor];
        cursor += 1;
        await worker(current);
      }
    });
    await Promise.all(runners);
  }

  function renderQueue() {
    const hasItems = state.queue.length > 0;
    els.queueSection.hidden = !hasItems;
    els.actionBar.hidden = !hasItems;

    if (!hasItems) {
      els.queueGrid.innerHTML = "";
      return;
    }

    const project = getSelectedProject();
    const startOrder = project ? project.nextOrder : 1;

    let totalOrig = 0;
    let totalCompressed = 0;
    let compressingCount = 0;
    let errorCount = 0;
    let doneCount = 0;

    for (const item of state.queue) {
      if (item.kind === "image") {
        totalOrig += item.origSize || 0;
        totalCompressed += item.compressed?.compressedSize || 0;
      }
      if (item.status === "compressing") compressingCount += 1;
      if (item.status === "error") errorCount += 1;
      if (item.status === "uploaded") doneCount += 1;
    }

    els.queueHeading.textContent = `Queued Slides (${state.queue.length})`;
    els.queueStats.textContent = totalCompressed > 0
      ? `${formatBytes(totalOrig)} raw → ${formatBytes(totalCompressed)} compressed`
      : "Preparing…";

    els.retryFailedBtn.hidden = errorCount === 0 || state.isUploading;
    els.uploadBtn.disabled = state.isUploading || compressingCount > 0 || !project;
    els.uploadBtn.textContent = compressingCount > 0
      ? `Compressing (${compressingCount})…`
      : state.isUploading
        ? "Uploading…"
        : `Upload & Add ${state.queue.length} Slide${state.queue.length === 1 ? "" : "s"}`;

    if (!state.isUploading && compressingCount === 0) {
      if (errorCount > 0) {
        els.progressSummary.textContent = `${errorCount} item(s) need attention before creating slides.`;
      } else {
        els.progressSummary.textContent = `Ready · Will add slides #${padTwo(startOrder)}–#${padTwo(startOrder + state.queue.length - 1)} to ${project?.name || "project"}`;
      }
      els.progressFill.style.width = `${Math.round((doneCount / state.queue.length) * 100)}%`;
    }

    els.queueGrid.innerHTML = "";
    state.queue.forEach((item, idx) => {
      const targetOrder = startOrder + idx;
      const card = document.createElement("article");
      card.className = `slide-card${item.status === "uploaded" ? " is-done" : ""}${item.status === "error" ? " is-error" : ""}`;
      card.draggable = !state.isUploading;
      card.dataset.id = item.id;

      // Drag reorder handlers
      card.addEventListener("dragstart", (e) => {
        if (state.isUploading) {
          e.preventDefault();
          return;
        }
        state.draggedId = item.id;
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        state.draggedId = null;
        card.classList.remove("is-dragging");
        document.querySelectorAll(".slide-card.is-drag-target").forEach((el) => el.classList.remove("is-drag-target"));
      });
      card.addEventListener("dragover", (e) => {
        if (!state.draggedId || state.draggedId === item.id) return;
        e.preventDefault();
        card.classList.add("is-drag-target");
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("is-drag-target");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("is-drag-target");
        if (!state.draggedId || state.draggedId === item.id) return;
        const fromIdx = state.queue.findIndex((x) => x.id === state.draggedId);
        if (fromIdx !== -1) moveQueueItem(fromIdx, idx);
      });

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "slide-thumb-wrap";

      if (item.kind === "video") {
        const img = document.createElement("img");
        img.src = item.previewUrl;
        img.alt = "";
        img.style.objectPosition = `${item.focusX}% ${item.focusY}%`;
        img.onerror = () => {
          img.replaceWith(createVideoPlaceholder(item.videoId));
        };
        thumbWrap.appendChild(img);
      } else {
        const img = document.createElement("img");
        img.src = item.previewUrl;
        img.alt = "";
        img.style.objectPosition = `${item.focusX}% ${item.focusY}%`;
        thumbWrap.appendChild(img);

        const dot = document.createElement("div");
        dot.className = "slide-focus-dot";
        dot.style.left = `${item.focusX}%`;
        dot.style.top = `${item.focusY}%`;
        thumbWrap.appendChild(dot);
      }

      const orderBadge = document.createElement("span");
      orderBadge.className = "slide-order-badge";
      orderBadge.textContent = `#${padTwo(targetOrder)}`;
      thumbWrap.appendChild(orderBadge);

      const stateBadge = document.createElement("span");
      stateBadge.className = `slide-state-badge${item.status === "uploaded" ? " is-done" : ""}${item.status === "error" ? " is-error" : ""}`;
      stateBadge.textContent = formatStatusLabel(item);
      thumbWrap.appendChild(stateBadge);

      const body = document.createElement("div");
      body.className = "slide-body";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.value = item.name;
      titleInput.placeholder = "Slide name";
      titleInput.disabled = state.isUploading;
      titleInput.addEventListener("input", () => {
        item.name = titleInput.value;
      });
      body.appendChild(titleInput);

      const metrics = document.createElement("div");
      metrics.className = "slide-metrics";
      if (item.kind === "video") {
        metrics.textContent = `Bunny ID: ${item.videoId}`;
      } else if (item.compressed) {
        metrics.textContent = `${formatBytes(item.origSize)} → ${formatBytes(item.compressed.compressedSize)} · ${item.compressed.width}×${item.compressed.height}`;
      } else {
        metrics.textContent = `${formatBytes(item.origSize)} · Compressing…`;
      }
      body.appendChild(metrics);

      const toggles = document.createElement("div");
      toggles.className = "slide-toggles";
      toggles.appendChild(
        createCheckbox("Fill Desktop", item.fillDesktop, (checked) => {
          item.fillDesktop = checked;
        })
      );
      toggles.appendChild(
        createCheckbox("Fill Mobile", item.fillMobile, (checked) => {
          item.fillMobile = checked;
        })
      );
      body.appendChild(toggles);

      const altInput = document.createElement("input");
      altInput.type = "text";
      altInput.value = item.alt;
      altInput.placeholder = "Alt text (optional)";
      altInput.disabled = state.isUploading;
      altInput.addEventListener("input", () => {
        item.alt = altInput.value;
      });
      body.appendChild(altInput);

      if (item.error) {
        const errEl = document.createElement("div");
        errEl.className = "slide-error-msg";
        errEl.textContent = item.error;
        body.appendChild(errEl);
      }

      const actions = document.createElement("div");
      actions.className = "slide-actions";

      const moveBtns = document.createElement("div");
      moveBtns.className = "slide-move-btns";

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "icon-btn";
      leftBtn.textContent = "←";
      leftBtn.title = "Move earlier";
      leftBtn.disabled = state.isUploading || idx === 0;
      leftBtn.addEventListener("click", () => moveQueueItem(idx, idx - 1));

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "icon-btn";
      rightBtn.textContent = "→";
      rightBtn.title = "Move later";
      rightBtn.disabled = state.isUploading || idx === state.queue.length - 1;
      rightBtn.addEventListener("click", () => moveQueueItem(idx, idx + 1));

      moveBtns.appendChild(leftBtn);
      moveBtns.appendChild(rightBtn);
      actions.appendChild(moveBtns);

      if (item.kind === "image") {
        const focusBtn = document.createElement("button");
        focusBtn.type = "button";
        focusBtn.className = "icon-btn";
        focusBtn.textContent = `Focus ${item.focusX}%/${item.focusY}%`;
        focusBtn.disabled = state.isUploading;
        focusBtn.addEventListener("click", () => openFocusModal(item.id));
        actions.appendChild(focusBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "icon-btn is-danger";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove from queue";
      removeBtn.disabled = state.isUploading;
      removeBtn.addEventListener("click", () => removeQueueItem(item.id));
      actions.appendChild(removeBtn);

      body.appendChild(actions);
      card.appendChild(thumbWrap);
      card.appendChild(body);
      els.queueGrid.appendChild(card);
    });
  }

  function createVideoPlaceholder(videoId) {
    const div = document.createElement("div");
    div.className = "video-placeholder";
    div.innerHTML = `<strong>BUNNY VIDEO</strong><span class="mono">${videoId.slice(0, 18)}…</span>`;
    return div;
  }

  function createCheckbox(labelText, initial, onChange) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(initial);
    input.disabled = state.isUploading;
    input.addEventListener("change", () => onChange(input.checked));
    label.appendChild(input);
    label.appendChild(document.createTextNode(labelText));
    return label;
  }

  function formatStatusLabel(item) {
    if (item.status === "compressing") return "Compressing…";
    if (item.status === "uploading") return "Uploading…";
    if (item.status === "uploaded") return "Uploaded";
    if (item.status === "error") return "Error";
    return item.kind === "video" ? "Video Ready" : "Ready";
  }

  // Focal Point Modal
  function openFocusModal(itemId) {
    const item = state.queue.find((i) => i.id === itemId);
    if (!item) return;
    state.focusEditingId = itemId;
    els.focusPreviewImg.src = item.previewUrl;
    updateFocusModalUI(item.focusX, item.focusY);
    els.focusModal.hidden = false;
  }

  function updateFocusModalUI(fx, fy) {
    els.focusCrosshair.style.left = `${fx}%`;
    els.focusCrosshair.style.top = `${fy}%`;
    els.focusCoordsText.textContent = `Focus: ${fx}% × ${fy}%`;
  }

  function closeFocusModal() {
    state.focusEditingId = null;
    els.focusModal.hidden = true;
    renderQueue();
  }

  // Schema Mapping Modal
  function openSchemaModal() {
    if (!state.bootstrap) return;
    const { collections, fieldMap } = state.bootstrap;
    const effective = getEffectiveFieldMap();

    const makeSelect = (group, key, label, fields, currentVal) => {
      const wrap = document.createElement("div");
      wrap.className = "field";
      const lbl = document.createElement("label");
      lbl.textContent = label;
      const sel = document.createElement("select");
      sel.dataset.group = group;
      sel.dataset.key = key;

      const noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = "(Not mapped / skip)";
      sel.appendChild(noneOpt);

      for (const f of fields) {
        const opt = document.createElement("option");
        opt.value = f.slug;
        opt.textContent = `${f.displayName} (${f.slug} · ${f.type})`;
        sel.appendChild(opt);
      }
      sel.value = currentVal || "";
      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      return wrap;
    };

    els.schemaBody.innerHTML = "";

    const mediaTitle = document.createElement("h4");
    mediaTitle.style.margin = "0";
    mediaTitle.textContent = `Media Collection: ${collections.media.displayName} (${collections.media.id})`;
    els.schemaBody.appendChild(mediaTitle);

    const mediaGrid = document.createElement("div");
    mediaGrid.className = "schema-grid";
    const mDefs = [
      ["parent", "Parent Project (Reference)"],
      ["order", "Order (Number)"],
      ["image", "Slide Image (Image)"],
      ["videoId", "Bunny Video ID (PlainText)"],
      ["fillDesktop", "Fill Screen Desktop (Switch)"],
      ["fillMobile", "Fill Screen Mobile (Switch)"],
      ["focusX", "Focus X (Number/Text)"],
      ["focusY", "Focus Y (Number/Text)"],
      ["alt", "Dedicated Alt Text (Optional)"],
    ];
    for (const [key, label] of mDefs) {
      mediaGrid.appendChild(
        makeSelect("media", key, label, collections.media.fields, effective?.media?.[key] ?? fieldMap.media[key])
      );
    }
    els.schemaBody.appendChild(mediaGrid);

    const projTitle = document.createElement("h4");
    projTitle.style.margin = "8px 0 0";
    projTitle.textContent = `Projects Collection: ${collections.projects.displayName} (${collections.projects.id})`;
    els.schemaBody.appendChild(projTitle);

    const projGrid = document.createElement("div");
    projGrid.className = "schema-grid";
    const pDefs = [
      ["gallery", "Gallery Multi-Ref (for /index)"],
      ["sequence", "Sequence Number"],
      ["client", "Client Name"],
      ["subtitle", "Subtitle"],
    ];
    for (const [key, label] of pDefs) {
      projGrid.appendChild(
        makeSelect("projects", key, label, collections.projects.fields, effective?.projects?.[key] ?? fieldMap.projects[key])
      );
    }
    els.schemaBody.appendChild(projGrid);

    els.schemaModal.hidden = false;
  }

  // Upload Pipeline
  async function startUpload(onlyFailed = false) {
    const project = getSelectedProject();
    if (!project || state.isUploading || !state.queue.length) return;

    const effectiveMap = getEffectiveFieldMap();
    if (!effectiveMap?.media?.parent && !effectiveMap?.projects?.gallery) {
      showBanner("Neither Media 'Parent' nor Project 'Gallery Multi-Ref' is mapped. Check Field Mapping.", "err");
      return;
    }

    hideBanner();
    state.isUploading = true;
    renderQueue();

    const preset = getPresetConfig();
    const imageItemsToProcess = state.queue.filter((item) => {
      if (item.kind !== "image") return false;
      if (onlyFailed) return item.status === "error" || !item.uploadedAsset;
      return !item.uploadedAsset;
    });

    const totalSteps = imageItemsToProcess.length + 1;
    let completedSteps = 0;
    const updateProgress = (msg) => {
      els.progressSummary.textContent = msg;
      els.progressFill.style.width = `${Math.min(100, Math.round((completedSteps / totalSteps) * 100))}%`;
    };

    try {
      updateProgress(`Uploading ${imageItemsToProcess.length} image(s) to Webflow Assets…`);

      await runWithConcurrency(imageItemsToProcess, 2, async (item) => {
        try {
          item.error = "";
          if (!item.compressed) {
            item.status = "compressing";
            renderQueue();
            item.compressed = await compressImageFile(item.file, preset);
          }

          item.status = "uploading";
          renderQueue();

          const form = new FormData();
          form.append("file", item.compressed.blob, item.compressed.fileName);
          form.append("fileName", item.compressed.fileName);
          form.append("fileHash", item.compressed.fileHash);
          form.append("width", String(item.compressed.width));
          form.append("height", String(item.compressed.height));
          if (state.bootstrap?.site?.id) {
            form.append("siteId", state.bootstrap.site.id);
          }

          item.uploadedAsset = await apiJson("/api/upload-asset", {
            method: "POST",
            body: form,
          });
          item.status = "uploaded";
        } catch (err) {
          item.status = "error";
          item.error = err?.message || "Upload failed";
        } finally {
          completedSteps += 1;
          updateProgress(`Uploaded ${completedSteps} of ${imageItemsToProcess.length} image(s)…`);
          renderQueue();
        }
      });

      const failed = state.queue.filter((i) => i.status === "error");
      if (failed.length > 0) {
        showBanner(
          `${failed.length} image(s) failed to upload. Fix or click "Retry Failed" — already uploaded assets will be skipped.`,
          "err"
        );
        return;
      }

      updateProgress(`Creating ${state.queue.length} Media CMS item(s) in Webflow…`);

      const startOrder = project.nextOrder;
      const slidesPayload = state.queue.map((item, idx) => ({
        name: item.name.trim() || `${project.name} ${padTwo(startOrder + idx)}`,
        order: startOrder + idx,
        alt: item.alt.trim(),
        fillDesktop: item.fillDesktop,
        fillMobile: item.fillMobile,
        focusX: item.focusX,
        focusY: item.focusY,
        ...(item.kind === "video"
          ? { videoId: item.videoId }
          : { fileId: item.uploadedAsset.fileId, url: item.uploadedAsset.url }),
      }));

      const result = await apiJson("/api/create-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          slides: slidesPayload,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
        }),
      });

      completedSteps = totalSteps;
      els.progressFill.style.width = "100%";

      const modeNote = result.publishMode === "live"
        ? (result.skippedProjectPublishBecauseDraft
          ? "Media slides published, but the parent Project is still a Draft in Webflow."
          : "Published live in Webflow.")
        : "Saved as Staged in Webflow — click Publish in Webflow when ready.";

      clearQueue();
      await loadBootstrap();
      showBanner(
        `Added ${result.createdCount} slide(s) to "${result.projectName}". ${modeNote}`,
        "ok"
      );
    } catch (err) {
      showBanner(err?.message || "Failed while creating Media CMS items.", "err");
    } finally {
      state.isUploading = false;
      renderQueue();
    }
  }

  // Event Listeners
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.loginError.hidden = true;
    els.loginBtn.disabled = true;

    try {
      const authData = await apiJson("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: els.passwordInput.value }),
      });
      if (authData?.token) {
        saveSessionToken(authData.token);
      }
      els.passwordInput.value = "";
      setAuthenticated(true);
      await loadBootstrap();
    } catch (err) {
      els.loginError.textContent = err.message;
      els.loginError.hidden = false;
    } finally {
      els.loginBtn.disabled = false;
    }
  });

  els.logoutBtn.addEventListener("click", async () => {
    saveSessionToken("");
    await fetch("/api/auth", { method: "DELETE", credentials: "same-origin" }).catch(() => { });
    setAuthenticated(false);
  });

  els.refreshBtn.addEventListener("click", loadBootstrap);
  els.projectSearch.addEventListener("input", renderProjectOptions);
  els.projectSelect.addEventListener("change", () => {
    state.selectedProjectId = els.projectSelect.value;
    updateProjectMeta();
    renderQueue();
  });

  els.browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    els.fileInput.click();
  });

  els.addVideoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addVideoSlideToQueue();
  });

  els.dropZone.addEventListener("click", () => els.fileInput.click());
  els.dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files?.length) {
      addFilesToQueue(els.fileInput.files);
      els.fileInput.value = "";
    }
  });

  els.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropZone.classList.add("is-dragover");
  });
  els.dropZone.addEventListener("dragleave", () => {
    els.dropZone.classList.remove("is-dragover");
  });
  els.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropZone.classList.remove("is-dragover");
    if (e.dataTransfer?.files?.length) {
      addFilesToQueue(e.dataTransfer.files);
    }
  });

  els.toggleAllDesktopBtn.addEventListener("click", () => {
    const allOn = state.queue.length > 0 && state.queue.every((i) => i.fillDesktop);
    state.queue.forEach((i) => { i.fillDesktop = !allOn; });
    renderQueue();
  });

  els.toggleAllMobileBtn.addEventListener("click", () => {
    const allOn = state.queue.length > 0 && state.queue.every((i) => i.fillMobile);
    state.queue.forEach((i) => { i.fillMobile = !allOn; });
    renderQueue();
  });

  els.clearQueueBtn.addEventListener("click", () => {
    if (!state.isUploading) clearQueue();
  });

  els.uploadBtn.addEventListener("click", () => startUpload(false));
  els.retryFailedBtn.addEventListener("click", () => startUpload(true));

  // Focus Modal Listeners
  els.focusStage.addEventListener("click", (e) => {
    const item = state.queue.find((i) => i.id === state.focusEditingId);
    if (!item) return;
    const rect = els.focusPreviewImg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    item.focusX = xPct;
    item.focusY = yPct;
    updateFocusModalUI(xPct, yPct);
  });

  els.resetFocusBtn.addEventListener("click", () => {
    const item = state.queue.find((i) => i.id === state.focusEditingId);
    if (!item) return;
    item.focusX = 50;
    item.focusY = 50;
    updateFocusModalUI(50, 50);
  });

  els.closeFocusModalBtn.addEventListener("click", closeFocusModal);
  els.doneFocusBtn.addEventListener("click", closeFocusModal);

  // Schema Modal Listeners
  els.schemaBtn.addEventListener("click", openSchemaModal);
  els.closeSchemaModalBtn.addEventListener("click", () => { els.schemaModal.hidden = true; });
  els.resetSchemaBtn.addEventListener("click", () => {
    saveFieldOverride(null);
    els.schemaModal.hidden = true;
    loadBootstrap();
  });
  els.saveSchemaBtn.addEventListener("click", () => {
    const override = { projects: {}, media: {} };
    els.schemaBody.querySelectorAll("select[data-group]").forEach((sel) => {
      override[sel.dataset.group][sel.dataset.key] = sel.value || null;
    });
    saveFieldOverride(override);
    els.schemaModal.hidden = true;
    showBanner("Saved field mapping override in this browser.", "ok");
  });

  checkInitialAuth();
})();

