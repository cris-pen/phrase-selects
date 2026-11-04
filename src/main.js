(function () {
  var transcript = globalThis.PhraseSelectsTranscript;
  var premiere = globalThis.PhraseSelectsPremiere;
  var UI_VERSION = "create-debug-2026-07-11-01-sequence-source-spacing";
  var HANDLE_DEFAULT_KEY = "phrase-selects-default-handles-v1";
  var currentPreview = null;
  var previewSignature = "";
  var sourceContext = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getOptionalElement(id) {
    return document.getElementById(id);
  }

  function getSettings() {
    return {
      searchTerm: getElement("searchTerm").value.trim(),
      handleBeforeSeconds: Number(getElement("handleBefore").value),
      handleAfterSeconds: Number(getElement("handleAfter").value),
      wholeWordOnly: getElement("wholeWordOnly").checked,
      createSubclips: getElement("createSubclips").checked,
      createSequence: getElement("createSequence").checked
    };
  }

  function getPreviewSignature(settings) {
    return JSON.stringify({
      searchTerm: settings.searchTerm,
      handleBeforeSeconds: settings.handleBeforeSeconds,
      handleAfterSeconds: settings.handleAfterSeconds,
      wholeWordOnly: settings.wholeWordOnly
    });
  }

  function setBusy(isBusy) {
    setActionDisabled("lockSourceButton", isBusy);
    setActionDisabled("previewButton", isBusy);
    setActionDisabled("createButton", isBusy || !currentPreview);
  }

  function setActionDisabled(id, disabled) {
    var element = getOptionalElement(id);

    if (!element) {
      return;
    }

    element.classList.toggle("is-disabled", Boolean(disabled));
    element.setAttribute("aria-disabled", disabled ? "true" : "false");
    element.dataset.disabled = disabled ? "true" : "false";

    if (element.dataset.inlineAction === "true") {
      element.style.opacity = disabled ? "0.5" : "1";
      element.style.pointerEvents = disabled ? "none" : "auto";
    }
  }

  function isActionDisabled(id) {
    var element = getOptionalElement(id);
    return Boolean(element && element.dataset.disabled === "true");
  }

  function setStatus(message, isError) {
    var output = getElement("statusOutput");
    output.textContent = message;
    output.classList.toggle("is-error", Boolean(isError));
  }

  function appendStatus(message) {
    var output = getElement("statusOutput");
    output.textContent = output.textContent ? output.textContent + "\n" + message : message;
  }

  function safeGetStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getHandleValues() {
    return {
      before: Number(getElement("handleBefore").value) || 0,
      after: Number(getElement("handleAfter").value) || 0
    };
  }

  function setHandleValues(before, after) {
    getElement("handleBefore").value = Number(before).toFixed(2);
    getElement("handleAfter").value = Number(after).toFixed(2);
    updatePresetView();
  }

  function getDefaultHandles() {
    var stored = safeGetStorage(HANDLE_DEFAULT_KEY);
    var parsed = null;

    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch (error) {
        parsed = null;
      }
    }

    if (
      parsed &&
      Number.isFinite(Number(parsed.before)) &&
      Number.isFinite(Number(parsed.after)) &&
      Number(parsed.before) >= 0 &&
      Number(parsed.after) >= 0
    ) {
      return {
        before: Number(parsed.before),
        after: Number(parsed.after)
      };
    }

    return {
      before: 0,
      after: 0
    };
  }

  function applyHandlePreset(before, after, announce) {
    setHandleValues(before, after);
    clearPreview();

    if (announce) {
      setStatus("Handles set to " + Number(before).toFixed(2) + " / " + Number(after).toFixed(2) + ".");
    }
  }

  function saveHandleDefault() {
    var handles = getHandleValues();
    var saved = safeSetStorage(HANDLE_DEFAULT_KEY, JSON.stringify(handles));

    setStatus(
      (saved ? "Default handles saved: " : "Default handles set for this session: ") +
      handles.before.toFixed(2) +
      " / " +
      handles.after.toFixed(2) +
      "."
    );
    updatePresetView();
  }

  function updatePresetView() {
    var handles = getHandleValues();
    var buttons = document.querySelectorAll(".preset-button[data-before][data-after]");

    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index];
      var before = Number(button.dataset.before);
      var after = Number(button.dataset.after);
      var isActive = Math.abs(before - handles.before) < 0.0001 && Math.abs(after - handles.after) < 0.0001;
      button.classList.toggle("is-active", isActive);
    }
  }

  function clearPreview() {
    currentPreview = null;
    previewSignature = "";
    setActionDisabled("createButton", true);
    renderMatches([]);
  }

  function rememberSourceContext(preview) {
    sourceContext = {
      sourceClipName: preview.sourceClipName,
      sourceProjectItemId: preview.sourceProjectItemId,
      selectionSource: preview.selectionSource,
      sourceKind: preview.sourceKind || "clip",
      transcriptJSON: preview.transcriptJSON,
      sourceDurationSeconds: preview.sourceDurationSeconds
    };
    updateSourceView();
  }

  function updateSourceView() {
    var panel = getOptionalElement("sourcePanel");
    var sourceName = getOptionalElement("sourceName");
    var sourceDetail = getOptionalElement("sourceDetail");

    if (!panel || !sourceName || !sourceDetail) {
      return;
    }

    panel.classList.toggle("is-locked", Boolean(sourceContext));
    panel.classList.toggle("is-unlocked", !sourceContext);

    if (sourceContext) {
      sourceName.textContent = sourceContext.sourceClipName || "Locked source";
      sourceDetail.textContent = getSourceDetailLabel(sourceContext);
    } else {
      sourceName.textContent = "Unlocked";
      sourceDetail.textContent = "Current Premiere selection";
    }
  }

  function getSourceDetailLabel(context) {
    var kind = context && context.sourceKind === "sequence" ? "Sequence" : "Clip";
    var location = context && context.selectionSource ? context.selectionSource : "Locked";
    return kind + " - " + location;
  }

  function buildPreviewFromSourceContext(settings) {
    var result = transcript.buildHitsFromTranscript(sourceContext.transcriptJSON, settings.searchTerm, {
      handleBeforeSeconds: settings.handleBeforeSeconds,
      handleAfterSeconds: settings.handleAfterSeconds,
      sourceClipName: sourceContext.sourceClipName,
      sourceDurationSeconds: sourceContext.sourceDurationSeconds,
      wholeWordOnly: settings.wholeWordOnly
    });

    if (!result.hits.length) {
      throw new Error("no matches found");
    }

    return {
      sourceClipName: sourceContext.sourceClipName,
      sourceProjectItemId: sourceContext.sourceProjectItemId,
      selectionSource: sourceContext.selectionSource,
      sourceKind: sourceContext.sourceKind || "clip",
      transcriptJSON: sourceContext.transcriptJSON,
      words: result.words,
      hits: result.hits,
      sourceDurationSeconds: sourceContext.sourceDurationSeconds,
      shapeKeys: result.shapeKeys
    };
  }

  function validateSettings(settings, requireOutput) {
    if (!settings.searchTerm) {
      throw new Error("search term is empty");
    }

    if (!Number.isFinite(settings.handleBeforeSeconds) || settings.handleBeforeSeconds < 0) {
      throw new Error("handle before must be zero or greater");
    }

    if (!Number.isFinite(settings.handleAfterSeconds) || settings.handleAfterSeconds < 0) {
      throw new Error("handle after must be zero or greater");
    }

    if (requireOutput && !settings.createSubclips && !settings.createSequence) {
      throw new Error("choose at least one output option");
    }
  }

  function renderMatches(hits) {
    var list = getElement("resultsList");
    var count = getElement("matchCount");
    list.innerHTML = "";
    count.textContent = String(hits.length);

    hits.forEach(function (hit) {
      var item = document.createElement("li");
      item.className = "result-item";

      var index = document.createElement("div");
      index.className = "result-index";
      index.textContent = String(hit.index).padStart(3, "0");

      var body = document.createElement("div");
      var text = document.createElement("div");
      text.className = "result-text";
      text.textContent = hit.matchText;

      var time = document.createElement("div");
      time.className = "result-time";
      time.textContent = transcript.formatSeconds(hit.handleStartSeconds) +
        " - " +
        transcript.formatSeconds(hit.handleEndSeconds);

      body.appendChild(text);
      body.appendChild(time);
      item.appendChild(index);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  async function runPreview() {
    var settings = getSettings();
    validateSettings(settings, false);
    setBusy(true);
    setStatus(sourceContext ? "Searching stored source transcript..." : "Reading selected clip transcript...");

    try {
      var preview = sourceContext ? buildPreviewFromSourceContext(settings) : await premiere.previewMatches(settings);
      rememberSourceContext(preview);
      currentPreview = preview;
      previewSignature = getPreviewSignature(settings);
      getElement("selectedClipName").textContent = preview.sourceClipName;
      renderMatches(preview.hits);
      setStatus("Found " + preview.hits.length + " match" + (preview.hits.length === 1 ? "." : "es."));
      appendStatus("Transcript words parsed: " + preview.words.length);
      appendStatus("Transcript shape keys: " + (preview.shapeKeys.length ? preview.shapeKeys.join(", ") : "unknown"));
    } catch (error) {
      clearPreview();
      setStatus(error.message || String(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function runSourceLock() {
    setBusy(true);
    clearPreview();
    setStatus("Reading selected source...");

    try {
      if (!premiere || typeof premiere.getSourceContext !== "function") {
        throw new Error("Phrase Selects Premiere adapter is not loaded. Reload the plugin in UXP Developer Tool.");
      }

      var context = await premiere.getSourceContext();
      sourceContext = context;
      getElement("selectedClipName").textContent = context.sourceClipName;
      updateSourceView();
      setStatus("Source locked: " + context.sourceClipName + ".");
      appendStatus("Transcript shape keys: " + (context.shapeKeys && context.shapeKeys.length ? context.shapeKeys.join(", ") : "unknown"));
    } catch (error) {
      updateSourceView();
      setStatus(error.message || String(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function runCreate() {
    var settings = getSettings();
    validateSettings(settings, true);

    if (!currentPreview || previewSignature !== getPreviewSignature(settings)) {
      throw new Error("run search again before creating outputs");
    }

    setBusy(true);
    setStatus("Creating outputs...");

    try {
      var result = await premiere.createOutputs(currentPreview, settings);
      setStatus("Created " + result.subclipCount + " subclip" + (result.subclipCount === 1 ? "" : "s") + ".");
      appendStatus((result.binAvailable ? "Bin: " : "Bin skipped: ") + result.binName);

      if (result.binWarning) {
        appendStatus("Warning: " + result.binWarning);
      }

      if (result.sequenceName) {
        appendStatus("Sequence: " + result.sequenceName);
      }
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      setBusy(false);
    }
  }

  function bindEvents() {
    bindAction("lockSourceButton", runSourceLock);
    bindAction("previewButton", runPreview);
    bindAction("saveHandleDefaultButton", saveHandleDefault);
    bindAction("createButton", function () {
      runCreate().catch(function (error) {
        setStatus(error.message || String(error), true);
      });
    });

    var presetButtons = document.querySelectorAll(".preset-button[data-before][data-after]");

    for (var presetIndex = 0; presetIndex < presetButtons.length; presetIndex += 1) {
      var button = presetButtons[presetIndex];
      button.addEventListener("click", function () {
        applyHandlePreset(this.dataset.before, this.dataset.after, true);
      });
      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          applyHandlePreset(this.dataset.before, this.dataset.after, true);
        }
      });
    }

    ["searchTerm", "wholeWordOnly"].forEach(function (id) {
      getElement(id).addEventListener("input", clearPreview);
      getElement(id).addEventListener("change", clearPreview);
    });

    ["handleBefore", "handleAfter"].forEach(function (id) {
      getElement(id).addEventListener("input", function () {
        clearPreview();
        updatePresetView();
      });
      getElement(id).addEventListener("change", function () {
        clearPreview();
        updatePresetView();
      });
    });
  }

  function bindAction(id, handler) {
    var element = getOptionalElement(id);

    if (!element) {
      return;
    }

    element.addEventListener("click", function () {
      if (!isActionDisabled(id)) {
        handler();
      }
    });

    element.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && !isActionDisabled(id)) {
        event.preventDefault();
        handler();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    getElement("adapterVersion").textContent = "UI " + UI_VERSION + " / API " + (premiere && premiere.version ? premiere.version : "not loaded");
    var defaultHandles = getDefaultHandles();
    setHandleValues(defaultHandles.before, defaultHandles.after);
    bindEvents();
    updateSourceView();
    renderMatches([]);
    setStatus("Ready.");
  });
})();
