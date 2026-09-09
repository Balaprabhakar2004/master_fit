(() => {
  "use strict";

  /* ---------- icon set (simple original glyphs, not brand logos) ---------- */
  const ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.2 9.3 L15 12 L10.2 14.7 Z" fill="currentColor"/></svg>',
    twitter: '<svg viewBox="0 0 24 24"><path d="M4 4 L20 20 M20 4 L4 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13.5 21 V13 H16 L16.4 10 H13.5 V8.3 C13.5 7.4 13.8 6.8 15.1 6.8 H16.5 V4.1 C16 4 15.1 4 14.1 4 C11.9 4 10.5 5.3 10.5 8 V10 H8.2 V13 H10.5 V21" fill="currentColor" stroke="none"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M14 3 C14 5.4 16 7.2 18.3 7.4 V10.4 C16.6 10.4 15.1 9.8 14 8.9 V15.4 C14 18.5 11.5 21 8.4 21 C5.3 21 2.8 18.5 2.8 15.4 C2.8 12.3 5.3 9.8 8.4 9.8 C8.8 9.8 9.1 9.85 9.5 9.9 V13 C9.1 12.85 8.8 12.8 8.4 12.8 C6.9 12.8 5.8 14 5.8 15.4 C5.8 16.8 6.9 18 8.4 18 C9.9 18 11 16.8 11 15.4 V3 Z" fill="currentColor" stroke="none"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8.2" r="1.3" fill="currentColor"/><path d="M8 11 V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.2 17 V13.4 C12.2 11.8 13.2 10.9 14.5 10.9 C15.8 10.9 16.6 11.8 16.6 13.4 V17" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  };

  /* ---------- state ---------- */
  const state = {
    platforms: null,      // fetched preset data
    mode: "image",        // "image" | "video"
    platform: null,
    ratio: null,
    file: null,
    background: "#ffffff",
    objectUrl: null,
    outputUrl: null,
  };

  /* ---------- element refs ---------- */
  const el = {
    modeBtns: document.querySelectorAll(".mode-btn"),
    modeDial: document.querySelector(".mode-dial"),
    viewfinder: document.getElementById("viewfinder"),
    vfEmpty: document.getElementById("vf-empty"),
    vfHint: document.getElementById("vf-hint"),
    vfImage: document.getElementById("vf-image"),
    vfVideo: document.getElementById("vf-video"),
    vfHud: document.getElementById("vf-hud"),
    vfHudRatio: document.getElementById("vf-hud-ratio"),
    vfHudSize: document.getElementById("vf-hud-size"),
    vfClear: document.getElementById("vf-clear"),
    fileInput: document.getElementById("file-input"),
    platformGrid: document.getElementById("platform-grid"),
    ratioRow: document.getElementById("ratio-row"),
    ratioChips: document.getElementById("ratio-chips"),
    bgRow: document.getElementById("bg-row"),
    swatches: document.getElementById("swatches"),
    bgCustom: document.getElementById("bg-custom"),
    form: document.getElementById("fit-form"),
    fitBtn: document.getElementById("fit-btn"),
    fitBtnLabel: document.querySelector(".fit-btn-label"),
    progressNote: document.getElementById("progress-note"),
    output: document.getElementById("output"),
    outputImage: document.getElementById("output-image"),
    outputVideo: document.getElementById("output-video"),
    downloadLink: document.getElementById("download-link"),
    startOverBtn: document.getElementById("start-over-btn"),
    toast: document.getElementById("toast"),
  };

  /* ---------- toast ---------- */
  let toastTimer = null;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 5000);
  }

  /* ---------- platform data ---------- */
  async function loadPlatforms() {
    const res = await fetch("/api/platforms");
    state.platforms = await res.json();
    renderPlatformGrid();
  }

  function platformsForMode() {
    return Object.entries(state.platforms).filter(([, cfg]) => cfg[state.mode]);
  }

  function renderPlatformGrid() {
    el.platformGrid.innerHTML = "";
    const entries = platformsForMode();

    entries.forEach(([key, cfg]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "platform-card";
      card.dataset.platform = key;
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", "false");
      card.innerHTML = `${ICONS[key] || ""}<span>${cfg.label}</span>`;
      card.addEventListener("click", () => selectPlatform(key));
      el.platformGrid.appendChild(card);
    });

    // keep current selection if it's still valid for this mode, else pick first
    const stillValid = state.platform && entries.some(([k]) => k === state.platform);
    if (stillValid) {
      selectPlatform(state.platform);
    } else if (entries.length) {
      selectPlatform(entries[0][0]);
    }
  }

  function selectPlatform(key) {
    state.platform = key;
    [...el.platformGrid.children].forEach((card) => {
      const active = card.dataset.platform === key;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-checked", String(active));
    });
    renderRatioChips();
  }

  function renderRatioChips() {
    const ratios = state.platforms[state.platform][state.mode];
    el.ratioChips.innerHTML = "";
    const keys = Object.keys(ratios);

    keys.forEach((ratioKey) => {
      const preset = ratios[ratioKey];
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ratio-chip";
      chip.dataset.ratio = ratioKey;
      chip.innerHTML = `<span class="chip-ratio">${ratioKey}</span><span class="chip-label">${preset.label}</span>`;
      chip.addEventListener("click", () => selectRatio(ratioKey));
      el.ratioChips.appendChild(chip);
    });

    el.ratioRow.hidden = false;
    el.bgRow.hidden = false;
    selectRatio(keys[0]);
  }

  function selectRatio(ratioKey) {
    state.ratio = ratioKey;
    [...el.ratioChips.children].forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.ratio === ratioKey);
    });
    updateHud();
    updateFitButton();
  }

  function updateHud() {
    if (!state.platform || !state.ratio || !state.file) return;
    const preset = state.platforms[state.platform][state.mode][state.ratio];
    el.vfHudRatio.textContent = state.ratio;
    el.vfHudSize.textContent = `${preset.width} \u00d7 ${preset.height} px`;
    el.vfHud.hidden = false;
  }

  /* ---------- mode switching ---------- */
  el.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    el.modeDial.dataset.mode = mode;
    el.modeBtns.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    el.fileInput.accept = mode === "image" ? "image/*" : "video/*";
    el.vfHint.textContent = mode === "image"
      ? "JPG, PNG or WEBP \u00b7 up to 20MB"
      : "MP4, MOV or WEBM \u00b7 up to 300MB";

    clearFile();
    renderPlatformGrid();
  }

  /* ---------- dropzone / file handling ---------- */
  el.viewfinder.addEventListener("click", (e) => {
    if (e.target === el.vfClear) return;
    if (!state.file) el.fileInput.click();
  });

  ["dragenter", "dragover"].forEach((evt) => {
    el.viewfinder.addEventListener(evt, (e) => {
      e.preventDefault();
      el.viewfinder.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    el.viewfinder.addEventListener(evt, (e) => {
      e.preventDefault();
      el.viewfinder.classList.remove("is-dragover");
    });
  });
  el.viewfinder.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  });

  el.fileInput.addEventListener("change", () => {
    const f = el.fileInput.files?.[0];
    if (f) setFile(f);
  });

  function setFile(file) {
    const isVideo = file.type.startsWith("video/");
    if ((state.mode === "image" && isVideo) || (state.mode === "video" && !isVideo)) {
      setMode(isVideo ? "video" : "image");
    }

    state.file = file;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);

    el.vfEmpty.hidden = true;
    el.vfClear.hidden = false;
    el.viewfinder.classList.add("has-media");

    if (state.mode === "image") {
      el.vfVideo.hidden = true;
      el.vfVideo.removeAttribute("src");
      el.vfImage.src = state.objectUrl;
      el.vfImage.hidden = false;
    } else {
      el.vfImage.hidden = true;
      el.vfImage.removeAttribute("src");
      el.vfVideo.src = state.objectUrl;
      el.vfVideo.hidden = false;
    }

    updateHud();
    updateFitButton();
  }

  function clearFile() {
    state.file = null;
    if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = null; }
    el.fileInput.value = "";
    el.vfImage.hidden = true;
    el.vfImage.removeAttribute("src");
    el.vfVideo.hidden = true;
    el.vfVideo.removeAttribute("src");
    el.vfHud.hidden = true;
    el.vfClear.hidden = true;
    el.vfEmpty.hidden = false;
    el.viewfinder.classList.remove("has-media");
    updateFitButton();
  }

  el.vfClear.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFile();
  });

  /* ---------- background swatches ---------- */
  el.swatches.addEventListener("click", (e) => {
    const swatch = e.target.closest(".swatch");
    if (!swatch || swatch.classList.contains("swatch-custom")) return;
    setBackground(swatch.dataset.color, swatch);
  });
  el.bgCustom.addEventListener("input", () => {
    setBackground(el.bgCustom.value, el.bgCustom.closest(".swatch"));
  });
  function setBackground(color, activeEl) {
    state.background = color;
    [...el.swatches.children].forEach((s) => s.classList.remove("is-active"));
    activeEl.classList.add("is-active");
  }

  /* ---------- submit ---------- */
  function updateFitButton() {
    const ready = Boolean(state.file && state.platform && state.ratio);
    el.fitBtn.disabled = !ready;
    el.fitBtnLabel.textContent = ready
      ? `Fit to ${state.ratio} \u00b7 ${state.platforms[state.platform].label}`
      : "Choose a file to begin";
  }

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.file) return;

    el.fitBtn.disabled = true;
    el.fitBtn.classList.add("is-loading");
    el.progressNote.hidden = state.mode !== "video";

    const formData = new FormData();
    formData.append("media", state.file);
    formData.append("platform", state.platform);
    formData.append("ratio", state.ratio);
    formData.append("background", state.background);

    const endpoint = state.mode === "image" ? "/api/process/image" : "/api/process/video";

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Something went wrong while processing your file.");
      }
      const blob = await res.blob();
      showOutput(blob);
    } catch (err) {
      showToast(err.message || "Something went wrong. Please try again.");
    } finally {
      el.fitBtn.disabled = false;
      el.fitBtn.classList.remove("is-loading");
      updateFitButton();
    }
  });

  function showOutput(blob) {
    if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
    state.outputUrl = URL.createObjectURL(blob);

    const ext = state.mode === "image" ? "png" : "mp4";
    const filename = `perfectfit_${state.platform}_${state.ratio.replace(":", "x")}.${ext}`;

    if (state.mode === "image") {
      el.outputVideo.hidden = true;
      el.outputVideo.removeAttribute("src");
      el.outputImage.src = state.outputUrl;
      el.outputImage.hidden = false;
    } else {
      el.outputImage.hidden = true;
      el.outputImage.removeAttribute("src");
      el.outputVideo.src = state.outputUrl;
      el.outputVideo.hidden = false;
    }

    el.downloadLink.href = state.outputUrl;
    el.downloadLink.download = filename;
    el.output.hidden = false;
    el.output.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  el.startOverBtn.addEventListener("click", () => {
    el.output.hidden = true;
    clearFile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- boot ---------- */
  loadPlatforms().catch(() => showToast("Couldn't load platform presets. Refresh to try again."));
})();
