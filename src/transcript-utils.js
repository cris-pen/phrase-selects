(function (root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.PhraseSelectsTranscript = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var PREMIERE_TICKS_PER_SECOND = 254016000000;
  var WORD_RE = createRegex("[\\p{L}\\p{N}'-]+", "gu", /[A-Za-z0-9'-]+/g);
  var NON_WORD_EDGE_RE = createRegex("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$", "gu", /^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g);

  function createRegex(pattern, flags, fallback) {
    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      return fallback;
    }
  }

  function parseTranscriptJSON(input) {
    if (!input) {
      throw new Error("selected item has no transcript");
    }

    if (typeof input === "string") {
      try {
        return JSON.parse(input);
      } catch (error) {
        throw new Error("transcript export failed: transcript JSON could not be parsed");
      }
    }

    return input;
  }

  function getTopLevelShape(input) {
    var value = typeof input === "string" ? safeJSONParse(input) : input;

    if (!value || typeof value !== "object") {
      return [];
    }

    if (Array.isArray(value)) {
      return ["array[" + value.length + "]"];
    }

    return Object.keys(value).slice(0, 12);
  }

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function getObjectText(node) {
    var keys = [
      "word",
      "text",
      "content",
      "value",
      "displayText",
      "transcript",
      "utterance"
    ];

    for (var index = 0; index < keys.length; index += 1) {
      var value = node[keys[index]];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return "";
  }

  function tokenizeText(text) {
    var matches = String(text || "").match(WORD_RE);
    return matches ? matches : [];
  }

  function normalizeToken(token) {
    return String(token || "")
      .toLocaleLowerCase()
      .replace(NON_WORD_EDGE_RE, "");
  }

  function parseClockTime(value) {
    var parts = value.split(":");
    if (parts.length < 2 || parts.length > 3) {
      return null;
    }

    var seconds = parseFloat(parts.pop());
    var minutes = parseFloat(parts.pop());
    var hours = parts.length ? parseFloat(parts.pop()) : 0;

    if ([seconds, minutes, hours].some(function (part) { return !Number.isFinite(part); })) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  function parseTimeValue(value, keyHint) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return null;
      }

      if (/millis|ms/i.test(keyHint || "")) {
        return value / 1000;
      }

      if (Math.abs(value) > 1000000000) {
        return value / PREMIERE_TICKS_PER_SECOND;
      }

      return value;
    }

    if (typeof value === "string") {
      var trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      var clockTime = parseClockTime(trimmed);
      if (clockTime !== null) {
        return clockTime;
      }

      var numeric = Number(trimmed.replace(/s(ec(onds?)?)?$/i, ""));
      if (!Number.isFinite(numeric)) {
        return null;
      }

      if (/millis|ms/i.test(keyHint || "")) {
        return numeric / 1000;
      }

      if (Math.abs(numeric) > 1000000000) {
        return numeric / PREMIERE_TICKS_PER_SECOND;
      }

      return numeric;
    }

    if (typeof value === "object") {
      return findTimeValue(value, ["seconds", "value", "ticks", "time"], keyHint);
    }

    return null;
  }

  function findTimeValue(node, keys, keyHint) {
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        var parsed = parseTimeValue(node[key], keyHint || key);
        if (parsed !== null) {
          return parsed;
        }
      }
    }

    return null;
  }

  function getStartSeconds(node) {
    var direct = findTimeValue(node, [
      "startSeconds",
      "startSecond",
      "start_time",
      "startTime",
      "start",
      "beginSeconds",
      "beginTime",
      "begin",
      "inPoint",
      "in"
    ]);

    if (direct !== null) {
      return direct;
    }

    return getNestedTime(node, "start");
  }

  function getEndSeconds(node, startSeconds) {
    var direct = findTimeValue(node, [
      "endSeconds",
      "endSecond",
      "end_time",
      "endTime",
      "end",
      "finishSeconds",
      "finishTime",
      "finish",
      "stop",
      "outPoint",
      "out"
    ]);

    if (direct !== null) {
      return direct;
    }

    var duration = findTimeValue(node, ["durationSeconds", "durationSecond", "duration"]);
    if (duration !== null && startSeconds !== null) {
      return startSeconds + Math.max(0, duration);
    }

    return getNestedTime(node, "end");
  }

  function getNestedTime(node, point) {
    var containers = ["time", "timeRange", "range", "timestamp"];

    for (var index = 0; index < containers.length; index += 1) {
      var child = node[containers[index]];
      if (child && typeof child === "object") {
        var parsed = point === "start" ? getStartSeconds(child) : getEndSeconds(child, null);
        if (parsed !== null) {
          return parsed;
        }
      }
    }

    return null;
  }

  function collectTimedTextNodes(rootNode) {
    var nodes = [];

    function walk(node, path) {
      if (!node || typeof node !== "object") {
        return false;
      }

      if (Array.isArray(node)) {
        var arrayHasTimedText = false;
        for (var index = 0; index < node.length; index += 1) {
          if (walk(node[index], path.concat(index))) {
            arrayHasTimedText = true;
          }
        }
        return arrayHasTimedText;
      }

      var hasTimedDescendant = false;
      var keys = Object.keys(node);

      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        var key = keys[keyIndex];
        var value = node[key];

        if (value && typeof value === "object") {
          if (walk(value, path.concat(key))) {
            hasTimedDescendant = true;
          }
        }
      }

      var text = getObjectText(node);
      var startSeconds = getStartSeconds(node);
      var endSeconds = getEndSeconds(node, startSeconds);
      var hasUsableTiming = startSeconds !== null || endSeconds !== null;

      if (text && hasUsableTiming) {
        nodes.push({
          text: text,
          startSeconds: startSeconds,
          endSeconds: endSeconds,
          hasTimedDescendant: hasTimedDescendant,
          path: path.join(".")
        });

        return true;
      }

      return hasTimedDescendant;
    }

    walk(rootNode, []);
    return nodes;
  }

  function expandTimedTextNode(node, indexOffset) {
    var tokens = tokenizeText(node.text);
    if (!tokens.length) {
      return [];
    }

    var start = node.startSeconds;
    var end = node.endSeconds;

    if (start === null && end !== null) {
      start = Math.max(0, end - tokens.length * 0.25);
    }

    if (start !== null && end === null) {
      end = start + tokens.length * 0.25;
    }

    if (start === null || end === null) {
      return [];
    }

    if (end < start) {
      var swap = start;
      start = end;
      end = swap;
    }

    var duration = Math.max(0.01, end - start);
    var tokenDuration = duration / tokens.length;

    return tokens.map(function (token, tokenIndex) {
      var tokenStart = start + tokenDuration * tokenIndex;
      var tokenEnd = tokenIndex === tokens.length - 1 ? end : tokenStart + tokenDuration;

      return {
        index: indexOffset + tokenIndex,
        text: token,
        normalizedText: normalizeToken(token),
        startSeconds: tokenStart,
        endSeconds: tokenEnd,
        path: node.path
      };
    });
  }

  function extractTranscriptWords(input) {
    var transcript = parseTranscriptJSON(input);
    var timedTextNodes = collectTimedTextNodes(transcript);
    var leafNodes = timedTextNodes.filter(function (node) {
      return !node.hasTimedDescendant;
    });
    var sourceNodes = leafNodes.length ? leafNodes : timedTextNodes;
    var words = [];

    sourceNodes.sort(function (left, right) {
      var leftTime = left.startSeconds !== null ? left.startSeconds : left.endSeconds;
      var rightTime = right.startSeconds !== null ? right.startSeconds : right.endSeconds;
      return (leftTime || 0) - (rightTime || 0);
    });

    for (var index = 0; index < sourceNodes.length; index += 1) {
      var expanded = expandTimedTextNode(sourceNodes[index], words.length);
      words = words.concat(expanded);
    }

    for (var wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      var word = words[wordIndex];
      var next = words[wordIndex + 1];

      if (!(word.endSeconds > word.startSeconds)) {
        word.endSeconds = next ? Math.max(word.startSeconds + 0.01, next.startSeconds) : word.startSeconds + 0.25;
      }
    }

    return words.filter(function (word) {
      return word.normalizedText && Number.isFinite(word.startSeconds) && Number.isFinite(word.endSeconds);
    });
  }

  function getSearchTokens(searchTerm) {
    return tokenizeText(searchTerm).map(normalizeToken).filter(Boolean);
  }

  function parseSearchQuery(searchTerm) {
    var raw = String(searchTerm || "").trim();

    if (!raw) {
      return { raw: raw, clauses: [] };
    }

    var orParts = raw.split(/(?:\s+\bOR\b\s+|\s*\|\s*|[,;\n]+)/);
    var clauses = [];

    for (var orIndex = 0; orIndex < orParts.length; orIndex += 1) {
      var orPart = orParts[orIndex].trim();
      if (!orPart) {
        continue;
      }

      var andParts = orPart.split(/(?:\s+\bAND\b\s+|\s*\+\s*)/).map(function (part) {
        return part.trim();
      }).filter(Boolean);
      var phrases = [];

      for (var andIndex = 0; andIndex < andParts.length; andIndex += 1) {
        var tokens = getSearchTokens(andParts[andIndex]);
        if (tokens.length) {
          phrases.push({
            text: andParts[andIndex],
            tokens: tokens
          });
        }
      }

      if (phrases.length) {
        clauses.push({
          operator: phrases.length > 1 ? "AND" : "PHRASE",
          phrases: phrases
        });
      }
    }

    return {
      raw: raw,
      clauses: clauses
    };
  }

  function createHitFromWords(matchWords, hitIndex, sourceClipName, handleBefore, handleAfter, sourceDurationSeconds) {
    var firstWord = matchWords[0];
    var lastWord = matchWords[matchWords.length - 1];
    var startSeconds = firstWord.startSeconds;
    var endSeconds = lastWord.endSeconds;
    var handleStartSeconds = Math.max(0, startSeconds - handleBefore);
    var handleEndSeconds = endSeconds + handleAfter;

    if (Number.isFinite(sourceDurationSeconds)) {
      handleEndSeconds = Math.min(sourceDurationSeconds, handleEndSeconds);
    }

    return {
      index: hitIndex,
      sourceClipName: sourceClipName || "Selected clip",
      matchText: matchWords.map(function (word) { return word.text; }).join(" "),
      startSeconds: roundSeconds(startSeconds),
      endSeconds: roundSeconds(endSeconds),
      handleStartSeconds: roundSeconds(handleStartSeconds),
      handleEndSeconds: roundSeconds(handleEndSeconds),
      transcriptWordStartIndex: firstWord.index,
      transcriptWordEndIndex: lastWord.index
    };
  }

  function roundSeconds(value) {
    return Math.round(value * 1000) / 1000;
  }

  function findPhraseOccurrences(words, searchTokens, wholeWordOnly) {
    var occurrences = [];

    if (!wholeWordOnly && searchTokens.length === 1) {
      var needle = searchTokens[0];
      for (var partialIndex = 0; partialIndex < words.length; partialIndex += 1) {
        if (words[partialIndex].normalizedText.indexOf(needle) !== -1) {
          occurrences.push({
            startIndex: partialIndex,
            endIndex: partialIndex,
            words: [words[partialIndex]]
          });
        }
      }

      return occurrences;
    }

    for (var index = 0; index <= words.length - searchTokens.length; index += 1) {
      var matches = true;

      for (var tokenIndex = 0; tokenIndex < searchTokens.length; tokenIndex += 1) {
        if (words[index + tokenIndex].normalizedText !== searchTokens[tokenIndex]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        occurrences.push({
          startIndex: index,
          endIndex: index + searchTokens.length - 1,
          words: words.slice(index, index + searchTokens.length)
        });
      }
    }

    return occurrences;
  }

  function getOccurrenceGapSeconds(previous, next) {
    var previousEnd = previous.words[previous.words.length - 1].endSeconds;
    var nextStart = next.words[0].startSeconds;
    return nextStart - previousEnd;
  }

  function findAndOccurrences(words, phraseOccurrences, maxGapSeconds) {
    var results = [];
    var firstGroup = phraseOccurrences[0] || [];

    for (var firstIndex = 0; firstIndex < firstGroup.length; firstIndex += 1) {
      var selected = [firstGroup[firstIndex]];
      var previous = firstGroup[firstIndex];
      var matchedAll = true;

      for (var groupIndex = 1; groupIndex < phraseOccurrences.length; groupIndex += 1) {
        var group = phraseOccurrences[groupIndex];
        var nextMatch = null;

        for (var occurrenceIndex = 0; occurrenceIndex < group.length; occurrenceIndex += 1) {
          var candidate = group[occurrenceIndex];
          var gap = getOccurrenceGapSeconds(previous, candidate);

          if (candidate.startIndex > previous.endIndex && gap >= 0 && gap <= maxGapSeconds) {
            nextMatch = candidate;
            break;
          }
        }

        if (!nextMatch) {
          matchedAll = false;
          break;
        }

        selected.push(nextMatch);
        previous = nextMatch;
      }

      if (matchedAll) {
        var first = selected[0];
        var last = selected[selected.length - 1];
        results.push({
          startIndex: first.startIndex,
          endIndex: last.endIndex,
          words: words.slice(first.startIndex, last.endIndex + 1)
        });
      }
    }

    return results;
  }

  function dedupeAndSortHits(hits) {
    var seen = {};
    var unique = [];

    hits.sort(function (left, right) {
      return left.handleStartSeconds - right.handleStartSeconds ||
        left.handleEndSeconds - right.handleEndSeconds ||
        left.matchText.localeCompare(right.matchText);
    });

    for (var index = 0; index < hits.length; index += 1) {
      var hit = hits[index];
      var key = [
        hit.transcriptWordStartIndex,
        hit.transcriptWordEndIndex,
        hit.handleStartSeconds,
        hit.handleEndSeconds,
        hit.matchText
      ].join(":");

      if (!seen[key]) {
        seen[key] = true;
        hit.index = unique.length + 1;
        unique.push(hit);
      }
    }

    return unique;
  }

  function findPhraseHits(words, searchTerm, options) {
    var settings = options || {};
    var query = parseSearchQuery(searchTerm);
    var handleBefore = Math.max(0, Number(settings.handleBeforeSeconds) || 0);
    var handleAfter = Math.max(0, Number(settings.handleAfterSeconds) || 0);
    var sourceClipName = settings.sourceClipName || "Selected clip";
    var sourceDurationSeconds = settings.sourceDurationSeconds;
    var wholeWordOnly = settings.wholeWordOnly !== false;
    var andGapSeconds = Math.max(0, Number(settings.andGapSeconds) || 12);
    var hits = [];

    if (!query.clauses.length) {
      throw new Error("search term is empty");
    }

    if (!Array.isArray(words) || !words.length) {
      throw new Error("selected item has no transcript words with timing");
    }

    for (var clauseIndex = 0; clauseIndex < query.clauses.length; clauseIndex += 1) {
      var clause = query.clauses[clauseIndex];
      var phraseOccurrences = clause.phrases.map(function (phrase) {
        return findPhraseOccurrences(words, phrase.tokens, wholeWordOnly);
      });
      var occurrences = [];

      if (clause.operator === "AND") {
        occurrences = phraseOccurrences.every(function (group) { return group.length; }) ?
          findAndOccurrences(words, phraseOccurrences, andGapSeconds) :
          [];
      } else {
        occurrences = phraseOccurrences[0];
      }

      for (var occurrenceIndex = 0; occurrenceIndex < occurrences.length; occurrenceIndex += 1) {
        hits.push(createHitFromWords(
          occurrences[occurrenceIndex].words,
          hits.length + 1,
          sourceClipName,
          handleBefore,
          handleAfter,
          sourceDurationSeconds
        ));
      }
    }

    return dedupeAndSortHits(hits);
  }

  function buildHitsFromTranscript(input, searchTerm, options) {
    var words = extractTranscriptWords(input);
    var hits = findPhraseHits(words, searchTerm, options);

    return {
      words: words,
      hits: hits,
      shapeKeys: getTopLevelShape(input)
    };
  }

  function formatSeconds(seconds) {
    var safeSeconds = Math.max(0, Number(seconds) || 0);
    var minutes = Math.floor(safeSeconds / 60);
    var remaining = safeSeconds - minutes * 60;
    var padded = remaining < 10 ? "0" + remaining.toFixed(2) : remaining.toFixed(2);
    return minutes + ":" + padded;
  }

  return {
    buildHitsFromTranscript: buildHitsFromTranscript,
    extractTranscriptWords: extractTranscriptWords,
    findPhraseHits: findPhraseHits,
    formatSeconds: formatSeconds,
    getSearchTokens: getSearchTokens,
    getTopLevelShape: getTopLevelShape,
    normalizeToken: normalizeToken,
    parseSearchQuery: parseSearchQuery,
    parseTranscriptJSON: parseTranscriptJSON
  };
});
