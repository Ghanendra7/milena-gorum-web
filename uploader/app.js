(function () {
  const {
    BUNNY_CDN_BASE,
    padTwo,
    slugify,
    formatBytes,
    extractVideoId,
    getPresetConfig,
    compressImageFile,
  } = window.mgMediaUtils;

  const FIELD_OVERRIDE_KEY = "mg_uploader_field_override_v1";
  const SESSION_STORAGE_KEY = "mg_uploader_session_token_v1";
  const PUBLISH_MODE_KEY = "mg_uploader_publish_mode_v1";

  const state = {
    authenticated: false,
    sessionToken: loadSessionToken(),
    activeView: "projects", // "projects" | "editor"
    bootstrap: null,
    projects: [],
    mediaById: {},
    categories: [],
    selectedProjectId: "",
    projectDirty: false,
    galleryIds: [],
    existingEdits: {},
    queue: [],
    isUploading: false,
    dragQueueId: null,
    dragGalleryId: null,
    focusTarget: null, // { kind: "queue" | "existing", id, prevX, prevY, prevDirty }
    pendingDeleteSlideId: null,
    orderMode: "all", // "all" | "home" | "info"
    orderDraftAll: [],
    orderDraftHome: [],
    dragOrderProjectId: null,
    newProjSlugManual: false,
    information: null,
    infoDraft: null,
    infoDirty: false,
    fieldOverride: loadFieldOverride(),
  };

  const els = {
    authGate: document.getElementById("authGate"),
    loginForm: document.getElementById("loginForm"),
    passwordInput: document.getElementById("passwordInput"),
    loginBtn: document.getElementById("loginBtn"),
    loginError: document.getElementById("loginError"),
    appShell: document.getElementById("appShell"),
    backToProjectsBtn: document.getElementById("backToProjectsBtn"),
    topbarTitle: document.getElementById("topbarTitle"),
    siteBadge: document.getElementById("siteBadge"),
    publishMode: document.getElementById("publishMode"),
    newProjectBtn: document.getElementById("newProjectBtn"),
    publishSiteBtn: document.getElementById("publishSiteBtn"),
    schemaBtn: document.getElementById("schemaBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    globalBanner: document.getElementById("globalBanner"),

    projectsView: document.getElementById("projectsView"),
    editorView: document.getElementById("editorView"),

    orderToolbarPanel: document.getElementById("orderToolbarPanel"),
    orderModeAllBtn: document.getElementById("orderModeAllBtn"),
    orderModeHomeBtn: document.getElementById("orderModeHomeBtn"),
    orderModeInfoBtn: document.getElementById("orderModeInfoBtn"),
    orderDirtyCount: document.getElementById("orderDirtyCount"),
    resetOrderBtn: document.getElementById("resetOrderBtn"),
    saveOrderBtn: document.getElementById("saveOrderBtn"),
    dirFilterRow: document.getElementById("dirFilterRow"),
    dirSearchInput: document.getElementById("dirSearchInput"),
    dirTypeFilter: document.getElementById("dirTypeFilter"),
    dirCatFilter: document.getElementById("dirCatFilter"),
    dirStatusFilter: document.getElementById("dirStatusFilter"),
    clearDirFiltersBtn: document.getElementById("clearDirFiltersBtn"),
    dirOrderHint: document.getElementById("dirOrderHint"),
    projectOrderList: document.getElementById("projectOrderList"),

    infoEditorSection: document.getElementById("infoEditorSection"),
    infoItemHeading: document.getElementById("infoItemHeading"),
    infoStatusPill: document.getElementById("infoStatusPill"),
    infoDirtyBadge: document.getElementById("infoDirtyBadge"),
    saveInfoBtn: document.getElementById("saveInfoBtn"),
    infoPicPreview: document.getElementById("infoPicPreview"),
    infoPicEmpty: document.getElementById("infoPicEmpty"),
    infoPicInput: document.getElementById("infoPicInput"),
    replaceInfoPicBtn: document.getElementById("replaceInfoPicBtn"),
    removeInfoPicBtn: document.getElementById("removeInfoPicBtn"),
    infoBioEditor: document.getElementById("infoBioEditor"),
    bioBoldBtn: document.getElementById("bioBoldBtn"),
    bioItalicBtn: document.getElementById("bioItalicBtn"),
    bioLinkBtn: document.getElementById("bioLinkBtn"),
    bioUnlinkBtn: document.getElementById("bioUnlinkBtn"),
    infoListsGrid: document.getElementById("infoListsGrid"),

    editorProjNumBadge: document.getElementById("editorProjNumBadge"),
    editorProjHeading: document.getElementById("editorProjHeading"),
    projectStatusPill: document.getElementById("projectStatusPill"),
    projectMeta: document.getElementById("projectMeta"),
    publishProjectBtn: document.getElementById("publishProjectBtn"),
    unpublishProjectBtn: document.getElementById("unpublishProjectBtn"),
    deleteProjectBtn: document.getElementById("deleteProjectBtn"),

    projectDetailsPanel: document.getElementById("projectDetailsPanel"),
    projectDirtyBadge: document.getElementById("projectDirtyBadge"),
    saveProjectDetailsBtn: document.getElementById("saveProjectDetailsBtn"),
    editProjName: document.getElementById("editProjName"),
    editProjSlug: document.getElementById("editProjSlug"),
    editProjSeq: document.getElementById("editProjSeq"),
    editProjSubtitle: document.getElementById("editProjSubtitle"),
    editProjType: document.getElementById("editProjType"),
    editProjCover: document.getElementById("editProjCover"),
    editProjDetails: document.getElementById("editProjDetails"),
    editProjCategories: document.getElementById("editProjCategories"),
    editProjFeatured: document.getElementById("editProjFeatured"),
    editProjFeaturedSeq: document.getElementById("editProjFeaturedSeq"),

    existingGalleryHeading: document.getElementById("existingGalleryHeading"),
    existingGalleryGrid: document.getElementById("existingGalleryGrid"),
    existingGalleryEmpty: document.getElementById("existingGalleryEmpty"),
    resetGalleryOrderBtn: document.getElementById("resetGalleryOrderBtn"),
    saveGalleryOrderBtn: document.getElementById("saveGalleryOrderBtn"),

    compressionPreset: document.getElementById("compressionPreset"),
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
    resetFocusBtn: document.getElementById("resetFocusBtn"),
    closeFocusModalBtn: document.getElementById("closeFocusModalBtn"),
    doneFocusBtn: document.getElementById("doneFocusBtn"),

    schemaModal: document.getElementById("schemaModal"),
    schemaBody: document.getElementById("schemaBody"),
    closeSchemaModalBtn: document.getElementById("closeSchemaModalBtn"),
    resetSchemaBtn: document.getElementById("resetSchemaBtn"),
    saveSchemaBtn: document.getElementById("saveSchemaBtn"),

    newProjectModal: document.getElementById("newProjectModal"),
    newProjectForm: document.getElementById("newProjectForm"),
    closeNewProjectBtn: document.getElementById("closeNewProjectBtn"),
    newProjName: document.getElementById("newProjName"),
    newProjSlug: document.getElementById("newProjSlug"),
    newProjSeq: document.getElementById("newProjSeq"),
    newProjSubtitle: document.getElementById("newProjSubtitle"),
    newProjType: document.getElementById("newProjType"),
    newProjFeatured: document.getElementById("newProjFeatured"),
    newProjDetails: document.getElementById("newProjDetails"),
    newProjCategories: document.getElementById("newProjCategories"),
    newProjError: document.getElementById("newProjError"),
    submitNewProjectBtn: document.getElementById("submitNewProjectBtn"),

    slideDeleteModal: document.getElementById("slideDeleteModal"),
    slideDeleteDesc: document.getElementById("slideDeleteDesc"),
    slideDeleteCoverWarn: document.getElementById("slideDeleteCoverWarn"),
    closeSlideDeleteBtn: document.getElementById("closeSlideDeleteBtn"),
    removeFromGalleryBtn: document.getElementById("removeFromGalleryBtn"),
    deleteMediaPermanentBtn: document.getElementById("deleteMediaPermanentBtn"),
  };

  function loadSessionToken() {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || window.localStorage.getItem(SESSION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveSessionToken(token) {
    state.sessionToken = token || "";
    try {
      if (!token) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
        window.localStorage.setItem(SESSION_STORAGE_KEY, token);
      }
    } catch {
      // ignore storage errors
    }
  }

  function loadFieldOverride() {
    try {
      const raw = localStorage.getItem(FIELD_OVERRIDE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveFieldOverride(override) {
    state.fieldOverride = override;
    try {
      if (!override) localStorage.removeItem(FIELD_OVERRIDE_KEY);
      else localStorage.setItem(FIELD_OVERRIDE_KEY, JSON.stringify(override));
    } catch {
      // ignore
    }
  }

  function initPublishMode() {
    els.publishMode.value = "live";
  }

  function getSelectedProject() {
    return state.projects.find((p) => p.id === state.selectedProjectId) || null;
  }

  function showBanner(message, type = "warn") {
    if (!message) {
      els.globalBanner.hidden = true;
      els.globalBanner.textContent = "";
      els.globalBanner.className = "banner";
      return;
    }
    els.globalBanner.hidden = false;
    els.globalBanner.textContent = message;
    els.globalBanner.className = `banner is-${type}`;
  }

  function setAuthenticated(isAuthed) {
    state.authenticated = isAuthed;
    els.authGate.hidden = isAuthed;
    els.appShell.hidden = !isAuthed;
  }

  async function apiJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.sessionToken && !headers.has("X-Session-Token") && !headers.has("Authorization")) {
      headers.set("X-Session-Token", state.sessionToken);
      headers.set("Authorization", `Bearer ${state.sessionToken}`);
    }

    const res = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (res.status === 401) {
      saveSessionToken("");
      setAuthenticated(false);
      throw new Error(data?.error || "Session expired. Please sign in again.");
    }
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function getEffectiveFieldMap() {
    if (!state.bootstrap) return null;
    const base = state.bootstrap.fieldMap;
    if (!state.fieldOverride) return base;
    return {
      projects: { ...base.projects, ...(state.fieldOverride.projects || {}) },
      media: { ...base.media, ...(state.fieldOverride.media || {}) },
      information: base.information
        ? { ...base.information, ...(state.fieldOverride.information || {}) }
        : null,
    };
  }

  function getProjectTypeOptions() {
    const typeSlug = getEffectiveFieldMap()?.projects?.projectType;
    const fields = state.bootstrap?.collections?.projects?.fields || [];
    const def = fields.find((f) => f.slug === typeSlug);
    return Array.isArray(def?.validations?.options) ? def.validations.options : [];
  }

  function syncUrlHash() {
    const targetHash =
      state.activeView === "editor" && state.selectedProjectId
        ? `#project=${encodeURIComponent(state.selectedProjectId)}`
        : state.orderMode === "info"
          ? "#information"
          : "#/";
    if (window.location.hash !== targetHash) {
      history.replaceState(null, "", targetHash);
    }
  }

  function showProjectsView() {
    if (state.queue.length > 0 && state.activeView === "editor") {
      if (!window.confirm("Leave this project? Your queued (not yet uploaded) slides will be cleared.")) {
        return;
      }
      clearQueue();
    }
    if (state.orderMode === "info") {
      state.orderMode = "all";
    }
    state.activeView = "projects";
    els.projectsView.hidden = false;
    els.editorView.hidden = true;
    els.backToProjectsBtn.hidden = true;
    els.topbarTitle.textContent = "Projects";
    els.actionBar.hidden = true;
    syncUrlHash();
    renderProjectOrderList();
  }

  function openProjectEditor(projectId) {
    const target = state.projects.find((p) => p.id === projectId);
    if (!target) {
      showProjectsView();
      return;
    }
    state.selectedProjectId = target.id;
    state.activeView = "editor";
    els.projectsView.hidden = true;
    els.editorView.hidden = false;
    els.backToProjectsBtn.hidden = false;
    els.topbarTitle.textContent = target.name;
    syncUrlHash();
    syncEditorFromSelectedProject();
    renderQueue();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function checkInitialAuth() {
    try {
      const auth = await apiJson("/api/auth");
      if (auth?.authenticated) {
        setAuthenticated(true);
        await loadBootstrap();
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    }
  }

  async function loadBootstrap(preferredProjectId = null) {
    els.siteBadge.textContent = "Loading CMS…";
    els.siteBadge.className = "status-pill";
    showBanner("");

    try {
      const data = await apiJson("/api/bootstrap");
      state.bootstrap = data;
      state.projects = data.projects || [];
      state.mediaById = data.mediaById || {};
      state.categories = data.categories || [];
      state.information = data.information || null;

      const hasInfoCollection = Boolean(data.collections?.information);
      els.orderModeInfoBtn.hidden = !hasInfoCollection;
      if (state.orderMode === "info" && !hasInfoCollection) {
        state.orderMode = "all";
      }

      const hashMatch = window.location.hash.match(/^#project=([^&]+)/);
      const hashProjectId = hashMatch ? decodeURIComponent(hashMatch[1]) : "";
      if (!preferredProjectId && window.location.hash === "#information" && hasInfoCollection) {
        state.activeView = "projects";
        state.orderMode = "info";
      }
      const targetId = preferredProjectId || (state.activeView === "editor" ? state.selectedProjectId : hashProjectId);

      if (targetId && state.projects.some((p) => p.id === targetId)) {
        state.selectedProjectId = targetId;
        state.activeView = "editor";
      } else if (state.activeView === "editor") {
        state.activeView = "projects";
        state.selectedProjectId = "";
      }

      els.siteBadge.textContent = `${data.site.displayName} · ${state.projects.length} Projects`;
      els.siteBadge.className = "status-pill is-ok";

      populateDirectoryFilters();
      resetOrderDrafts();
      syncInfoDraftFromBootstrap();
      updateModeCounts();

      if (state.activeView === "editor" && getSelectedProject()) {
        openProjectEditor(state.selectedProjectId);
      } else {
        els.projectsView.hidden = false;
        els.editorView.hidden = true;
        els.backToProjectsBtn.hidden = true;
        els.actionBar.hidden = true;
        renderProjectOrderList();
      }
    } catch (err) {
      els.siteBadge.textContent = "Connection Error";
      els.siteBadge.className = "status-pill is-err";
      showBanner(err.message, "err");
    }
  }

  function updateModeCounts() {
    const homeCount = state.projects.filter((p) => p.featured).length;
    els.orderModeAllBtn.textContent = `All Projects (${state.projects.length})`;
    els.orderModeHomeBtn.textContent = `Homepage Featured (${homeCount}/12)`;
    els.orderModeInfoBtn.textContent = "Information";
  }

  // Project Detail Editor Helpers
  function updateProjectMeta() {
    const p = getSelectedProject();
    if (!p) return;
    els.editorProjNumBadge.textContent = p.sequence !== "" ? `#${padTwo(p.sequence)}` : "--";
    els.editorProjHeading.textContent = p.subtitle && p.subtitle !== p.name ? `${p.name} — ${p.subtitle}` : p.name;
    els.topbarTitle.textContent = p.name;
    els.projectStatusPill.textContent = p.isDraft ? "Draft" : "Live";
    els.projectStatusPill.className = `status-pill ${p.isDraft ? "" : "is-ok"}`;
    els.publishProjectBtn.textContent = p.isDraft ? "Publish Project & Media" : "Re-publish Project & Media";
    els.unpublishProjectBtn.disabled = p.isDraft;
    els.projectMeta.textContent = `/projects/${p.slug} · ${p.existingSlideCount} slide(s) · Next new slide starts at #${p.nextOrder}`;
  }

  function renderCategoryPills(container, selectedIds, onToggle = null) {
    container.innerHTML = "";
    if (!state.categories.length) {
      const msg = document.createElement("span");
      msg.className = "field-hint";
      msg.textContent = "No Category / Subcategories items found.";
      container.appendChild(msg);
      return;
    }
    const selectedSet = new Set(selectedIds || []);
    for (const cat of state.categories) {
      const label = document.createElement("label");
      label.className = "pill-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = cat.id;
      input.checked = selectedSet.has(cat.id);
      if (onToggle) input.addEventListener("change", onToggle);
      label.appendChild(input);
      label.appendChild(document.createTextNode(cat.name));
      container.appendChild(label);
    }
  }

  function fillProjectTypeSelect(selectEl, currentValue, emptyLabel = null) {
    const options = getProjectTypeOptions();
    selectEl.innerHTML = "";
    if (emptyLabel !== null || !options.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = options.length ? emptyLabel : "(Not mapped)";
      selectEl.appendChild(opt);
    }
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = o.name;
      selectEl.appendChild(opt);
    }
    if (currentValue) {
      const match = options.find((o) => o.id === currentValue || o.name === currentValue);
      selectEl.value = match ? match.id : currentValue;
    }
  }

  function setProjectDirty(dirty) {
    state.projectDirty = dirty;
    els.projectDirtyBadge.hidden = !dirty;
    els.saveProjectDetailsBtn.disabled = !dirty || !getSelectedProject();
  }

  function syncEditorFromSelectedProject() {
    const p = getSelectedProject();
    if (!p) return;
    updateProjectMeta();

    els.editProjName.value = p.name || "";
    els.editProjSlug.value = p.slug || "";
    els.editProjSeq.value = p.sequence === "" ? "" : String(p.sequence);
    els.editProjSubtitle.value = p.subtitle || "";
    els.editProjDetails.value = p.details || "";
    fillProjectTypeSelect(els.editProjType, p.projectType, "(Select Type)");
    renderCategoryPills(els.editProjCategories, p.categoryIds, () => setProjectDirty(true));
    els.editProjFeatured.checked = Boolean(p.featured);
    els.editProjFeaturedSeq.value = p.featuredSequence === "" ? "" : String(p.featuredSequence);

    populateCoverSelect(p);
    setProjectDirty(false);

    state.galleryIds = [...(p.galleryIds || [])];
    state.existingEdits = {};
    renderExistingGallery();
  }

  function populateCoverSelect(project) {
    els.editProjCover.innerHTML = "";
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "(No Cover Selected)";
    els.editProjCover.appendChild(noneOpt);

    const seen = new Set();
    (project.galleryIds || []).forEach((id, idx) => {
      const m = state.mediaById[id];
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `#${padTwo(idx + 1)} · ${m ? m.name : id}`;
      els.editProjCover.appendChild(opt);
      seen.add(id);
    });

    if (project.coverId && !seen.has(project.coverId)) {
      const m = state.mediaById[project.coverId];
      const opt = document.createElement("option");
      opt.value = project.coverId;
      opt.textContent = `External · ${m ? m.name : project.coverId}`;
      els.editProjCover.appendChild(opt);
    }

    els.editProjCover.value = project.coverId || "";
  }

  function getSelectedCategoryIds(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
  }

  async function saveProjectDetails() {
    const p = getSelectedProject();
    if (!p) return;

    const name = els.editProjName.value.trim();
    if (!name) {
      showBanner("Project Title is required.", "err");
      return;
    }

    els.saveProjectDetailsBtn.disabled = true;
    els.saveProjectDetailsBtn.textContent = "Saving…";

    try {
      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          projectId: p.id,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          project: {
            name,
            slug: slugify(els.editProjSlug.value || name) || p.slug,
            sequence: els.editProjSeq.value.trim() === "" ? null : Number(els.editProjSeq.value),
            subtitle: els.editProjSubtitle.value.trim(),
            details: els.editProjDetails.value,
            projectType: els.editProjType.value,
            categoryIds: getSelectedCategoryIds(els.editProjCategories),
            coverId: els.editProjCover.value || null,
            featured: els.editProjFeatured.checked,
            featuredSequence:
              els.editProjFeaturedSeq.value.trim() === "" ? null : Number(els.editProjFeaturedSeq.value),
          },
        }),
      });

      await loadBootstrap(p.id);
      const pubNote = res.published
        ? "Published live."
        : res.skippedPublishBecauseDraft
          ? "Saved (project is Draft — click Publish Project when ready)."
          : "Saved as staged.";
      showBanner(`Updated "${name}". ${pubNote}`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
      els.saveProjectDetailsBtn.disabled = false;
    } finally {
      els.saveProjectDetailsBtn.textContent = "Save Details";
    }
  }

  // Existing Gallery Rendering & Actions
  function getExistingEditState(mediaId) {
    if (!state.existingEdits[mediaId]) {
      const m = state.mediaById[mediaId];
      if (!m) return null;
      state.existingEdits[mediaId] = {
        name: m.name || "",
        videoId: m.videoId || "",
        fillDesktop: Boolean(m.fillDesktop),
        fillMobile: Boolean(m.fillMobile),
        focusX: m.focusX ?? 50,
        focusY: m.focusY ?? 50,
        dirty: false,
        busy: false,
      };
    }
    return state.existingEdits[mediaId];
  }

  function isGalleryOrderDirty() {
    const p = getSelectedProject();
    if (!p) return false;
    const orig = p.galleryIds || [];
    if (orig.length !== state.galleryIds.length) return true;
    return orig.some((id, idx) => id !== state.galleryIds[idx]);
  }

  function renderExistingGallery() {
    const p = getSelectedProject();
    els.existingGalleryGrid.innerHTML = "";

    const dirtyOrder = isGalleryOrderDirty();
    els.saveGalleryOrderBtn.hidden = !dirtyOrder;
    els.resetGalleryOrderBtn.hidden = !dirtyOrder;
    els.existingGalleryHeading.textContent = `Gallery Slides (${state.galleryIds.length})`;

    if (!p || !state.galleryIds.length) {
      els.existingGalleryEmpty.hidden = false;
      return;
    }
    els.existingGalleryEmpty.hidden = true;

    state.galleryIds.forEach((mediaId, idx) => {
      const m = state.mediaById[mediaId];
      if (!m) return;
      const edit = getExistingEditState(mediaId);
      const isCover = p.coverId === mediaId;

      const card = document.createElement("article");
      card.className = "slide-card";
      card.draggable = !edit.busy;

      card.addEventListener("focusin", (e) => {
        if (e.target.matches("input, textarea, select")) card.draggable = false;
      });
      card.addEventListener("focusout", () => {
        card.draggable = !edit.busy;
      });
      card.addEventListener("dragstart", (e) => {
        if (e.target.closest("input, select, textarea, button")) {
          e.preventDefault();
          return;
        }
        state.dragGalleryId = mediaId;
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        state.dragGalleryId = null;
        card.classList.remove("is-dragging");
        els.existingGalleryGrid.querySelectorAll(".is-drag-target").forEach((el) => el.classList.remove("is-drag-target"));
      });
      card.addEventListener("dragover", (e) => {
        if (!state.dragGalleryId || state.dragGalleryId === mediaId) return;
        e.preventDefault();
        card.classList.add("is-drag-target");
      });
      card.addEventListener("dragleave", () => card.classList.remove("is-drag-target"));
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("is-drag-target");
        if (!state.dragGalleryId || state.dragGalleryId === mediaId) return;
        const fromIdx = state.galleryIds.indexOf(state.dragGalleryId);
        const toIdx = state.galleryIds.indexOf(mediaId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [moved] = state.galleryIds.splice(fromIdx, 1);
          state.galleryIds.splice(toIdx, 0, moved);
          renderExistingGallery();
        }
      });

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "slide-thumb-wrap";
      const thumbSrc = m.imageUrl || (edit.videoId ? `${BUNNY_CDN_BASE}/${extractVideoId(edit.videoId)}/thumbnail.jpg` : "");
      if (thumbSrc) {
        const img = document.createElement("img");
        img.src = thumbSrc;
        img.alt = edit.name;
        img.style.objectPosition = `${edit.focusX}% ${edit.focusY}%`;
        img.loading = "lazy";
        thumbWrap.appendChild(img);

        const dot = document.createElement("div");
        dot.className = "slide-focus-dot";
        dot.style.left = `${edit.focusX}%`;
        dot.style.top = `${edit.focusY}%`;
        thumbWrap.appendChild(dot);
      } else {
        const ph = document.createElement("div");
        ph.className = "video-placeholder";
        ph.textContent = edit.videoId ? "BUNNY VIDEO" : "NO IMAGE";
        thumbWrap.appendChild(ph);
      }

      const orderBadge = document.createElement("span");
      orderBadge.className = "slide-order-badge";
      orderBadge.textContent = `#${padTwo(idx + 1)}`;
      thumbWrap.appendChild(orderBadge);

      const statusBadge = document.createElement("span");
      statusBadge.className = `slide-state-badge ${edit.dirty ? "" : m.isDraft ? "" : "is-done"}`;
      statusBadge.textContent = edit.busy
        ? "Saving…"
        : edit.dirty
          ? "Edited"
          : edit.videoId
            ? "Video"
            : m.isDraft
              ? "Draft"
              : "Live";
      thumbWrap.appendChild(statusBadge);

      if (isCover) {
        const coverBadge = document.createElement("span");
        coverBadge.className = "slide-cover-badge";
        coverBadge.textContent = "Cover";
        thumbWrap.appendChild(coverBadge);
      }

      const body = document.createElement("div");
      body.className = "slide-body";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = edit.name;
      nameInput.disabled = edit.busy;
      nameInput.placeholder = "Slide name";
      nameInput.addEventListener("input", () => {
        edit.name = nameInput.value;
        edit.dirty = true;
        saveSlideBtn.disabled = false;
        statusBadge.textContent = "Edited";
        statusBadge.className = "slide-state-badge";
      });
      body.appendChild(nameInput);

      const videoInput = document.createElement("input");
      videoInput.type = "text";
      videoInput.className = "slide-video-input";
      videoInput.value = edit.videoId;
      videoInput.disabled = edit.busy;
      videoInput.placeholder = "Bunny Video ID (optional)";
      videoInput.addEventListener("input", () => {
        edit.videoId = videoInput.value.trim();
        edit.dirty = true;
        saveSlideBtn.disabled = false;
        statusBadge.textContent = "Edited";
        statusBadge.className = "slide-state-badge";
      });
      body.appendChild(videoInput);

      const toggles = document.createElement("div");
      toggles.className = "slide-toggles";
      toggles.appendChild(
        createCheckbox("Fill Desktop", edit.fillDesktop, edit.busy, (checked) => {
          edit.fillDesktop = checked;
          edit.dirty = true;
          saveSlideBtn.disabled = false;
          statusBadge.textContent = "Edited";
          statusBadge.className = "slide-state-badge";
        })
      );
      toggles.appendChild(
        createCheckbox("Fill Mobile", edit.fillMobile, edit.busy, (checked) => {
          edit.fillMobile = checked;
          edit.dirty = true;
          saveSlideBtn.disabled = false;
          statusBadge.textContent = "Edited";
          statusBadge.className = "slide-state-badge";
        })
      );
      body.appendChild(toggles);

      const actions = document.createElement("div");
      actions.className = "slide-actions slide-actions-wrap";

      const moveBtns = document.createElement("div");
      moveBtns.className = "slide-move-btns";
      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "icon-btn";
      leftBtn.textContent = "←";
      leftBtn.disabled = edit.busy || idx === 0;
      leftBtn.addEventListener("click", () => {
        const [moved] = state.galleryIds.splice(idx, 1);
        state.galleryIds.splice(idx - 1, 0, moved);
        renderExistingGallery();
      });

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "icon-btn";
      rightBtn.textContent = "→";
      rightBtn.disabled = edit.busy || idx === state.galleryIds.length - 1;
      rightBtn.addEventListener("click", () => {
        const [moved] = state.galleryIds.splice(idx, 1);
        state.galleryIds.splice(idx + 1, 0, moved);
        renderExistingGallery();
      });
      moveBtns.appendChild(leftBtn);
      moveBtns.appendChild(rightBtn);
      actions.appendChild(moveBtns);

      const focusBtn = document.createElement("button");
      focusBtn.type = "button";
      focusBtn.className = "icon-btn";
      focusBtn.textContent = `Focus ${edit.focusX}%/${edit.focusY}%`;
      focusBtn.disabled = edit.busy || !thumbSrc;
      focusBtn.addEventListener("click", () => openFocusModal({ kind: "existing", id: mediaId }));
      actions.appendChild(focusBtn);

      const replaceBtn = document.createElement("button");
      replaceBtn.type = "button";
      replaceBtn.className = "icon-btn";
      replaceBtn.textContent = "Replace Img";
      replaceBtn.disabled = edit.busy;
      replaceBtn.addEventListener("click", () => replaceExistingSlideImage(mediaId));
      actions.appendChild(replaceBtn);

      if (edit.videoId) {
        const syncThumbBtn = document.createElement("button");
        syncThumbBtn.type = "button";
        syncThumbBtn.className = "icon-btn";
        syncThumbBtn.textContent = "Sync Thumb";
        syncThumbBtn.title = "Fetch thumbnail.jpg from Bunny Stream";
        syncThumbBtn.disabled = edit.busy;
        syncThumbBtn.addEventListener("click", () => saveExistingSlide(mediaId, { syncBunnyThumb: true }));
        actions.appendChild(syncThumbBtn);
      }

      if (!isCover) {
        const coverBtn = document.createElement("button");
        coverBtn.type = "button";
        coverBtn.className = "icon-btn";
        coverBtn.textContent = "Set Cover";
        coverBtn.disabled = edit.busy;
        coverBtn.addEventListener("click", () => setProjectCover(mediaId));
        actions.appendChild(coverBtn);
      }

      const saveSlideBtn = document.createElement("button");
      saveSlideBtn.type = "button";
      saveSlideBtn.className = "icon-btn";
      saveSlideBtn.textContent = "Save";
      saveSlideBtn.disabled = edit.busy || !edit.dirty;
      saveSlideBtn.addEventListener("click", () => saveExistingSlide(mediaId));
      actions.appendChild(saveSlideBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-btn is-danger";
      delBtn.textContent = "✕";
      delBtn.title = "Remove or Delete Slide";
      delBtn.disabled = edit.busy;
      delBtn.addEventListener("click", () => openSlideDeleteModal(mediaId));
      actions.appendChild(delBtn);

      body.appendChild(actions);
      card.appendChild(thumbWrap);
      card.appendChild(body);
      els.existingGalleryGrid.appendChild(card);
    });
  }

  async function saveExistingSlide(mediaId, extra = {}) {
    const edit = getExistingEditState(mediaId);
    const p = getSelectedProject();
    if (!edit || !p) return;

    edit.busy = true;
    renderExistingGallery();
    try {
      await apiJson("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          mediaId,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          slide: {
            name: edit.name.trim() || state.mediaById[mediaId]?.name,
            videoId: edit.videoId ? extractVideoId(edit.videoId) : "",
            fillDesktop: edit.fillDesktop,
            fillMobile: edit.fillMobile,
            focusX: edit.focusX,
            focusY: edit.focusY,
            ...extra,
          },
        }),
      });
      delete state.existingEdits[mediaId];
      await loadBootstrap(p.id);
      showBanner(`Saved slide "${edit.name}".`, "ok");
    } catch (err) {
      edit.busy = false;
      renderExistingGallery();
      showBanner(err.message, "err");
    }
  }

  function replaceExistingSlideImage(mediaId) {
    const p = getSelectedProject();
    const edit = getExistingEditState(mediaId);
    if (!p || !edit) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      edit.busy = true;
      renderExistingGallery();
      try {
        const compressed = await compressImageFile(file, getPresetConfig(els.compressionPreset.value));
        const formData = new FormData();
        formData.append("file", compressed.blob, compressed.fileName);
        formData.append("fileName", compressed.fileName);
        formData.append("fileHash", compressed.fileHash);
        formData.append("size", String(compressed.compressedSize));
        formData.append("width", String(compressed.width));
        formData.append("height", String(compressed.height));
        const asset = await apiJson("/api/upload-asset", { method: "POST", body: formData });

        await apiJson("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            mediaId,
            publishMode: els.publishMode.value,
            fieldMapOverride: state.fieldOverride,
            slide: {
              fileId: asset.fileId,
              url: asset.url,
              name: edit.name.trim(),
            },
          }),
        });
        delete state.existingEdits[mediaId];
        await loadBootstrap(p.id);
        showBanner(`Replaced image on "${edit.name}" (${formatBytes(compressed.compressedSize)}).`, "ok");
      } catch (err) {
        edit.busy = false;
        renderExistingGallery();
        showBanner(err.message, "err");
      }
    });
    input.click();
  }

  async function setProjectCover(mediaId) {
    const p = getSelectedProject();
    if (!p) return;
    try {
      await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          projectId: p.id,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          project: { coverId: mediaId },
        }),
      });
      await loadBootstrap(p.id);
      showBanner(`Updated cover slide for "${p.name}".`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    }
  }

  async function saveGalleryOrder() {
    const p = getSelectedProject();
    if (!p) return;
    els.saveGalleryOrderBtn.disabled = true;
    els.saveGalleryOrderBtn.textContent = "Saving…";
    try {
      await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          projectId: p.id,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          project: { galleryIds: state.galleryIds },
        }),
      });
      await loadBootstrap(p.id);
      showBanner(`Saved new slide order for "${p.name}".`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.saveGalleryOrderBtn.disabled = false;
      els.saveGalleryOrderBtn.textContent = "Save Gallery Order";
    }
  }

  function openSlideDeleteModal(mediaId) {
    const p = getSelectedProject();
    const m = state.mediaById[mediaId];
    if (!p || !m) return;
    state.pendingDeleteSlideId = mediaId;
    els.slideDeleteDesc.textContent = `Slide "${m.name}" (${mediaId})`;
    if (p.coverId === mediaId) {
      els.slideDeleteCoverWarn.hidden = false;
      els.slideDeleteCoverWarn.textContent =
        "This slide is currently the project's Cover. Removing it will automatically switch Cover to the next remaining slide.";
    } else {
      els.slideDeleteCoverWarn.hidden = true;
    }
    els.slideDeleteModal.hidden = false;
  }

  async function executeSlideRemoval(mode) {
    const p = getSelectedProject();
    const mediaId = state.pendingDeleteSlideId;
    if (!p || !mediaId) return;

    els.removeFromGalleryBtn.disabled = true;
    els.deleteMediaPermanentBtn.disabled = true;

    try {
      await apiJson("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "delete" ? "delete" : "remove-from-gallery",
          projectId: p.id,
          mediaId,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
        }),
      });
      els.slideDeleteModal.hidden = true;
      state.pendingDeleteSlideId = null;
      await loadBootstrap(p.id);
      showBanner(mode === "delete" ? "Slide permanently deleted from Webflow CMS." : "Slide removed from project's Gallery.", "ok");
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.removeFromGalleryBtn.disabled = false;
      els.deleteMediaPermanentBtn.disabled = false;
    }
  }

  // Upload Queue Management
  function makeQueueId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  function formatDefaultMediaName(baseName) {
    const project = getSelectedProject();
    const projectTitle = project?.name?.trim();
    const cleanBase = String(baseName || "").trim();
    if (projectTitle && cleanBase) return `${projectTitle} - ${cleanBase}`;
    return cleanBase || projectTitle || "Slide";
  }

  async function addFilesToQueue(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    const newItems = files.map((file) => {
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return {
        id: makeQueueId(),
        kind: "image",
        file,
        previewUrl: URL.createObjectURL(file),
        name: formatDefaultMediaName(baseName),
        alt: "",
        origSize: file.size,
        compressed: null,
        uploadedAsset: null,
        fillDesktop: false,
        fillMobile: false,
        focusX: 50,
        focusY: 50,
        status: "compressing",
        error: "",
      };
    });

    state.queue.push(...newItems);
    renderQueue();

    const preset = getPresetConfig(els.compressionPreset.value);
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
      name: formatDefaultMediaName(`Video ${videoId.slice(0, 8)}`),
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
    if (removed?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(removed.previewUrl);
    renderQueue();
  }

  function clearQueue() {
    for (const item of state.queue) {
      if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
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

  function renderQueue() {
    const hasItems = state.queue.length > 0;
    els.queueSection.hidden = !hasItems;
    els.actionBar.hidden = !hasItems || state.activeView !== "editor";

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
      if (item.file) {
        totalOrig += item.origSize || 0;
        if (item.compressed) totalCompressed += item.compressed.compressedSize;
      }
      if (item.status === "compressing") compressingCount += 1;
      if (item.status === "error") errorCount += 1;
      if (item.status === "uploaded") doneCount += 1;
    }

    els.queueHeading.textContent = `Queued New Slides (${state.queue.length})`;
    els.queueStats.textContent =
      totalOrig > 0
        ? `${formatBytes(totalOrig)} raw → ${formatBytes(totalCompressed)} compressed`
        : `${state.queue.length} slide(s) ready`;

    els.retryFailedBtn.hidden = errorCount === 0 || state.isUploading;
    els.uploadBtn.disabled = state.isUploading || compressingCount > 0 || !project;
    els.uploadBtn.textContent = state.isUploading
      ? "Uploading…"
      : compressingCount > 0
        ? `Compressing (${compressingCount})…`
        : `Upload & Add ${state.queue.length} Slide${state.queue.length === 1 ? "" : "s"}`;

    if (!state.isUploading) {
      els.progressSummary.textContent = project
        ? `Ready · Will add slides #${padTwo(startOrder)}–#${padTwo(startOrder + state.queue.length - 1)} to ${project.name}`
        : "Select a project first";
      els.progressFill.style.width = doneCount ? `${Math.round((doneCount / state.queue.length) * 100)}%` : "0%";
    }

    els.queueGrid.innerHTML = "";

    state.queue.forEach((item, idx) => {
      const card = document.createElement("article");
      card.className = `slide-card${item.status === "uploaded" ? " is-done" : ""}${item.status === "error" ? " is-error" : ""}`;
      card.draggable = !state.isUploading;

      card.addEventListener("focusin", (e) => {
        if (e.target.matches("input, textarea, select")) card.draggable = false;
      });
      card.addEventListener("focusout", () => {
        card.draggable = !state.isUploading;
      });
      card.addEventListener("dragstart", (e) => {
        if (e.target.closest("input, select, textarea, button")) {
          e.preventDefault();
          return;
        }
        state.dragQueueId = item.id;
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        state.dragQueueId = null;
        card.classList.remove("is-dragging");
        els.queueGrid.querySelectorAll(".is-drag-target").forEach((el) => el.classList.remove("is-drag-target"));
      });
      card.addEventListener("dragover", (e) => {
        if (!state.dragQueueId || state.dragQueueId === item.id) return;
        e.preventDefault();
        card.classList.add("is-drag-target");
      });
      card.addEventListener("dragleave", () => card.classList.remove("is-drag-target"));
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("is-drag-target");
        if (!state.dragQueueId || state.dragQueueId === item.id) return;
        const fromIdx = state.queue.findIndex((i) => i.id === state.dragQueueId);
        const toIdx = state.queue.findIndex((i) => i.id === item.id);
        if (fromIdx !== -1 && toIdx !== -1) moveQueueItem(fromIdx, toIdx);
      });

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "slide-thumb-wrap";

      if (item.kind === "video") {
        const img = document.createElement("img");
        img.src = item.previewUrl;
        img.alt = item.name;
        img.style.objectPosition = `${item.focusX}% ${item.focusY}%`;
        img.onerror = () => {
          img.remove();
          thumbWrap.appendChild(createVideoPlaceholder(item.videoId));
        };
        thumbWrap.appendChild(img);
      } else {
        const img = document.createElement("img");
        img.src = item.previewUrl;
        img.alt = item.name;
        img.style.objectPosition = `${item.focusX}% ${item.focusY}%`;
        thumbWrap.appendChild(img);
      }

      if (item.kind === "image" || item.file) {
        const dot = document.createElement("div");
        dot.className = "slide-focus-dot";
        dot.style.left = `${item.focusX}%`;
        dot.style.top = `${item.focusY}%`;
        thumbWrap.appendChild(dot);
      }

      const orderBadge = document.createElement("span");
      orderBadge.className = "slide-order-badge";
      orderBadge.textContent = `#${padTwo(startOrder + idx)}`;
      thumbWrap.appendChild(orderBadge);

      const statusBadge = document.createElement("span");
      statusBadge.className = `slide-state-badge${item.status === "uploaded" ? " is-done" : ""}${item.status === "error" ? " is-error" : ""}`;
      statusBadge.textContent = formatStatusLabel(item);
      thumbWrap.appendChild(statusBadge);

      const body = document.createElement("div");
      body.className = "slide-body";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = item.name;
      nameInput.disabled = state.isUploading;
      nameInput.placeholder = "Slide name";
      nameInput.addEventListener("input", () => { item.name = nameInput.value; });
      body.appendChild(nameInput);

      const metrics = document.createElement("div");
      metrics.className = "slide-metrics";
      if (item.kind === "video") {
        metrics.textContent = item.compressed
          ? `Bunny ID: ${item.videoId} · Poster ${formatBytes(item.compressed.compressedSize)}`
          : `Bunny ID: ${item.videoId}`;
      } else if (item.compressed) {
        metrics.textContent = `${formatBytes(item.origSize)} → ${formatBytes(item.compressed.compressedSize)} · ${item.compressed.width}×${item.compressed.height}`;
      } else {
        metrics.textContent = `${formatBytes(item.origSize)} · processing…`;
      }
      body.appendChild(metrics);

      const toggles = document.createElement("div");
      toggles.className = "slide-toggles";
      toggles.appendChild(createCheckbox("Fill Desktop", item.fillDesktop, state.isUploading, (v) => { item.fillDesktop = v; }));
      toggles.appendChild(createCheckbox("Fill Mobile", item.fillMobile, state.isUploading, (v) => { item.fillMobile = v; }));
      body.appendChild(toggles);

      if (item.error) {
        const errEl = document.createElement("div");
        errEl.className = "slide-error-msg";
        errEl.textContent = item.error;
        body.appendChild(errEl);
      }

      const actions = document.createElement("div");
      actions.className = "slide-actions slide-actions-wrap";

      const moveBtns = document.createElement("div");
      moveBtns.className = "slide-move-btns";
      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "icon-btn";
      leftBtn.textContent = "←";
      leftBtn.disabled = state.isUploading || idx === 0;
      leftBtn.addEventListener("click", () => moveQueueItem(idx, idx - 1));

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "icon-btn";
      rightBtn.textContent = "→";
      rightBtn.disabled = state.isUploading || idx === state.queue.length - 1;
      rightBtn.addEventListener("click", () => moveQueueItem(idx, idx + 1));
      moveBtns.appendChild(leftBtn);
      moveBtns.appendChild(rightBtn);
      actions.appendChild(moveBtns);

      if (item.kind === "video") {
        const posterBtn = document.createElement("button");
        posterBtn.type = "button";
        posterBtn.className = "icon-btn";
        posterBtn.textContent = item.file ? "Poster Set" : "Custom Poster";
        posterBtn.disabled = state.isUploading;
        posterBtn.addEventListener("click", () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file || !file.type.startsWith("image/")) return;
            if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
            item.file = file;
            item.previewUrl = URL.createObjectURL(file);
            item.origSize = file.size;
            item.compressed = null;
            item.uploadedAsset = null;
            item.error = "";
            item.status = "compressing";
            renderQueue();
            try {
              item.compressed = await compressImageFile(file, getPresetConfig(els.compressionPreset.value));
              item.status = "ready";
            } catch (err) {
              item.status = "error";
              item.error = err?.message || "Poster compression failed";
            }
            renderQueue();
          });
          input.click();
        });
        actions.appendChild(posterBtn);
      }

      if (item.kind === "image" || item.file) {
        const focusBtn = document.createElement("button");
        focusBtn.type = "button";
        focusBtn.className = "icon-btn";
        focusBtn.textContent = `Focus ${item.focusX}%/${item.focusY}%`;
        focusBtn.disabled = state.isUploading;
        focusBtn.addEventListener("click", () => openFocusModal({ kind: "queue", id: item.id }));
        actions.appendChild(focusBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "icon-btn is-danger";
      removeBtn.textContent = "✕";
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

  function createCheckbox(labelText, initial, disabled, onChange) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(initial);
    input.disabled = Boolean(disabled);
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

  async function startUpload(onlyFailed = false) {
    const project = getSelectedProject();
    if (!project || state.isUploading || !state.queue.length) return;

    showBanner("");
    state.isUploading = true;
    renderQueue();

    const preset = getPresetConfig(els.compressionPreset.value);
    const itemsToUpload = state.queue.filter((item) => {
      if (item.kind !== "image" && !item.file) return false;
      if (onlyFailed) return item.status === "error" || !item.uploadedAsset;
      return !item.uploadedAsset;
    });

    const totalSteps = itemsToUpload.length + 1;
    let completedSteps = 0;

    const updateProgress = (msg) => {
      const pct = Math.min(99, Math.round((completedSteps / totalSteps) * 100));
      els.progressFill.style.width = `${pct}%`;
      els.progressSummary.textContent = msg;
    };

    try {
      await runWithConcurrency(itemsToUpload, 3, async (item) => {
        try {
          item.error = "";
          if (!item.compressed) {
            item.status = "compressing";
            renderQueue();
            item.compressed = await compressImageFile(item.file, preset);
          }

          item.status = "uploading";
          renderQueue();
          updateProgress(`Uploading ${item.compressed.fileName}… (${completedSteps}/${totalSteps - 1})`);

          const formData = new FormData();
          formData.append("file", item.compressed.blob, item.compressed.fileName);
          formData.append("fileName", item.compressed.fileName);
          formData.append("fileHash", item.compressed.fileHash);
          formData.append("size", String(item.compressed.compressedSize));
          formData.append("width", String(item.compressed.width));
          formData.append("height", String(item.compressed.height));

          item.uploadedAsset = await apiJson("/api/upload-asset", { method: "POST", body: formData });
          item.status = "uploaded";
          completedSteps += 1;
          updateProgress(`Uploaded ${completedSteps}/${itemsToUpload.length} assets…`);
        } catch (err) {
          item.status = "error";
          item.error = err?.message || "Upload failed";
        }
        renderQueue();
      });

      const failedCount = state.queue.filter((i) => i.status === "error").length;
      if (failedCount > 0) {
        showBanner(`${failedCount} image(s) failed to upload. Click "Retry Failed".`, "err");
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
        ...(item.kind === "video" ? { videoId: item.videoId } : {}),
        ...(item.uploadedAsset ? { fileId: item.uploadedAsset.fileId, url: item.uploadedAsset.url } : {}),
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

      els.progressFill.style.width = "100%";
      clearQueue();
      await loadBootstrap(project.id);
      const coverMsg = result.assignedCoverId ? " Auto-assigned first slide as Cover." : "";
      const modeMsg = result.publishMode === "live"
        ? result.skippedProjectPublishBecauseDraft
          ? "Slides published (parent project is still a Draft)."
          : "Published live in Webflow."
        : "Saved as Staged in Webflow.";
      showBanner(`Added ${result.createdCount} slide(s) to "${result.projectName}".${coverMsg} ${modeMsg}`, "ok");
    } catch (err) {
      showBanner(err?.message || "Failed while creating Media CMS items.", "err");
    } finally {
      state.isUploading = false;
      renderQueue();
    }
  }

  // Front Page: Projects Directory, Quick Inline Fields & Drag Reordering
  function populateDirectoryFilters() {
    const typeVal = els.dirTypeFilter.value;
    fillProjectTypeSelect(els.dirTypeFilter, typeVal, "All Project Types");

    const catVal = els.dirCatFilter.value;
    els.dirCatFilter.innerHTML = '<option value="">All Categories</option>';
    for (const c of state.categories) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      els.dirCatFilter.appendChild(opt);
    }
    els.dirCatFilter.value = catVal;
  }

  function resetOrderDrafts() {
    state.orderDraftAll = state.projects.map((p) => p.id);
    state.orderDraftHome = state.projects
      .filter((p) => p.featured)
      .sort((a, b) => {
        if (a.featuredSequenceSort !== b.featuredSequenceSort) {
          return a.featuredSequenceSort - b.featuredSequenceSort;
        }
        return a.sequenceSort - b.sequenceSort;
      })
      .map((p) => p.id);
  }

  function getOrderChanges() {
    if (state.orderMode === "info") return [];
    const byId = new Map(state.projects.map((p) => [p.id, p]));
    if (state.orderMode === "all") {
      return state.orderDraftAll
        .map((id, idx) => ({ p: byId.get(id), newNum: idx + 1 }))
        .filter(({ p, newNum }) => p && Number(p.sequence) !== newNum);
    }
    return state.orderDraftHome
      .map((id, idx) => ({ p: byId.get(id), newNum: idx + 1 }))
      .filter(({ p, newNum }) => p && Number(p.featuredSequence) !== newNum);
  }

  function hasActiveDirFilters() {
    if (state.orderMode === "home" || state.orderMode === "info") return false;
    return Boolean(
      els.dirSearchInput.value.trim() ||
        els.dirTypeFilter.value ||
        els.dirCatFilter.value ||
        els.dirStatusFilter.value
    );
  }

  async function inlinePatchProjectRow(project, patch, feedbackEl = null) {
    if (feedbackEl) {
      feedbackEl.hidden = false;
      feedbackEl.textContent = "Saving…";
      feedbackEl.className = "meta-pill";
    }
    try {
      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          projectId: project.id,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          project: patch,
        }),
      });

      if (patch.name !== undefined) project.name = patch.name;
      if (patch.subtitle !== undefined) project.subtitle = patch.subtitle;
      if (patch.projectType !== undefined) project.projectType = patch.projectType;
      if (typeof patch.featured === "boolean") {
        project.featured = patch.featured;
        if (patch.featuredSequence !== undefined) {
          project.featuredSequence = patch.featuredSequence ?? "";
          project.featuredSequenceSort = patch.featuredSequence ?? Number.MAX_SAFE_INTEGER;
        }
        resetOrderDrafts();
        updateModeCounts();
      }
      if (res.isDraft !== undefined) project.isDraft = Boolean(res.isDraft);

      if (feedbackEl) {
        feedbackEl.textContent = res.published ? "Saved Live" : "Saved";
        feedbackEl.className = "meta-pill is-live";
        window.setTimeout(() => {
          if (feedbackEl.isConnected) feedbackEl.hidden = true;
        }, 1600);
      }
      return true;
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.textContent = "Error";
        feedbackEl.className = "meta-pill is-draft";
      }
      showBanner(err.message, "err");
      return false;
    }
  }

  function renderProjectOrderList() {
    const byId = new Map(state.projects.map((p) => [p.id, p]));
    const catNameById = new Map(state.categories.map((c) => [c.id, c.name]));

    const isHomeMode = state.orderMode === "home";
    const isInfoMode = state.orderMode === "info";

    els.orderModeAllBtn.classList.toggle("is-active", state.orderMode === "all");
    els.orderModeAllBtn.setAttribute("aria-selected", state.orderMode === "all" ? "true" : "false");
    els.orderModeHomeBtn.classList.toggle("is-active", isHomeMode);
    els.orderModeHomeBtn.setAttribute("aria-selected", isHomeMode ? "true" : "false");
    els.orderModeInfoBtn.classList.toggle("is-active", isInfoMode);
    els.orderModeInfoBtn.setAttribute("aria-selected", isInfoMode ? "true" : "false");

    if (els.orderToolbarPanel) {
      els.orderToolbarPanel.hidden = isInfoMode;
    }
    if (els.newProjectBtn) {
      els.newProjectBtn.hidden = isInfoMode;
    }
    els.dirFilterRow.hidden = isHomeMode || isInfoMode;

    if (isInfoMode) {
      els.projectOrderList.hidden = true;
      els.infoEditorSection.hidden = false;
      els.saveOrderBtn.hidden = true;
      els.resetOrderBtn.hidden = true;
      els.orderDirtyCount.hidden = true;
      els.clearDirFiltersBtn.hidden = true;
      els.dirOrderHint.textContent = "";
      els.topbarTitle.textContent = "Information";
      syncUrlHash();
      renderInformationEditor();
      return;
    }

    els.projectOrderList.hidden = false;
    els.infoEditorSection.hidden = true;
    els.topbarTitle.textContent = "Projects";
    syncUrlHash();

    const changes = getOrderChanges();
    const hasOrderChanges = changes.length > 0;
    els.saveOrderBtn.hidden = !hasOrderChanges;
    els.saveOrderBtn.disabled = !hasOrderChanges;
    els.resetOrderBtn.hidden = !hasOrderChanges;
    els.resetOrderBtn.disabled = !hasOrderChanges;
    els.orderDirtyCount.hidden = !hasOrderChanges;
    els.orderDirtyCount.textContent = `${changes.length} moved`;

    const filtersActive = hasActiveDirFilters();
    els.clearDirFiltersBtn.hidden = !filtersActive;
    els.dirOrderHint.textContent = filtersActive
      ? "Clear filters to drag-and-drop reorder Project Numbers."
      : isHomeMode
        ? "Drag rows or use ↑ / ↓ to reorder Homepage Featured projects. Homepage displays up to 12 items sorted by Featured sequence."
        : "Drag rows to reorder Project Numbers, edit Title / Sub-title / Type inline, or click any project to manage its gallery & upload media.";

    const sourceIds = isHomeMode ? state.orderDraftHome : state.orderDraftAll;
    const search = els.dirSearchInput.value.trim().toLowerCase();
    const typeFilter = els.dirTypeFilter.value;
    const catFilter = els.dirCatFilter.value;
    const statusFilter = els.dirStatusFilter.value;

    const visibleIds = sourceIds.filter((id) => {
      const p = byId.get(id);
      if (!p) return false;
      if (isHomeMode) return true;
      if (search && !`${p.sequence} ${p.name} ${p.subtitle} ${p.slug}`.toLowerCase().includes(search)) {
        return false;
      }
      if (typeFilter && p.projectType !== typeFilter) return false;
      if (catFilter && !p.categoryIds.includes(catFilter)) return false;
      if (statusFilter === "published" && p.isDraft) return false;
      if (statusFilter === "draft" && !p.isDraft) return false;
      if (statusFilter === "featured" && !p.featured) return false;
      return true;
    });

    els.projectOrderList.innerHTML = "";

    if (!visibleIds.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = isHomeMode
        ? 'No projects have "Feature in Home" enabled yet.'
        : "No projects match the current filters.";
      els.projectOrderList.appendChild(empty);
      return;
    }

    const canReorder = !filtersActive;

    visibleIds.forEach((id, visibleIdx) => {
      const p = byId.get(id);
      const listIdx = sourceIds.indexOf(id);
      const targetNum = listIdx + 1;
      const oldNum = isHomeMode ? p.featuredSequence : p.sequence;
      const numChanged = Number(oldNum) !== targetNum;

      const row = document.createElement("div");
      row.className = `project-row${canReorder ? " is-draggable" : ""}`;
      row.draggable = canReorder;

      row.addEventListener("focusin", (e) => {
        if (e.target.matches("input, select, textarea")) row.draggable = false;
      });
      row.addEventListener("focusout", () => {
        row.draggable = canReorder;
      });

      if (canReorder) {
        row.addEventListener("dragstart", (e) => {
          if (e.target.closest("input, select, textarea, button")) {
            e.preventDefault();
            return;
          }
          state.dragOrderProjectId = id;
          row.classList.add("is-dragging");
          e.dataTransfer.effectAllowed = "move";
        });
        row.addEventListener("dragend", () => {
          state.dragOrderProjectId = null;
          row.classList.remove("is-dragging");
          els.projectOrderList.querySelectorAll(".is-drag-target").forEach((el) => el.classList.remove("is-drag-target"));
        });
        row.addEventListener("dragover", (e) => {
          if (!state.dragOrderProjectId || state.dragOrderProjectId === id) return;
          e.preventDefault();
          row.classList.add("is-drag-target");
        });
        row.addEventListener("dragleave", () => row.classList.remove("is-drag-target"));
        row.addEventListener("drop", (e) => {
          e.preventDefault();
          row.classList.remove("is-drag-target");
          if (!state.dragOrderProjectId || state.dragOrderProjectId === id) return;
          const arr = isHomeMode ? state.orderDraftHome : state.orderDraftAll;
          const fromIdx = arr.indexOf(state.dragOrderProjectId);
          const toIdx = arr.indexOf(id);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, moved);
            renderProjectOrderList();
          }
        });
      }

      const handle = document.createElement("div");
      handle.className = "project-row-handle";
      handle.title = canReorder ? "Drag to reorder" : "Clear filters to drag";
      handle.textContent = canReorder ? "⋮⋮" : "·";
      row.appendChild(handle);

      const numCell = document.createElement("div");
      numCell.className = "project-row-num";
      numCell.textContent = `#${padTwo(targetNum)}`;
      row.appendChild(numCell);

      const thumbBtn = document.createElement("button");
      thumbBtn.type = "button";
      thumbBtn.className = "row-open-thumb";
      thumbBtn.title = `Open ${p.name}`;
      const thumb = document.createElement("img");
      thumb.className = "project-row-thumb";
      if (p.coverUrl) {
        thumb.src = p.coverUrl;
        thumb.alt = p.name;
      }
      thumbBtn.appendChild(thumb);
      thumbBtn.addEventListener("click", () => openProjectEditor(p.id));
      row.appendChild(thumbBtn);

      // Inline editable Title + Sub-title + Meta badges
      const info = document.createElement("div");
      info.className = "project-row-info";

      const inputsRow = document.createElement("div");
      inputsRow.className = "project-row-inputs";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "inline-input inline-input-title";
      titleInput.value = p.name;
      titleInput.placeholder = "Title *";

      const subInput = document.createElement("input");
      subInput.type = "text";
      subInput.className = "inline-input inline-input-sub";
      subInput.value = p.subtitle || "";
      subInput.placeholder = "Sub-title (optional)";

      inputsRow.appendChild(titleInput);
      inputsRow.appendChild(subInput);
      info.appendChild(inputsRow);

      const metaLine = document.createElement("div");
      metaLine.className = "project-row-meta";

      const slidesCountSpan = document.createElement("span");
      slidesCountSpan.textContent = `${p.existingSlideCount} slides`;
      metaLine.appendChild(slidesCountSpan);

      const cats = p.categoryIds.map((cid) => catNameById.get(cid)).filter(Boolean);
      if (cats.length) {
        const catSpan = document.createElement("span");
        catSpan.textContent = `· ${cats.join(", ")}`;
        metaLine.appendChild(catSpan);
      }

      const statusBtn = document.createElement("button");
      statusBtn.type = "button";
      statusBtn.className = `meta-pill meta-pill-btn ${p.isDraft ? "is-draft" : "is-live"}`;
      statusBtn.textContent = p.isDraft ? "Draft" : "Live";
      statusBtn.title = p.isDraft ? "Click to publish live" : "Click to move to Draft";
      statusBtn.addEventListener("click", async () => {
        statusBtn.disabled = true;
        try {
          const action = p.isDraft ? "publish" : "unpublish";
          if (action === "unpublish" && !window.confirm(`Move "${p.name}" to Draft?`)) {
            statusBtn.disabled = false;
            return;
          }
          await apiJson("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, projectId: p.id, fieldMapOverride: state.fieldOverride }),
          });
          p.isDraft = !p.isDraft;
          statusBtn.textContent = p.isDraft ? "Draft" : "Live";
          statusBtn.className = `meta-pill meta-pill-btn ${p.isDraft ? "is-draft" : "is-live"}`;
          showBanner(p.isDraft ? `Moved "${p.name}" to Draft.` : `Published "${p.name}" & its slides live.`, "ok");
        } catch (err) {
          showBanner(err.message, "err");
        } finally {
          statusBtn.disabled = false;
        }
      });
      metaLine.appendChild(statusBtn);

      if (numChanged) {
        const movedPill = document.createElement("span");
        movedPill.className = "meta-pill is-moved";
        movedPill.textContent = `was #${oldNum === "" ? "--" : padTwo(oldNum)}`;
        metaLine.appendChild(movedPill);
      }

      if (isHomeMode && targetNum > 12) {
        const limitPill = document.createElement("span");
        limitPill.className = "meta-pill is-draft";
        limitPill.textContent = "Over 12-item Home limit";
        metaLine.appendChild(limitPill);
      }

      const rowSavePill = document.createElement("span");
      rowSavePill.className = "meta-pill";
      rowSavePill.hidden = true;
      metaLine.appendChild(rowSavePill);

      const inlineSaveBtn = document.createElement("button");
      inlineSaveBtn.type = "button";
      inlineSaveBtn.className = "icon-btn";
      inlineSaveBtn.textContent = "Save";
      inlineSaveBtn.hidden = true;
      metaLine.appendChild(inlineSaveBtn);

      const commitTextChanges = async () => {
        const nextName = titleInput.value.trim();
        const nextSub = subInput.value.trim();
        if (!nextName) {
          showBanner("Project Title cannot be empty.", "err");
          titleInput.value = p.name;
          inlineSaveBtn.hidden = true;
          return;
        }
        if (nextName === p.name && nextSub === (p.subtitle || "")) {
          inlineSaveBtn.hidden = true;
          return;
        }
        inlineSaveBtn.disabled = true;
        const ok = await inlinePatchProjectRow(p, { name: nextName, subtitle: nextSub }, rowSavePill);
        inlineSaveBtn.disabled = false;
        if (ok) inlineSaveBtn.hidden = true;
      };

      const checkTextDirty = () => {
        const changed = titleInput.value.trim() !== p.name || subInput.value.trim() !== (p.subtitle || "");
        inlineSaveBtn.hidden = !changed;
      };
      titleInput.addEventListener("input", checkTextDirty);
      subInput.addEventListener("input", checkTextDirty);
      titleInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); commitTextChanges(); } });
      subInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); commitTextChanges(); } });
      inlineSaveBtn.addEventListener("click", commitTextChanges);

      info.appendChild(metaLine);
      row.appendChild(info);

      // Inline Project Type selector
      const typeSelect = document.createElement("select");
      typeSelect.className = "inline-select";
      typeSelect.title = "Project Type";
      fillProjectTypeSelect(typeSelect, p.projectType, "(Type)");
      typeSelect.addEventListener("change", async () => {
        const prev = p.projectType;
        typeSelect.disabled = true;
        const ok = await inlinePatchProjectRow(p, { projectType: typeSelect.value }, rowSavePill);
        if (!ok) typeSelect.value = prev || "";
        typeSelect.disabled = false;
      });
      row.appendChild(typeSelect);

      // Quick Home feature toggle
      const homeBtn = document.createElement("button");
      homeBtn.type = "button";
      homeBtn.className = "icon-btn";
      homeBtn.textContent = p.featured ? "★ Home" : "☆ Home";
      homeBtn.title = p.featured ? "Remove from Homepage Featured" : "Feature on Homepage";
      homeBtn.addEventListener("click", async () => {
        homeBtn.disabled = true;
        const nextFeatured = !p.featured;
        const nextHomeSeq = nextFeatured ? state.orderDraftHome.length + 1 : null;
        await inlinePatchProjectRow(
          p,
          { featured: nextFeatured, featuredSequence: nextHomeSeq },
          rowSavePill
        );
        renderProjectOrderList();
      });
      row.appendChild(homeBtn);

      // Order up/down buttons
      const moveBox = document.createElement("div");
      moveBox.className = "slide-move-btns";
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "icon-btn";
      upBtn.textContent = "↑";
      upBtn.disabled = !canReorder || visibleIdx === 0;
      upBtn.addEventListener("click", () => {
        const arr = isHomeMode ? state.orderDraftHome : state.orderDraftAll;
        const [m] = arr.splice(listIdx, 1);
        arr.splice(listIdx - 1, 0, m);
        renderProjectOrderList();
      });

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "icon-btn";
      downBtn.textContent = "↓";
      downBtn.disabled = !canReorder || listIdx >= sourceIds.length - 1;
      downBtn.addEventListener("click", () => {
        const arr = isHomeMode ? state.orderDraftHome : state.orderDraftAll;
        const [m] = arr.splice(listIdx, 1);
        arr.splice(listIdx + 1, 0, m);
        renderProjectOrderList();
      });
      moveBox.appendChild(upBtn);
      moveBox.appendChild(downBtn);
      row.appendChild(moveBox);

      // Open project button
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-secondary btn-sm";
      editBtn.textContent = "Open →";
      editBtn.addEventListener("click", () => openProjectEditor(p.id));
      row.appendChild(editBtn);

      els.projectOrderList.appendChild(row);
    });
  }

  async function saveOrderChanges() {
    const changes = getOrderChanges();
    if (!changes.length) return;
    els.saveOrderBtn.disabled = true;
    els.saveOrderBtn.textContent = "Saving…";

    try {
      const isHomeMode = state.orderMode === "home";
      const updates = changes.map(({ p, newNum }) => ({
        id: p.id,
        isDraft: p.isDraft,
        ...(isHomeMode ? { featured: true, featuredSequence: newNum } : { sequence: newNum }),
      }));

      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          updates,
        }),
      });

      await loadBootstrap();
      showBanner(
        `Saved order for ${res.updatedCount} project(s)${res.publishedCount ? ` and published ${res.publishedCount} live` : " (staged)"}.`,
        "ok"
      );
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.saveOrderBtn.textContent = "Save Order";
      els.saveOrderBtn.disabled = getOrderChanges().length === 0;
    }
  }

  // Information Page CMS Helpers
  const INFO_SECTIONS = [
    { key: "servicesRows", title: "Services", textPlaceholder: "e.g. Set Design", urlPlaceholder: "Link (Optional)" },
    { key: "locationRows", title: "Location", textPlaceholder: "e.g. New York", urlPlaceholder: "Link (Optional)" },
    { key: "contactRows", title: "Contact", textPlaceholder: "e.g. mail@milenagorum.com", urlPlaceholder: "Link (Optional)" },
    { key: "pressRows", title: "Press", textPlaceholder: "e.g. Exibart", urlPlaceholder: "Link (Optional)" },
    { key: "interviewsRows", title: "Interviews", textPlaceholder: "e.g. Interview 1, Another", urlPlaceholder: "Link (Optional)" },
  ];

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseRichTextToRows(html) {
    if (!html || typeof html !== "string") return [];
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    const rows = [];

    const extractNode = (node) => {
      const a = node.querySelector("a");
      const text = (a ? a.textContent : node.textContent || "").trim();
      const url = a ? (a.getAttribute("href") || "").trim() : "";
      if (text || url) {
        rows.push({ text: text || url, url });
      }
    };

    const blocks = div.querySelectorAll("p, li, div, h1, h2, h3, h4, h5, h6");
    if (blocks.length > 0) {
      blocks.forEach((b) => {
        const raw = b.innerHTML;
        if (/<br\s*[\/]?>/i.test(raw) && !b.querySelector("a")) {
          raw.split(/<br\s*[\/]?>/i).forEach((chunk) => {
            const temp = document.createElement("div");
            temp.innerHTML = chunk;
            extractNode(temp);
          });
        } else {
          extractNode(b);
        }
      });
    } else {
      html.split(/<br\s*[\/]?>|\n+/i).forEach((chunk) => {
        const temp = document.createElement("div");
        temp.innerHTML = chunk;
        extractNode(temp);
      });
    }

    return rows;
  }

  function rowsToRichTextHtml(rows) {
    if (!Array.isArray(rows) || !rows.length) return "";
    const out = [];
    for (const r of rows) {
      const text = String(r?.text || "").trim();
      let url = String(r?.url || "").trim();
      if (!text && !url) continue;

      const label = text || url;
      if (url) {
        if (url.includes("@") && !url.startsWith("mailto:") && !url.startsWith("http://") && !url.startsWith("https://")) {
          url = `mailto:${url}`;
        } else if (!/^[a-z]+:\/\//i.test(url) && !url.startsWith("mailto:") && !url.startsWith("#") && !url.startsWith("/")) {
          url = `https://${url}`;
        }
        out.push(`<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`);
      } else {
        out.push(`<p>${escapeHtml(label)}</p>`);
      }
    }
    return out.join("");
  }

  function normalizeBioRichText(html) {
    if (!html || !html.trim()) return "";
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    div.querySelectorAll("a").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      let href = (a.getAttribute("href") || "").trim();
      if (href && href.includes("@") && !href.startsWith("mailto:") && !href.startsWith("http://") && !href.startsWith("https://")) {
        a.setAttribute("href", `mailto:${href}`);
      } else if (href && !/^[a-z]+:\/\//i.test(href) && !href.startsWith("mailto:") && !href.startsWith("#") && !href.startsWith("/")) {
        a.setAttribute("href", `https://${href}`);
      }
    });
    if (!div.querySelector("p, div, h1, h2, h3, h4, h5, h6, ul, ol")) {
      const trimmed = div.innerHTML.trim();
      return trimmed ? `<p>${trimmed}</p>` : "";
    }
    return div.innerHTML.trim();
  }

  function syncInfoDraftFromBootstrap() {
    const info = state.information;
    const hasCollection = Boolean(state.bootstrap?.collections?.information);
    if (!info && !hasCollection) {
      state.infoDraft = null;
      setInfoDirty(false);
      return;
    }
    state.infoDraft = {
      id: info?.id || null,
      name: info?.name || "Milena Gorum",
      slug: info?.slug || "milena-gorum",
      isDraft: Boolean(info?.isDraft),
      profilePicture: info?.profilePicture ? { ...info.profilePicture } : null,
      infoHtml: info?.infoHtml || "",
      servicesRows: parseRichTextToRows(info?.servicesHtml),
      locationRows: parseRichTextToRows(info?.locationHtml),
      contactRows: parseRichTextToRows(info?.contactHtml),
      pressRows: parseRichTextToRows(info?.pressHtml),
      interviewsRows: parseRichTextToRows(info?.interviewsHtml),
    };
    setInfoDirty(false);
  }

  function setInfoDirty(dirty) {
    state.infoDirty = dirty;
    els.infoDirtyBadge.hidden = !dirty;
    els.saveInfoBtn.disabled = !dirty;
  }

  function renderInformationEditor() {
    const draft = state.infoDraft;
    if (!draft) return;

    els.infoItemHeading.textContent = draft.name || "Information";
    els.infoStatusPill.textContent = draft.isDraft ? "Draft" : "Live";
    els.infoStatusPill.className = `status-pill ${draft.isDraft ? "is-draft" : "is-ok"}`;

    if (draft.profilePicture?.url) {
      els.infoPicPreview.src = draft.profilePicture.url;
      els.infoPicPreview.hidden = false;
      els.infoPicEmpty.hidden = true;
      els.removeInfoPicBtn.hidden = false;
    } else {
      els.infoPicPreview.removeAttribute("src");
      els.infoPicPreview.hidden = true;
      els.infoPicEmpty.hidden = false;
      els.removeInfoPicBtn.hidden = true;
    }

    if (document.activeElement !== els.infoBioEditor) {
      els.infoBioEditor.innerHTML = draft.infoHtml || "";
    }

    renderInfoListsGrid();
  }

  function renderInfoListsGrid() {
    const draft = state.infoDraft;
    if (!draft) return;
    els.infoListsGrid.innerHTML = "";

    INFO_SECTIONS.forEach(({ key, title, textPlaceholder, urlPlaceholder }) => {
      const rows = draft[key] || [];
      const panel = document.createElement("section");
      panel.className = "panel info-list-panel";

      const header = document.createElement("div");
      header.className = "info-list-header";
      const h3 = document.createElement("h3");
      h3.textContent = `${title} (${rows.length})`;
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-ghost btn-sm";
      addBtn.textContent = `+ Add ${title.replace(/s$/, "")}`;
      addBtn.addEventListener("click", () => {
        rows.push({ text: "", url: "" });
        setInfoDirty(true);
        renderInfoListsGrid();
        const inputs = panel.querySelectorAll(".info-row-text");
        const lastInput = inputs[inputs.length - 1];
        if (lastInput) lastInput.focus();
      });

      header.appendChild(h3);
      header.appendChild(addBtn);
      panel.appendChild(header);

      const stack = document.createElement("div");
      stack.className = "info-rows-stack";

      if (!rows.length) {
        const empty = document.createElement("p");
        empty.className = "field-hint";
        empty.style.margin = "4px 0 0";
        empty.textContent = `No items yet. Click "+ Add ${title.replace(/s$/, "")}" to add the first row.`;
        stack.appendChild(empty);
      } else {
        rows.forEach((row, idx) => {
          const itemEl = document.createElement("div");
          itemEl.className = "info-row-item";

          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.className = "inline-input info-row-text";
          textInput.value = row.text || "";
          textInput.placeholder = textPlaceholder;
          textInput.addEventListener("input", () => {
            row.text = textInput.value;
            setInfoDirty(true);
          });

          const urlInput = document.createElement("input");
          urlInput.type = "text";
          urlInput.className = "inline-input info-row-url";
          urlInput.value = row.url || "";
          urlInput.placeholder = urlPlaceholder;
          urlInput.addEventListener("input", () => {
            row.url = urlInput.value;
            setInfoDirty(true);
          });

          const controls = document.createElement("div");
          controls.className = "info-row-controls";

          const upBtn = document.createElement("button");
          upBtn.type = "button";
          upBtn.className = "icon-btn";
          upBtn.textContent = "↑";
          upBtn.disabled = idx === 0;
          upBtn.addEventListener("click", () => {
            const [m] = rows.splice(idx, 1);
            rows.splice(idx - 1, 0, m);
            setInfoDirty(true);
            renderInfoListsGrid();
          });

          const downBtn = document.createElement("button");
          downBtn.type = "button";
          downBtn.className = "icon-btn";
          downBtn.textContent = "↓";
          downBtn.disabled = idx === rows.length - 1;
          downBtn.addEventListener("click", () => {
            const [m] = rows.splice(idx, 1);
            rows.splice(idx + 1, 0, m);
            setInfoDirty(true);
            renderInfoListsGrid();
          });

          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "icon-btn is-danger";
          delBtn.textContent = "✕";
          delBtn.title = "Delete row";
          delBtn.addEventListener("click", () => {
            rows.splice(idx, 1);
            setInfoDirty(true);
            renderInfoListsGrid();
          });

          controls.appendChild(upBtn);
          controls.appendChild(downBtn);
          controls.appendChild(delBtn);

          itemEl.appendChild(textInput);
          itemEl.appendChild(urlInput);
          itemEl.appendChild(controls);
          stack.appendChild(itemEl);
        });
      }

      panel.appendChild(stack);
      els.infoListsGrid.appendChild(panel);
    });
  }

  async function saveInformationChanges() {
    const draft = state.infoDraft;
    if (!draft) return;
    els.saveInfoBtn.disabled = true;
    els.saveInfoBtn.textContent = "Saving…";

    try {
      const bioHtml = normalizeBioRichText(els.infoBioEditor.innerHTML);
      draft.infoHtml = bioHtml;

      const payload = {
        name: draft.name,
        slug: draft.slug,
        profilePicture: draft.profilePicture,
        infoHtml: bioHtml,
        servicesHtml: rowsToRichTextHtml(draft.servicesRows),
        locationHtml: rowsToRichTextHtml(draft.locationRows),
        contactHtml: rowsToRichTextHtml(draft.contactRows),
        pressHtml: rowsToRichTextHtml(draft.pressRows),
        interviewsHtml: rowsToRichTextHtml(draft.interviewsRows),
      };

      const res = await apiJson("/api/information", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          itemId: draft.id,
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          information: payload,
        }),
      });

      await loadBootstrap();
      setInfoDirty(false);
      showBanner(
        res.published ? "Saved Information and published live." : "Saved Information as staged.",
        "ok"
      );
    } catch (err) {
      showBanner(err.message, "err");
      els.saveInfoBtn.disabled = false;
    } finally {
      els.saveInfoBtn.textContent = "Save Information";
    }
  }

  // Focal Point Modal (shared between queue & existing slides)
  function getFocusTargetItem() {
    if (!state.focusTarget) return null;
    if (state.focusTarget.kind === "queue") {
      return state.queue.find((i) => i.id === state.focusTarget.id) || null;
    }
    return getExistingEditState(state.focusTarget.id);
  }

  function openFocusModal(target) {
    let src = "";
    let fx = 50;
    let fy = 50;
    let prevDirty = false;

    if (target.kind === "queue") {
      const item = state.queue.find((i) => i.id === target.id);
      if (!item) return;
      src = item.previewUrl;
      fx = item.focusX;
      fy = item.focusY;
    } else {
      const m = state.mediaById[target.id];
      const edit = getExistingEditState(target.id);
      if (!m || !edit) return;
      src = m.imageUrl || (edit.videoId ? `${BUNNY_CDN_BASE}/${extractVideoId(edit.videoId)}/thumbnail.jpg` : "");
      fx = edit.focusX;
      fy = edit.focusY;
      prevDirty = Boolean(edit.dirty);
    }

    state.focusTarget = { ...target, prevX: fx, prevY: fy, prevDirty };
    els.focusPreviewImg.src = src;
    updateFocusModalUI(fx, fy);
    els.focusModal.hidden = false;
  }

  function updateFocusModalUI(fx, fy) {
    els.focusCrosshair.style.left = `${fx}%`;
    els.focusCrosshair.style.top = `${fy}%`;
    els.focusCoordsText.textContent = `Focus: ${fx}% × ${fy}%`;
  }

  function closeFocusModal(revert = false) {
    const target = state.focusTarget;
    if (revert && target) {
      const item = getFocusTargetItem();
      if (item) {
        item.focusX = target.prevX;
        item.focusY = target.prevY;
        if (target.kind === "existing") item.dirty = target.prevDirty;
      }
    }
    const kind = target?.kind;
    state.focusTarget = null;
    els.focusModal.hidden = true;
    if (kind === "queue") renderQueue();
    else if (kind === "existing") renderExistingGallery();
  }

  // Schema Modal
  function openSchemaModal() {
    if (!state.bootstrap) return;
    const { collections } = state.bootstrap;
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

    const projTitle = document.createElement("h4");
    projTitle.style.margin = "0";
    projTitle.textContent = `Projects Collection: ${collections.projects.displayName}`;
    els.schemaBody.appendChild(projTitle);

    const projGrid = document.createElement("div");
    projGrid.className = "schema-grid";
    const pDefs = [
      ["sequence", "Project Number (Number)"],
      ["subtitle", "Sub-title (PlainText)"],
      ["details", "Project Details (Text)"],
      ["projectType", "Project Type (Option)"],
      ["category", "Category (MultiReference)"],
      ["gallery", "Gallery (MultiReference -> Media)"],
      ["cover", "Cover (Reference -> Media)"],
      ["featured", "Feature in Home (Switch)"],
      ["featuredSequence", "Featured sequence (Number)"],
    ];
    for (const [key, label] of pDefs) {
      projGrid.appendChild(makeSelect("projects", key, label, collections.projects.fields, effective.projects[key]));
    }
    els.schemaBody.appendChild(projGrid);

    const mediaTitle = document.createElement("h4");
    mediaTitle.style.margin = "10px 0 0";
    mediaTitle.textContent = `Media Collection: ${collections.media.displayName}`;
    els.schemaBody.appendChild(mediaTitle);

    const mediaGrid = document.createElement("div");
    mediaGrid.className = "schema-grid";
    const mDefs = [
      ["image", "Image / Thumbnail (Image)"],
      ["videoId", "Bunny Video ID (PlainText)"],
      ["fillDesktop", "Fill Screen Desktop (Switch)"],
      ["fillMobile", "Fill Screen Mobile (Switch)"],
      ["focusX", "Focus Coordinates X (%)"],
      ["focusY", "Focus Coordinates Y (%)"],
      ["alt", "Dedicated Alt Text (Optional)"],
      ["parent", "Legacy Parent Ref (Optional)"],
      ["order", "Legacy Order Number (Optional)"],
    ];
    for (const [key, label] of mDefs) {
      mediaGrid.appendChild(makeSelect("media", key, label, collections.media.fields, effective.media[key]));
    }
    els.schemaBody.appendChild(mediaGrid);

    if (collections.information) {
      const infoTitle = document.createElement("h4");
      infoTitle.style.margin = "10px 0 0";
      infoTitle.textContent = `Information Collection: ${collections.information.displayName}`;
      els.schemaBody.appendChild(infoTitle);

      const infoGrid = document.createElement("div");
      infoGrid.className = "schema-grid";
      const iDefs = [
        ["profilePicture", "Profile Picture (Image)"],
        ["info", "Info / Bio (RichText)"],
        ["services", "Services (RichText)"],
        ["location", "Location (RichText)"],
        ["contact", "Contact (RichText)"],
        ["press", "Press (RichText)"],
        ["interviews", "Interviews (RichText)"],
      ];
      for (const [key, label] of iDefs) {
        infoGrid.appendChild(makeSelect("information", key, label, collections.information.fields, effective.information?.[key]));
      }
      els.schemaBody.appendChild(infoGrid);
    }

    els.schemaModal.hidden = false;
  }

  // New Project Modal
  function openNewProjectModal() {
    els.newProjError.hidden = true;
    els.newProjName.value = "";
    els.newProjSlug.value = "";
    state.newProjSlugManual = false;
    const nums = state.projects.map((p) => Number(p.sequence)).filter((n) => Number.isFinite(n));
    els.newProjSeq.value = String((nums.length ? Math.max(...nums) : state.projects.length) + 1);
    els.newProjSubtitle.value = "";
    els.newProjDetails.value = "";
    els.newProjFeatured.checked = false;
    fillProjectTypeSelect(els.newProjType, "", null);
    renderCategoryPills(els.newProjCategories, []);
    els.newProjectModal.hidden = false;
    els.newProjName.focus();
  }

  // Event Listeners
  initPublishMode();

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
      if (authData?.token) saveSessionToken(authData.token);
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
    await fetch("/api/auth", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    setAuthenticated(false);
  });

  els.backToProjectsBtn.addEventListener("click", showProjectsView);
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#information" && state.bootstrap?.collections?.information) {
      state.activeView = "projects";
      state.orderMode = "info";
      els.projectsView.hidden = false;
      els.editorView.hidden = true;
      els.backToProjectsBtn.hidden = true;
      renderProjectOrderList();
      return;
    }
    const match = window.location.hash.match(/^#project=([^&]+)/);
    if (match && state.projects.length) {
      openProjectEditor(decodeURIComponent(match[1]));
    } else if (state.projects.length && (state.activeView !== "projects" || state.orderMode === "info")) {
      showProjectsView();
    }
  });

  els.refreshBtn.addEventListener("click", () => loadBootstrap(state.activeView === "editor" ? state.selectedProjectId : null));

  els.publishMode.addEventListener("change", () => {
    try {
      localStorage.setItem(PUBLISH_MODE_KEY, els.publishMode.value);
    } catch {
      // ignore
    }
  });

  els.publishSiteBtn.addEventListener("click", async () => {
    if (!window.confirm("Trigger a full Webflow site publish now?")) return;
    els.publishSiteBtn.disabled = true;
    els.publishSiteBtn.textContent = "Publishing…";
    try {
      await apiJson("/api/publish-site", { method: "POST" });
      showBanner("Triggered full Webflow site publish.", "ok");
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.publishSiteBtn.disabled = false;
      els.publishSiteBtn.textContent = "Publish Site";
    }
  });

  [
    els.editProjName,
    els.editProjSlug,
    els.editProjSeq,
    els.editProjSubtitle,
    els.editProjType,
    els.editProjCover,
    els.editProjDetails,
    els.editProjFeatured,
    els.editProjFeaturedSeq,
  ].forEach((el) => {
    el.addEventListener("input", () => setProjectDirty(true));
    el.addEventListener("change", () => setProjectDirty(true));
  });

  els.saveProjectDetailsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveProjectDetails();
  });

  els.publishProjectBtn.addEventListener("click", async () => {
    const p = getSelectedProject();
    if (!p) return;
    els.publishProjectBtn.disabled = true;
    try {
      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", projectId: p.id, fieldMapOverride: state.fieldOverride }),
      });
      await loadBootstrap(p.id);
      showBanner(`Published "${p.name}" and ${res.publishedMediaCount} gallery slide(s) live.`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.publishProjectBtn.disabled = false;
    }
  });

  els.unpublishProjectBtn.addEventListener("click", async () => {
    const p = getSelectedProject();
    if (!p || !window.confirm(`Unpublish "${p.name}" and move it to Draft?`)) return;
    try {
      await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish", projectId: p.id, fieldMapOverride: state.fieldOverride }),
      });
      await loadBootstrap(p.id);
      showBanner(`Moved "${p.name}" to Draft.`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    }
  });

  els.deleteProjectBtn.addEventListener("click", async () => {
    const p = getSelectedProject();
    if (
      !p ||
      !window.confirm(
        `Permanently delete project "${p.name}" along with its unshared Media items and image files from Webflow CMS?`
      )
    ) {
      return;
    }
    try {
      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", projectId: p.id, fieldMapOverride: state.fieldOverride }),
      });
      state.selectedProjectId = "";
      state.activeView = "projects";
      await loadBootstrap();
      syncUrlHash();
      const mediaNote = res.deletedMediaCount
        ? ` along with ${res.deletedMediaCount} media item(s) and ${res.deletedAssetCount || 0} asset file(s)`
        : "";
      showBanner(`Deleted project "${p.name}"${mediaNote}.`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    }
  });

  els.saveGalleryOrderBtn.addEventListener("click", saveGalleryOrder);
  els.resetGalleryOrderBtn.addEventListener("click", () => {
    const p = getSelectedProject();
    state.galleryIds = p ? [...(p.galleryIds || [])] : [];
    renderExistingGallery();
  });

  // Batch Queue Listeners
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
  els.dropZone.addEventListener("dragleave", () => els.dropZone.classList.remove("is-dragover"));
  els.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropZone.classList.remove("is-dragover");
    if (e.dataTransfer?.files?.length) addFilesToQueue(e.dataTransfer.files);
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
  els.clearQueueBtn.addEventListener("click", () => { if (!state.isUploading) clearQueue(); });
  els.uploadBtn.addEventListener("click", () => startUpload(false));
  els.retryFailedBtn.addEventListener("click", () => startUpload(true));

  // Focus Modal Listeners
  els.focusStage.addEventListener("click", (e) => {
    const item = getFocusTargetItem();
    if (!item) return;
    const rect = els.focusPreviewImg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    item.focusX = xPct;
    item.focusY = yPct;
    if (state.focusTarget?.kind === "existing") item.dirty = true;
    updateFocusModalUI(xPct, yPct);
  });

  els.resetFocusBtn.addEventListener("click", () => {
    const item = getFocusTargetItem();
    if (!item) return;
    item.focusX = 50;
    item.focusY = 50;
    if (state.focusTarget?.kind === "existing") item.dirty = true;
    updateFocusModalUI(50, 50);
  });
  els.closeFocusModalBtn.addEventListener("click", () => closeFocusModal(true));
  els.doneFocusBtn.addEventListener("click", () => closeFocusModal(false));

  // Directory & Order Listeners
  els.orderModeAllBtn.addEventListener("click", () => {
    state.orderMode = "all";
    renderProjectOrderList();
  });
  els.orderModeHomeBtn.addEventListener("click", () => {
    state.orderMode = "home";
    renderProjectOrderList();
  });
  els.orderModeInfoBtn.addEventListener("click", () => {
    state.orderMode = "info";
    renderProjectOrderList();
  });
  [els.dirSearchInput, els.dirTypeFilter, els.dirCatFilter, els.dirStatusFilter].forEach((el) => {
    el.addEventListener("input", renderProjectOrderList);
    el.addEventListener("change", renderProjectOrderList);
  });
  els.clearDirFiltersBtn.addEventListener("click", () => {
    els.dirSearchInput.value = "";
    els.dirTypeFilter.value = "";
    els.dirCatFilter.value = "";
    els.dirStatusFilter.value = "";
    renderProjectOrderList();
  });
  els.resetOrderBtn.addEventListener("click", () => {
    resetOrderDrafts();
    renderProjectOrderList();
  });
  els.saveOrderBtn.addEventListener("click", saveOrderChanges);

  // Schema Modal Listeners
  els.schemaBtn.addEventListener("click", openSchemaModal);
  els.closeSchemaModalBtn.addEventListener("click", () => { els.schemaModal.hidden = true; });
  els.resetSchemaBtn.addEventListener("click", () => {
    saveFieldOverride(null);
    els.schemaModal.hidden = true;
    loadBootstrap(state.activeView === "editor" ? state.selectedProjectId : null);
  });
  els.saveSchemaBtn.addEventListener("click", () => {
    const override = { projects: {}, media: {}, information: {} };
    els.schemaBody.querySelectorAll("select[data-group]").forEach((sel) => {
      if (!override[sel.dataset.group]) override[sel.dataset.group] = {};
      override[sel.dataset.group][sel.dataset.key] = sel.value || null;
    });
    saveFieldOverride(override);
    els.schemaModal.hidden = true;
    showBanner("Saved field mapping override in this browser.", "ok");
  });

  // New Project Modal Listeners
  els.newProjectBtn.addEventListener("click", openNewProjectModal);
  els.closeNewProjectBtn.addEventListener("click", () => { els.newProjectModal.hidden = true; });
  els.newProjName.addEventListener("input", () => {
    if (!state.newProjSlugManual) {
      els.newProjSlug.value = slugify(els.newProjName.value);
    }
  });
  els.newProjSlug.addEventListener("input", () => {
    state.newProjSlugManual = Boolean(els.newProjSlug.value.trim());
  });
  els.newProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.newProjError.hidden = true;
    els.submitNewProjectBtn.disabled = true;
    els.submitNewProjectBtn.textContent = "Creating…";

    try {
      const res = await apiJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          publishMode: els.publishMode.value,
          fieldMapOverride: state.fieldOverride,
          project: {
            name: els.newProjName.value.trim(),
            slug: slugify(els.newProjSlug.value || els.newProjName.value),
            sequence: els.newProjSeq.value.trim() === "" ? null : Number(els.newProjSeq.value),
            subtitle: els.newProjSubtitle.value.trim(),
            details: els.newProjDetails.value,
            projectType: els.newProjType.value,
            categoryIds: getSelectedCategoryIds(els.newProjCategories),
            featured: els.newProjFeatured.checked,
            ...(els.newProjFeatured.checked
              ? { featuredSequence: state.projects.filter((p) => p.featured).length + 1 }
              : {}),
          },
        }),
      });

      els.newProjectModal.hidden = true;
      await loadBootstrap(res.projectId);
      const draftNote = res.createdAsDraftForMedia
        ? " Created as Draft until you upload its first Cover/Gallery slide below."
        : res.published
          ? " Created and published live."
          : " Created as staged.";
      showBanner(`Created project "${els.newProjName.value.trim()}".${draftNote}`, "ok");
    } catch (err) {
      els.newProjError.textContent = err.message;
      els.newProjError.hidden = false;
    } finally {
      els.submitNewProjectBtn.disabled = false;
      els.submitNewProjectBtn.textContent = "Create & Open Project";
    }
  });

  // Information Page Listeners
  els.saveInfoBtn.addEventListener("click", saveInformationChanges);

  els.replaceInfoPicBtn.addEventListener("click", () => els.infoPicInput.click());
  els.infoPicInput.addEventListener("change", async () => {
    const file = els.infoPicInput.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    els.replaceInfoPicBtn.disabled = true;
    els.replaceInfoPicBtn.textContent = "Compressing…";
    try {
      const preset = getPresetConfig(els.compressionPreset.value);
      const compressed = await compressImageFile(file, preset);
      els.replaceInfoPicBtn.textContent = "Uploading…";

      const formData = new FormData();
      formData.append("file", compressed.blob, compressed.fileName);
      formData.append("fileName", compressed.fileName);
      formData.append("fileHash", compressed.fileHash);
      formData.append("size", String(compressed.compressedSize));
      formData.append("width", String(compressed.width));
      formData.append("height", String(compressed.height));

      const asset = await apiJson("/api/upload-asset", { method: "POST", body: formData });
      if (!state.infoDraft) syncInfoDraftFromBootstrap();
      state.infoDraft.profilePicture = {
        fileId: asset.fileId,
        url: asset.url,
      };
      setInfoDirty(true);
      renderInformationEditor();
      showBanner(`Uploaded profile picture (${formatBytes(compressed.compressedSize)}). Click Save Information to commit.`, "ok");
    } catch (err) {
      showBanner(err.message, "err");
    } finally {
      els.infoPicInput.value = "";
      els.replaceInfoPicBtn.disabled = false;
      els.replaceInfoPicBtn.textContent = "Replace Picture";
    }
  });

  els.removeInfoPicBtn.addEventListener("click", () => {
    if (!state.infoDraft?.profilePicture?.url) return;
    if (!window.confirm("Remove profile picture? Click Save Information to commit.")) return;
    state.infoDraft.profilePicture = null;
    setInfoDirty(true);
    renderInformationEditor();
  });

  [els.bioBoldBtn, els.bioItalicBtn, els.bioLinkBtn, els.bioUnlinkBtn].forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
  });

  els.bioBoldBtn.addEventListener("click", () => {
    els.infoBioEditor.focus();
    document.execCommand("bold");
    setInfoDirty(true);
  });
  els.bioItalicBtn.addEventListener("click", () => {
    els.infoBioEditor.focus();
    document.execCommand("italic");
    setInfoDirty(true);
  });
  els.bioLinkBtn.addEventListener("click", () => {
    const sel = window.getSelection();
    const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    const anchorNode = sel?.anchorNode;
    const existingLink =
      anchorNode?.nodeType === 1 ? anchorNode.closest?.("a") : anchorNode?.parentElement?.closest?.("a");
    const currentHref = existingLink ? existingLink.getAttribute("href") : "";
    const rawUrl = window.prompt("Enter link URL:", currentHref || "https://");
    if (!rawUrl || !rawUrl.trim()) return;

    let cleanUrl = rawUrl.trim();
    if (cleanUrl.includes("@") && !cleanUrl.startsWith("mailto:") && !cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `mailto:${cleanUrl}`;
    } else if (!/^[a-z]+:\/\//i.test(cleanUrl) && !cleanUrl.startsWith("mailto:") && !cleanUrl.startsWith("#") && !cleanUrl.startsWith("/")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    els.infoBioEditor.focus();
    if (savedRange) {
      const nextSel = window.getSelection();
      nextSel.removeAllRanges();
      nextSel.addRange(savedRange);
    }

    if (savedRange && !savedRange.collapsed) {
      document.execCommand("createLink", false, cleanUrl);
    } else if (existingLink) {
      existingLink.setAttribute("href", cleanUrl);
    } else {
      const a = document.createElement("a");
      a.href = cleanUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = cleanUrl.replace(/^mailto:/i, "");
      if (savedRange) {
        savedRange.insertNode(a);
      } else {
        els.infoBioEditor.appendChild(a);
      }
    }

    els.infoBioEditor.querySelectorAll("a").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
    setInfoDirty(true);
  });
  els.bioUnlinkBtn.addEventListener("click", () => {
    els.infoBioEditor.focus();
    document.execCommand("unlink");
    setInfoDirty(true);
  });
  els.infoBioEditor.addEventListener("input", () => {
    setInfoDirty(true);
  });

  // Slide Delete Modal Listeners
  els.closeSlideDeleteBtn.addEventListener("click", () => {
    state.pendingDeleteSlideId = null;
    els.slideDeleteModal.hidden = true;
  });
  els.removeFromGalleryBtn.addEventListener("click", () => executeSlideRemoval("remove-from-gallery"));
  els.deleteMediaPermanentBtn.addEventListener("click", () => executeSlideRemoval("delete"));

  // Modal Escape / Backdrop Close & Upload Leave Guard
  [
    [els.focusModal, () => closeFocusModal(true)],
    [els.schemaModal, () => { els.schemaModal.hidden = true; }],
    [els.newProjectModal, () => { els.newProjectModal.hidden = true; }],
    [els.slideDeleteModal, () => { state.pendingDeleteSlideId = null; els.slideDeleteModal.hidden = true; }],
  ].forEach(([modalEl, closeFn]) => {
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeFn();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.focusModal.hidden) return closeFocusModal(true);
    if (!els.schemaModal.hidden) { els.schemaModal.hidden = true; return; }
    if (!els.newProjectModal.hidden) { els.newProjectModal.hidden = true; return; }
    if (!els.slideDeleteModal.hidden) {
      state.pendingDeleteSlideId = null;
      els.slideDeleteModal.hidden = true;
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (state.isUploading) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  checkInitialAuth();
})();
