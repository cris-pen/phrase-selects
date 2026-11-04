(function (root, factory) {
  var api = factory(root && root.PhraseSelectsTranscript);

  if (root) {
    root.PhraseSelectsPremiere = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (transcriptUtils) {
  var ADAPTER_VERSION = "create-debug-2026-07-11-01-sequence-source-spacing";

  function getPremiere() {
    if (typeof require !== "function") {
      throw new Error("Premiere UXP runtime is not available");
    }

    return require("premierepro");
  }

  function logDebug(message, payload) {
    if (payload !== undefined) {
      console.log("[Phrase Selects] " + message, payload);
    } else {
      console.log("[Phrase Selects] " + message);
    }
  }

  function getId(item) {
    try {
      return item && typeof item.getId === "function" ? item.getId() : "";
    } catch (error) {
      return "";
    }
  }

  function sameItem(left, right) {
    var leftId = getId(left);
    var rightId = getId(right);
    return Boolean(leftId && rightId && leftId === rightId);
  }

  function summarizeProjectItem(item) {
    if (!item) {
      return { name: "", type: "", id: "" };
    }

    return {
      name: item.name || "",
      type: item.type,
      id: getId(item)
    };
  }

  function isFunction(value) {
    return typeof value === "function";
  }

  function addUniqueItem(items, item) {
    if (!item) {
      return;
    }

    var id = getId(item);
    var exists = items.some(function (existing) {
      var existingId = getId(existing);
      return id && existingId ? existingId === id : existing === item;
    });

    if (!exists) {
      items.push(item);
    }
  }

  async function getItemsFromProjectSelection(selection) {
    if (!selection || typeof selection.getItems !== "function") {
      return [];
    }

    var items = await selection.getItems();
    return Array.isArray(items) ? items : [];
  }

  async function getSelectedProjectItems(ppro, project) {
    var diagnostics = [];
    var selectedItems = [];

    try {
      var selection = await ppro.ProjectUtils.getSelection(project);
      var activeItems = await getItemsFromProjectSelection(selection);
      diagnostics.push({
        source: "ProjectUtils.getSelection(activeProject)",
        count: activeItems.length,
        items: activeItems.map(summarizeProjectItem)
      });
      activeItems.forEach(function (item) { addUniqueItem(selectedItems, item); });
    } catch (error) {
      diagnostics.push({
        source: "ProjectUtils.getSelection(activeProject)",
        error: getErrorMessage(error)
      });
      logDebug("Project panel selection lookup failed", error);
    }

    try {
      if (ppro.ProjectUtils && typeof ppro.ProjectUtils.getProjectViewIds === "function") {
        var viewIds = await ppro.ProjectUtils.getProjectViewIds();
        diagnostics.push({
          source: "ProjectUtils.getProjectViewIds",
          count: Array.isArray(viewIds) ? viewIds.length : 0
        });

        for (var index = 0; Array.isArray(viewIds) && index < viewIds.length; index += 1) {
          var viewId = viewIds[index];

          try {
            var viewSelection = await ppro.ProjectUtils.getSelectionFromViewId(viewId);
            var viewItems = await getItemsFromProjectSelection(viewSelection);
            diagnostics.push({
              source: "ProjectUtils.getSelectionFromViewId[" + index + "]",
              count: viewItems.length,
              items: viewItems.map(summarizeProjectItem)
            });
            viewItems.forEach(function (item) { addUniqueItem(selectedItems, item); });
          } catch (viewError) {
            diagnostics.push({
              source: "ProjectUtils.getSelectionFromViewId[" + index + "]",
              error: getErrorMessage(viewError)
            });
          }
        }
      }
    } catch (error) {
      diagnostics.push({
        source: "ProjectUtils project view fallback",
        error: getErrorMessage(error)
      });
      logDebug("Project view selection fallback failed", error);
    }

    return {
      items: selectedItems,
      diagnostics: diagnostics
    };
  }

  async function getSelectedTimelineProjectItems(project) {
    var diagnostics = [];
    var projectItems = [];

    try {
      var activeSequence = await project.getActiveSequence();
      if (!activeSequence) {
        diagnostics.push({
          source: "Project.getActiveSequence",
          count: 0,
          note: "No active sequence"
        });
        return { items: projectItems, diagnostics: diagnostics };
      }

      var selection = await activeSequence.getSelection();
      var trackItems = selection ? await selection.getTrackItems() : [];
      diagnostics.push({
        source: "Sequence.getSelection().getTrackItems",
        count: Array.isArray(trackItems) ? trackItems.length : 0
      });

      for (var index = 0; Array.isArray(trackItems) && index < trackItems.length; index += 1) {
        if (trackItems[index] && typeof trackItems[index].getProjectItem === "function") {
          var projectItem = await trackItems[index].getProjectItem();
          addUniqueItem(projectItems, projectItem);
          diagnostics.push({
            source: "TrackItem.getProjectItem[" + index + "]",
            item: summarizeProjectItem(projectItem)
          });
        } else {
          diagnostics.push({
            source: "TrackItem.getProjectItem[" + index + "]",
            error: "Track item does not expose getProjectItem"
          });
        }
      }

      return {
        items: projectItems,
        diagnostics: diagnostics
      };
    } catch (error) {
      diagnostics.push({
        source: "Timeline selection lookup",
        error: getErrorMessage(error)
      });
      logDebug("Timeline selection lookup failed", error);
      return {
        items: projectItems,
        diagnostics: diagnostics
      };
    }
  }

  async function getActiveSequenceProjectItem(project) {
    var diagnostics = [];
    var projectItems = [];

    try {
      var activeSequence = await project.getActiveSequence();
      if (!activeSequence) {
        diagnostics.push({
          source: "Project.getActiveSequence source fallback",
          count: 0,
          note: "No active sequence"
        });
        return { items: projectItems, diagnostics: diagnostics };
      }

      diagnostics.push({
        source: "Project.getActiveSequence source fallback",
        note: activeSequence.name || "Active sequence"
      });

      if (typeof activeSequence.getProjectItem !== "function") {
        diagnostics.push({
          source: "Sequence.getProjectItem source fallback",
          error: "Active sequence does not expose getProjectItem"
        });
        return { items: projectItems, diagnostics: diagnostics };
      }

      var projectItem = await activeSequence.getProjectItem();
      addUniqueItem(projectItems, projectItem);
      diagnostics.push({
        source: "Sequence.getProjectItem source fallback",
        item: summarizeProjectItem(projectItem)
      });

      return {
        items: projectItems,
        diagnostics: diagnostics
      };
    } catch (error) {
      diagnostics.push({
        source: "Active sequence source fallback",
        error: getErrorMessage(error)
      });
      logDebug("Active sequence source fallback failed", error);
      return {
        items: projectItems,
        diagnostics: diagnostics
      };
    }
  }

  function castClipProjectItem(ppro, projectItem) {
    if (!projectItem) {
      throw new Error("no clip selected");
    }

    try {
      return ppro.ClipProjectItem.cast(projectItem);
    } catch (error) {
      throw new Error("selected item is not a clip: " + getErrorMessage(error));
    }
  }

  async function getClipProjectItemKind(clipProjectItem, sourceName) {
    if (!clipProjectItem || typeof clipProjectItem.isSequence !== "function") {
      return "clip";
    }

    try {
      if (await clipProjectItem.isSequence()) {
        return "sequence";
      }
    } catch (error) {
      logDebug("Could not determine whether selected item is a sequence", {
        sourceName: sourceName,
        error: getErrorMessage(error)
      });
    }

    return "clip";
  }

  function tryCastFolderItem(ppro, projectItem) {
    if (!projectItem) {
      return null;
    }

    try {
      var folderItem = ppro.FolderItem.cast(projectItem);
      return folderItem && isFunction(folderItem.getItems) ? folderItem : null;
    } catch (error) {
      return null;
    }
  }

  function toProjectItem(ppro, item) {
    if (!item) {
      return null;
    }

    try {
      return ppro.ProjectItem.cast(item);
    } catch (error) {
      return item;
    }
  }

  function formatSelectionDiagnostics(diagnostics) {
    return diagnostics.map(function (entry) {
      var line = entry.source + ": ";

      if (entry.error) {
        return line + entry.error;
      }

      if (entry.item) {
        return line + JSON.stringify(entry.item);
      }

      if (entry.items && entry.items.length) {
        return line + String(entry.count || entry.items.length) + " -> " + entry.items.map(function (item) {
          return item.name + " [type=" + item.type + ", id=" + item.id + "]";
        }).join("; ");
      }

      if (entry.note) {
        return line + entry.note;
      }

      return line + String(entry.count || 0);
    }).join("\n");
  }

  async function getSelectionCandidates() {
    var ppro = getPremiere();
    var project = await ppro.Project.getActiveProject();

    if (!project) {
      throw new Error("no active Premiere project");
    }

    var diagnostics = [{
      source: "Phrase Selects API adapter",
      note: ADAPTER_VERSION
    }, {
      source: "Active project",
      note: project.name || project.path || "Unnamed project"
    }];
    var selectedItems = [];
    var selectionSource = "Project panel";
    var projectSelection = await getSelectedProjectItems(ppro, project);

    diagnostics = diagnostics.concat(projectSelection.diagnostics);
    projectSelection.items.forEach(function (item) { addUniqueItem(selectedItems, item); });

    if (!selectedItems.length) {
      var timelineSelection = await getSelectedTimelineProjectItems(project);
      diagnostics = diagnostics.concat(timelineSelection.diagnostics);
      timelineSelection.items.forEach(function (item) { addUniqueItem(selectedItems, item); });

      if (selectedItems.length) {
        selectionSource = "Timeline";
      }
    }

    if (!selectedItems.length) {
      var activeSequenceSelection = await getActiveSequenceProjectItem(project);
      diagnostics = diagnostics.concat(activeSequenceSelection.diagnostics);
      activeSequenceSelection.items.forEach(function (item) { addUniqueItem(selectedItems, item); });

      if (selectedItems.length) {
        selectionSource = "Active sequence";
      }
    }

    return {
      ppro: ppro,
      project: project,
      selectedItems: selectedItems,
      selectionSource: selectionSource,
      diagnostics: diagnostics
    };
  }

  async function diagnoseSelection() {
    var candidates = await getSelectionCandidates();
    var lines = [
      "Phrase Selects selection diagnostics",
      "Adapter: " + ADAPTER_VERSION,
      "Found project items: " + candidates.selectedItems.length,
      ""
    ];

    candidates.selectedItems.forEach(function (item, index) {
      lines.push((index + 1) + ". " + item.name + " [type=" + item.type + ", id=" + getId(item) + "]");
    });

    if (candidates.selectedItems.length) {
      lines.push("");
    }

    lines.push("Selection surfaces:");
    lines.push(formatSelectionDiagnostics(candidates.diagnostics));

    return {
      foundCount: candidates.selectedItems.length,
      firstClipName: candidates.selectedItems[0] ? candidates.selectedItems[0].name : "",
      message: lines.join("\n")
    };
  }

  async function getSelectedClip() {
    var candidates = await getSelectionCandidates();
    var ppro = candidates.ppro;
    var project = candidates.project;
    var selectedItems = candidates.selectedItems;
    var selectionSource = candidates.selectionSource;
    var diagnostics = candidates.diagnostics;

    logDebug("Selection lookup diagnostics", diagnostics);

    if (!selectedItems.length) {
      throw new Error("no clip selected\n\nSelection diagnostics:\n" + formatSelectionDiagnostics(diagnostics));
    }

    if (selectedItems.length > 1) {
      throw new Error("select exactly one clip; found " + selectedItems.length);
    }

    var projectItem = selectedItems[0];
    var clipProjectItem = castClipProjectItem(ppro, projectItem);
    var sourceKind = await getClipProjectItemKind(clipProjectItem, projectItem.name || "");

    logDebug("Selected item details", {
      name: projectItem.name,
      type: projectItem.type,
      id: getId(projectItem),
      selectionSource: selectionSource,
      sourceKind: sourceKind
    });

    return {
      ppro: ppro,
      project: project,
      projectItem: projectItem,
      clipProjectItem: clipProjectItem,
      sourceClipName: projectItem.name || clipProjectItem.name || "Selected clip",
      selectionSource: selectionSource,
      sourceKind: sourceKind
    };
  }

  async function getClipDurationSeconds(ppro, clipProjectItem) {
    try {
      var outPoint = await clipProjectItem.getOutPoint(ppro.Constants.MediaType.ANY);
      if (outPoint && Number.isFinite(outPoint.seconds) && outPoint.seconds > 0) {
        return outPoint.seconds;
      }
    } catch (error) {
      logDebug("Could not read clip duration from out point", error);
    }

    return null;
  }

  async function exportTranscriptForClip(selection) {
    var ppro = selection.ppro;
    var hasTranscript = false;

    try {
      hasTranscript = Boolean(ppro.Transcript.hasTranscript(selection.clipProjectItem));
      logDebug("Transcript availability", { hasTranscript: hasTranscript });
    } catch (error) {
      logDebug("Transcript.hasTranscript failed; trying exportToJSON", error);
      hasTranscript = true;
    }

    if (!hasTranscript) {
      throw new Error("selected item has no transcript");
    }

    try {
      var transcriptJSON = await ppro.Transcript.exportToJSON(selection.clipProjectItem);
      var shapeKeys = transcriptUtils ? transcriptUtils.getTopLevelShape(transcriptJSON) : [];
      logDebug("Transcript JSON shape/sample keys", shapeKeys);
      return transcriptJSON;
    } catch (error) {
      throw new Error("transcript export failed: " + getErrorMessage(error));
    }
  }

  function getErrorMessage(error) {
    return error && error.message ? error.message : String(error);
  }

  function sanitizeProjectName(name) {
    return String(name || "Phrase")
      .replace(/[\\/:*?"<>|#{}[\]]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Phrase";
  }

  function makeOutputBaseName(searchTerm) {
    return "Phrase Selects - " + sanitizeProjectName(searchTerm);
  }

  function padNumber(value, size) {
    return String(value).padStart(size, "0");
  }

  function makeRunLabel() {
    var now = new Date();
    return "Run " +
      now.getFullYear() +
      padNumber(now.getMonth() + 1, 2) +
      padNumber(now.getDate(), 2) +
      "-" +
      padNumber(now.getHours(), 2) +
      padNumber(now.getMinutes(), 2) +
      padNumber(now.getSeconds(), 2) +
      "-" +
      padNumber(now.getMilliseconds(), 3);
  }

  function padIndex(index) {
    return String(index).padStart(3, "0");
  }

  function makeSubclipName(searchTerm, hit, sourceClipName, runLabel) {
    return sanitizeProjectName(searchTerm) +
      " - " +
      padIndex(hit.index) +
      " - " +
      sanitizeProjectName(sourceClipName) +
      (runLabel ? " - " + sanitizeProjectName(runLabel) : "");
  }

  function sleep(milliseconds) {
    return new Promise(function (resolve) {
      setTimeout(resolve, milliseconds);
    });
  }

  function addActionOrThrow(compoundAction, action, label) {
    if (!action) {
      throw new Error(label + " did not return an action");
    }

    var added = compoundAction.addAction(action);
    if (!added) {
      throw new Error(label + " could not be added to the transaction");
    }
  }

  function executeTransactionOrThrow(project, callback, undoString) {
    try {
      var ok = false;
      var transactionError = null;
      var runner = function () {
        try {
          ok = project.executeTransaction(callback, undoString);
        } catch (error) {
          transactionError = error;
        }
      };

      if (project && typeof project.lockedAccess === "function") {
        project.lockedAccess(runner);
      } else {
        runner();
      }

      if (transactionError) {
        throw transactionError;
      }

      if (!ok) {
        throw new Error("Premiere returned false");
      }
    } catch (error) {
      throw new Error(undoString + " failed: " + getErrorMessage(error));
    }
  }

  async function collectProjectItems(folderItem, predicate, results) {
    var ppro = getPremiere();
    var matches = results || [];
    var items = await folderItem.getItems();

    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      if (predicate(item)) {
        matches.push(item);
      }

      var childFolder = tryCastFolderItem(ppro, item);

      if (childFolder) {
        try {
          await collectProjectItems(childFolder, predicate, matches);
        } catch (error) {
          logDebug("Could not scan child bin", { name: item.name, error: getErrorMessage(error) });
        }
      }
    }

    return matches;
  }

  async function findBinByName(project, name) {
    var ppro = getPremiere();
    var rootItem = await project.getRootItem();
    var bins = await collectProjectItems(rootItem, function (item) {
      return Boolean(tryCastFolderItem(ppro, item)) && item.name === name;
    });

    return bins.length ? tryCastFolderItem(ppro, bins[0]) : null;
  }

  async function createOrFindBin(project, name) {
    var existingBin = await findBinByName(project, name);
    if (existingBin) {
      return existingBin;
    }

    var rootItem = await project.getRootItem();
    executeTransactionOrThrow(project, function (compoundAction) {
      addActionOrThrow(compoundAction, rootItem.createBinAction(name, false), "Create bin action");
    }, "Create Phrase Selects Bin");

    var bin = null;

    for (var attempt = 0; attempt < 5 && !bin; attempt += 1) {
      bin = await findBinByName(project, name);
      if (!bin) {
        await sleep(100);
      }
    }

    if (!bin) {
      throw new Error("subclip creation failed: output bin was not found after creation");
    }

    return bin;
  }

  async function collectItemsByName(project, name) {
    var rootItem = await project.getRootItem();
    return collectProjectItems(rootItem, function (item) {
      return item.name === name;
    });
  }

  async function snapshotProjectItems(project) {
    var rootItem = await project.getRootItem();
    var items = await collectProjectItems(rootItem, function () {
      return true;
    });
    var ids = {};

    for (var index = 0; index < items.length; index += 1) {
      var id = getId(items[index]);
      if (id) {
        ids[id] = true;
      }
    }

    return {
      ids: ids,
      items: items
    };
  }

  function chooseCreatedProjectItem(items, knownIds, expectedName) {
    var newItems = [];

    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      var id = getId(item);

      if (id && !knownIds[id]) {
        newItems.push(item);
      }
    }

    var exactMatches = newItems.filter(function (item) {
      return item.name === expectedName;
    });

    if (exactMatches.length) {
      return exactMatches[exactMatches.length - 1];
    }

    var prefixMatches = newItems.filter(function (item) {
      return item.name && item.name.indexOf(expectedName) === 0;
    });

    if (prefixMatches.length) {
      return prefixMatches[prefixMatches.length - 1];
    }

    return newItems.length ? newItems[newItems.length - 1] : null;
  }

  function addSnapshotIds(targetIds, snapshot) {
    for (var index = 0; index < snapshot.items.length; index += 1) {
      var id = getId(snapshot.items[index]);
      if (id) {
        targetIds[id] = true;
      }
    }
  }

  async function findProjectItemById(project, id) {
    if (!id) {
      return null;
    }

    var rootItem = await project.getRootItem();
    var items = await collectProjectItems(rootItem, function (item) {
      return getId(item) === id;
    });

    return items.length ? items[0] : null;
  }

  async function rehydrateClipForCreation(selection, sourceProjectItemId) {
    var freshProjectItem = await findProjectItemById(selection.project, sourceProjectItemId);

    if (!freshProjectItem) {
      logDebug("Could not rehydrate source clip from project tree; using selection wrapper", {
        id: sourceProjectItemId,
        selectionSource: selection.selectionSource
      });

      return selection;
    }

    logDebug("Rehydrated source clip from project tree for creation", {
      name: freshProjectItem.name,
      id: getId(freshProjectItem),
      previousSelectionSource: selection.selectionSource
    });

    return {
      ppro: selection.ppro,
      project: selection.project,
      projectItem: freshProjectItem,
      clipProjectItem: castClipProjectItem(selection.ppro, freshProjectItem),
      sourceClipName: freshProjectItem.name || selection.sourceClipName,
      selectionSource: selection.selectionSource + " via project tree",
      sourceKind: await getClipProjectItemKind(castClipProjectItem(selection.ppro, freshProjectItem), freshProjectItem.name || selection.sourceClipName)
    };
  }

  async function getClipFromProjectItemId(sourceProjectItemId) {
    var ppro = getPremiere();
    var project = await ppro.Project.getActiveProject();

    if (!project) {
      throw new Error("no active Premiere project");
    }

    var projectItem = await findProjectItemById(project, sourceProjectItemId);

    if (!projectItem) {
      throw new Error("source clip is no longer available in the project; run search again from the original clip");
    }

    var clipProjectItem = castClipProjectItem(ppro, projectItem);
    var sourceKind = await getClipProjectItemKind(clipProjectItem, projectItem.name || "");

    return {
      ppro: ppro,
      project: project,
      projectItem: projectItem,
      clipProjectItem: clipProjectItem,
      sourceClipName: projectItem.name || "Selected clip",
      selectionSource: "stored source",
      sourceKind: sourceKind
    };
  }

  async function createSubclipsFromHits(options) {
    var ppro = getPremiere();
    var project = options.project;
    var clipProjectItem = options.clipProjectItem;
    var sourceProjectItemId = options.sourceProjectItemId;
    var sourceKind = options.sourceKind || "clip";
    var hits = options.hits || [];
    var sourceClipName = options.sourceClipName || "Selected clip";
    var searchTerm = options.searchTerm;
    var binName = options.binName;
    var runLabel = options.runLabel || "";

    if (!hits.length) {
      throw new Error("no matches found");
    }

    var outputBin = null;
    var binWarning = "";
    var subclips = [];
    var knownSnapshot = await snapshotProjectItems(project);
    var knownIds = knownSnapshot.ids;

    for (var index = 0; index < hits.length; index += 1) {
      var hit = hits[index];
      var subclipName = makeSubclipName(searchTerm, hit, sourceClipName, runLabel);
      var startTime = ppro.TickTime.createWithSeconds(hit.handleStartSeconds);
      var endTime = ppro.TickTime.createWithSeconds(hit.handleEndSeconds);
      var actionClipProjectItem = clipProjectItem;

      if (sourceProjectItemId) {
        var freshSourceProjectItem = await findProjectItemById(project, sourceProjectItemId);
        if (freshSourceProjectItem) {
          actionClipProjectItem = castClipProjectItem(ppro, freshSourceProjectItem);
        } else {
          logDebug("Could not refresh source clip before subclip action; using previous wrapper", {
            id: sourceProjectItemId
          });
        }
      }

      if (!(hit.handleEndSeconds > hit.handleStartSeconds)) {
        throw new Error("subclip creation failed for hit " + padIndex(hit.index) + ": invalid time range");
      }

      logDebug("Creating subclip", {
        name: subclipName,
        startSeconds: hit.handleStartSeconds,
        endSeconds: hit.handleEndSeconds,
        startTicks: startTime && startTime.ticks,
        endTicks: endTime && endTime.ticks
      });

      try {
        executeTransactionOrThrow(project, function (compoundAction) {
          var action = actionClipProjectItem.createSubClipAction(subclipName, startTime, endTime, true, {
            takeVideo: true,
            takeAudio: true
          });

          addActionOrThrow(compoundAction, action, "Create subclip action for " + subclipName);
        }, "Create Phrase Selects Subclip " + padIndex(hit.index));
      } catch (error) {
        var sequenceHint = sourceKind === "sequence" ?
          " The source is a sequence; if Premiere rejects sequence subclips, this build can still search the sequence transcript but output creation will need a sequence-specific fallback." :
          "";
        throw new Error(
          "subclip creation failed for hit " +
          padIndex(hit.index) +
          " (" +
          hit.handleStartSeconds +
          "s-" +
          hit.handleEndSeconds +
          "s): " +
          getErrorMessage(error) +
          sequenceHint
        );
      }

      var createdItem = null;
      var lastSnapshot = null;

      for (var attempt = 0; attempt < 20 && !createdItem; attempt += 1) {
        lastSnapshot = await snapshotProjectItems(project);
        createdItem = chooseCreatedProjectItem(lastSnapshot.items, knownIds, subclipName);

        if (!createdItem) {
          var matchingItems = await collectItemsByName(project, subclipName);
          var unknownMatchingItems = matchingItems.filter(function (item) {
            var id = getId(item);
            return !id || !knownIds[id];
          });
          createdItem = unknownMatchingItems.length ? unknownMatchingItems[unknownMatchingItems.length - 1] : null;
        }

        if (!createdItem) {
          await sleep(150);
        }
      }

      if (!createdItem) {
        var newItemNames = [];

        if (lastSnapshot) {
          for (var snapshotIndex = 0; snapshotIndex < lastSnapshot.items.length; snapshotIndex += 1) {
            var snapshotItem = lastSnapshot.items[snapshotIndex];
            var snapshotId = getId(snapshotItem);
            if (snapshotId && !knownIds[snapshotId]) {
              newItemNames.push(snapshotItem.name || "(unnamed)");
            }
          }
        }

        throw new Error(
          "subclip creation failed: generated subclip was not found: " +
          subclipName +
          (newItemNames.length ? ". New project items seen: " + newItemNames.join(", ") : ". No new project items were seen.")
        );
      }

      if (lastSnapshot) {
        addSnapshotIds(knownIds, lastSnapshot);
      } else {
        var createdId = getId(createdItem);
        if (createdId) {
          knownIds[createdId] = true;
        }
      }

      if (createdItem.name && createdItem.name !== subclipName) {
        logDebug("Premiere created subclip with adjusted name", {
          requestedName: subclipName,
          actualName: createdItem.name
        });
      }

      subclips.push({
        projectItem: createdItem,
        name: createdItem.name || subclipName,
        requestedName: subclipName,
        hit: hit
      });
    }

    try {
      outputBin = await createOrFindBin(project, binName);
    } catch (error) {
      binWarning = "Subclips were created, but the output bin could not be created: " + getErrorMessage(error);
      logDebug(binWarning, error);
    }

    if (!outputBin) {
      logDebug("Skipping subclip move because output bin is unavailable", { binName: binName });
    } else {
      try {
        executeTransactionOrThrow(project, function (compoundAction) {
          for (var index = 0; index < subclips.length; index += 1) {
            var projectItem = toProjectItem(ppro, subclips[index].projectItem);
            var parentBin = typeof projectItem.getParentBin === "function" ? projectItem.getParentBin() : null;
            var mover = parentBin && typeof parentBin.createMoveItemAction === "function" ? parentBin : outputBin;
            addActionOrThrow(compoundAction, mover.createMoveItemAction(projectItem, outputBin), "Move subclip action for " + subclips[index].name);
          }
        }, "Move Phrase Selects Subclips");
      } catch (error) {
        binWarning = "Subclips were created, but moving them into the output bin failed: " + getErrorMessage(error);
        logDebug(binWarning, error);
      }
    }

    logDebug("Subclip creation results", subclips.map(function (subclip) {
      return { name: subclip.name, id: getId(subclip.projectItem) };
    }));

    return {
      bin: outputBin,
      binName: binName,
      binWarning: binWarning,
      subclips: subclips
    };
  }

  async function createSequenceFromSubclips(options) {
    var ppro = getPremiere();
    var project = options.project;
    var sequenceName = options.sequenceName;
    var subclips = options.subclips || [];

    if (!subclips.length) {
      throw new Error("sequence creation failed: no subclips are available");
    }

    var sequence;

    try {
      sequence = await project.createSequence(sequenceName);
      if (!sequence) {
        throw new Error("Premiere did not return a sequence");
      }
      await project.setActiveSequence(sequence);
    } catch (error) {
      throw new Error("sequence creation failed: " + getErrorMessage(error));
    }

    var editor = ppro.SequenceEditor.getEditor(sequence);
    if (!editor) {
      throw new Error("sequence insertion failed: SequenceEditor is unavailable");
    }

    try {
      executeTransactionOrThrow(project, function (compoundAction) {
        var insertTime = ppro.TickTime.createWithSeconds(0);

        for (var index = subclips.length - 1; index >= 0; index -= 1) {
          var subclip = subclips[index];
          logDebug("Inserting subclip into sequence", {
            name: subclip.name,
            atSeconds: 0,
            order: "reverse insert ripple"
          });

          addActionOrThrow(compoundAction, editor.createInsertProjectItemAction(
            toProjectItem(ppro, subclip.projectItem),
            insertTime,
            0,
            0,
            false
          ),
            "Insert subclip action for " + subclip.name
          );
        }
      }, "Assemble Phrase Selects Sequence");
    } catch (error) {
      throw new Error("sequence insertion failed: " + getErrorMessage(error));
    }

    logDebug("Sequence creation/insertion results", {
      name: sequence.name,
      subclipCount: subclips.length
    });

    return sequence;
  }

  async function previewMatches(settings) {
    var selection = await getSelectedClip();
    var transcriptJSON = await exportTranscriptForClip(selection);
    var sourceDurationSeconds = await getClipDurationSeconds(selection.ppro, selection.clipProjectItem);
    var result = transcriptUtils.buildHitsFromTranscript(transcriptJSON, settings.searchTerm, {
      handleBeforeSeconds: settings.handleBeforeSeconds,
      handleAfterSeconds: settings.handleAfterSeconds,
      sourceClipName: selection.sourceClipName,
      sourceDurationSeconds: sourceDurationSeconds,
      wholeWordOnly: settings.wholeWordOnly
    });

    logDebug("Transcript words parsed", {
      count: result.words.length,
      shapeKeys: result.shapeKeys
    });
    logDebug("Phrase matches found", { count: result.hits.length });

    result.hits.forEach(function (hit) {
      logDebug("Generated hit time range", hit);
    });

    if (!result.hits.length) {
      throw new Error("no matches found");
    }

    return {
      sourceClipName: selection.sourceClipName,
      sourceProjectItemId: getId(selection.projectItem),
      selectionSource: selection.selectionSource,
      sourceKind: selection.sourceKind || "clip",
      transcriptJSON: transcriptJSON,
      words: result.words,
      hits: result.hits,
      sourceDurationSeconds: sourceDurationSeconds,
      shapeKeys: result.shapeKeys
    };
  }

  async function getSourceContext() {
    var selection = await getSelectedClip();
    var transcriptJSON = await exportTranscriptForClip(selection);
    var sourceDurationSeconds = await getClipDurationSeconds(selection.ppro, selection.clipProjectItem);

    return {
      sourceClipName: selection.sourceClipName,
      sourceProjectItemId: getId(selection.projectItem),
      selectionSource: selection.selectionSource,
      sourceKind: selection.sourceKind || "clip",
      transcriptJSON: transcriptJSON,
      sourceDurationSeconds: sourceDurationSeconds,
      shapeKeys: transcriptUtils ? transcriptUtils.getTopLevelShape(transcriptJSON) : []
    };
  }

  async function createOutputs(preview, settings) {
    if (!settings.createSubclips && !settings.createSequence) {
      throw new Error("choose at least one output option");
    }

    var selection;

    if (preview.sourceProjectItemId) {
      selection = await getClipFromProjectItemId(preview.sourceProjectItemId);
    } else {
      selection = await getSelectedClip();
    }

    selection = await rehydrateClipForCreation(selection, getId(selection.projectItem) || preview.sourceProjectItemId);

    var baseName = makeOutputBaseName(settings.searchTerm);
    var runLabel = makeRunLabel();
    var outputName = baseName + " - " + runLabel;
    var binName = settings.createSubclips ? outputName : outputName + " - Source Segments";
    var createdSubclips = await createSubclipsFromHits({
      project: selection.project,
      clipProjectItem: selection.clipProjectItem,
      sourceProjectItemId: getId(selection.projectItem),
      sourceKind: selection.sourceKind || "clip",
      hits: preview.hits,
      sourceClipName: selection.sourceClipName,
      searchTerm: settings.searchTerm,
      binName: binName,
      runLabel: runLabel
    });
    var sequence = null;

    if (settings.createSequence) {
      try {
        sequence = await createSequenceFromSubclips({
          project: selection.project,
          sequenceName: outputName,
          subclips: createdSubclips.subclips
        });
      } catch (error) {
        throw new Error("subclip creation succeeded but " + getErrorMessage(error));
      }
    }

    return {
      binName: binName,
      binAvailable: Boolean(createdSubclips.bin),
      binWarning: createdSubclips.binWarning || "",
      subclipCount: createdSubclips.subclips.length,
      sequenceName: sequence ? sequence.name : null
    };
  }

  return {
    createOutputs: createOutputs,
    createSequenceFromSubclips: createSequenceFromSubclips,
    createSubclipsFromHits: createSubclipsFromHits,
    diagnoseSelection: diagnoseSelection,
    exportTranscriptForClip: exportTranscriptForClip,
    getSelectedClip: getSelectedClip,
    getSourceContext: getSourceContext,
    makeOutputBaseName: makeOutputBaseName,
    previewMatches: previewMatches,
    sanitizeProjectName: sanitizeProjectName,
    version: ADAPTER_VERSION
  };
});
