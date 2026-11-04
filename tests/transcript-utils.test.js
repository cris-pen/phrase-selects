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
}

run();
console.log("transcript-utils tests passed");
