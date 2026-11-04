const assert = require("assert");
const utils = require("../src/transcript-utils");

function run() {
  const wordTranscript = {
    segments: [
      {
        words: [
          { word: "Hot", startTime: 1, endTime: 1.2 },
          { word: "take", startTime: 1.21, endTime: 1.55 },
          { word: "incoming", startTime: 1.6, endTime: 2.0 }
        ]
      }
    ]
  };

  const wordResult = utils.buildHitsFromTranscript(wordTranscript, "hot take", {
    sourceClipName: "Interview.mov",
    handleBeforeSeconds: 0.25,
    handleAfterSeconds: 0.5,
    wholeWordOnly: true
  });

  assert.strictEqual(wordResult.words.length, 3);
  assert.strictEqual(wordResult.hits.length, 1);
  assert.strictEqual(wordResult.hits[0].matchText, "Hot take");
  assert.strictEqual(wordResult.hits[0].handleStartSeconds, 0.75);
  assert.strictEqual(wordResult.hits[0].handleEndSeconds, 2.05);

  const segmentTranscript = {
    transcription: [
      { text: "Phrase one lands here.", start: 0, end: 4 },
      { text: "Another phrase lands later.", start: 10, end: 14 }
    ]
  };

  const segmentResult = utils.buildHitsFromTranscript(segmentTranscript, "phrase", {
    sourceClipName: "Clip.wav",
    handleBeforeSeconds: 0.25,
    handleAfterSeconds: 0.5,
    wholeWordOnly: true
  });

  assert.strictEqual(segmentResult.hits.length, 2);
  assert.strictEqual(segmentResult.hits[0].handleStartSeconds, 0);

  const partialResult = utils.buildHitsFromTranscript(segmentTranscript, "land", {
    sourceClipName: "Clip.wav",
    handleBeforeSeconds: 0,
    handleAfterSeconds: 0,
    wholeWordOnly: false
  });

  assert.strictEqual(partialResult.hits.length, 2);

  const multiTranscript = {
    words: [
      { word: "cheese", startTime: 1, endTime: 1.2 },
      { word: "bread", startTime: 2, endTime: 2.2 },
      { word: "butter", startTime: 3, endTime: 3.2 },
      { word: "cook", startTime: 20, endTime: 20.2 }
    ]
  };

  const orResult = utils.buildHitsFromTranscript(multiTranscript, "cheese, cook", {
    handleBeforeSeconds: 0,
    handleAfterSeconds: 0,
    wholeWordOnly: true
  });

  assert.strictEqual(orResult.hits.length, 2);
  assert.strictEqual(orResult.hits[0].matchText, "cheese");
  assert.strictEqual(orResult.hits[1].matchText, "cook");

  const andResult = utils.buildHitsFromTranscript(multiTranscript, "cheese + butter", {
    handleBeforeSeconds: 0,
    handleAfterSeconds: 0,
    wholeWordOnly: true
  });

  assert.strictEqual(andResult.hits.length, 1);
  assert.strictEqual(andResult.hits[0].matchText, "cheese bread butter");

  assert.throws(() => {
    utils.buildHitsFromTranscript(segmentTranscript, "", {});
  }, /search term is empty/);

  // Curly apostrophes in the transcript must match straight apostrophes in the
  // search box, and vice versa (macOS smart quotes can rewrite either side).
  const apostropheTranscript = {
    words: [
      { word: "I", startTime: 0, endTime: 0.1 },
      { word: "don’t", startTime: 0.1, endTime: 0.4 },
      { word: "know", startTime: 0.4, endTime: 0.7 },
      { word: "it's", startTime: 1, endTime: 1.2 },
      { word: "fine", startTime: 1.2, endTime: 1.5 }
    ]
  };

  const straightSearch = utils.buildHitsFromTranscript(apostropheTranscript, "don't know", {});
  assert.strictEqual(straightSearch.words.length, 5);
  assert.strictEqual(straightSearch.hits.length, 1);
  assert.strictEqual(straightSearch.hits[0].matchText, "don't know");

  const curlySearch = utils.buildHitsFromTranscript(apostropheTranscript, "it’s fine", {});
  assert.strictEqual(curlySearch.hits.length, 1);

  const curlyOnlySearch = utils.buildHitsFromTranscript(apostropheTranscript, "don‘t", {});
  assert.strictEqual(curlyOnlySearch.hits.length, 1);

  // Lowercase "and"/"or" are searchable words, not operators.
  const andWordResult = utils.buildHitsFromTranscript({
    words: [
      { word: "mac", startTime: 0, endTime: 0.2 },
      { word: "and", startTime: 0.2, endTime: 0.3 },
      { word: "cheese", startTime: 0.3, endTime: 0.6 }
    ]
  }, "mac and cheese", {});
  assert.strictEqual(andWordResult.hits.length, 1);
  assert.strictEqual(andWordResult.hits[0].matchText, "mac and cheese");

  // Scripts with combining marks stay whole words, so whole-word search does
  // not match fragments inside them.
  const hindi = {
    words: [
      { word: "\u0926\u0941\u0928\u093F\u092F\u093E", startTime: 0, endTime: 0.9 },
      { word: "\u0928\u092E\u0938\u094D\u0924\u0947", startTime: 1, endTime: 1.6 }
    ]
  };
  assert.strictEqual(utils.buildHitsFromTranscript(hindi, "\u0928\u092E\u0938\u094D\u0924\u0947", {}).hits.length, 1);
  assert.strictEqual(utils.buildHitsFromTranscript(hindi, "\u0928", {}).hits.length, 0);
  assert.strictEqual(utils.extractTranscriptWords(hindi).length, 2);

  // Precomposed and decomposed accents match each other.
  const accented = { words: [{ word: "cafe\u0301", startTime: 0, endTime: 0.5 }] };
  assert.strictEqual(utils.buildHitsFromTranscript(accented, "caf\u00E9", {}).hits.length, 1);

  // Handles never extend past the clip's known duration.
  const clamped = utils.buildHitsFromTranscript(multiTranscript, "cook", {
    handleAfterSeconds: 5,
    sourceDurationSeconds: 21
  });
  assert.strictEqual(clamped.hits[0].handleEndSeconds, 21);
}

run();
console.log("transcript-utils tests passed");
