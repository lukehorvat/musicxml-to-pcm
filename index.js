var stream = require("stream");
var teoria = require("teoria");
var xml2js = require("xml2js");

var xmlParser = new xml2js.Parser({
  tagNameProcessors: [
    xml2js.processors.stripPrefix,
    xml2js.processors.firstCharLowerCase
  ]
});

var readScore = function(xml) {
  var score = {
    parts: [],
    beatsPerMinute: 120,
    beatUnit: 4
  };

  xmlParser.parseString(xml, function(err, result) {
    var scoreEl = result["score-partwise"];

    scoreEl["part"].forEach(function(partEl) {
      var part = { measures: [] }

      partEl["measure"].forEach(function(measureEl) {
        var measure = { notes: [] };

        measureEl["note"].forEach(function(noteEl) {
          var pitchEl = noteEl["pitch"][0];
          var stepEl = pitchEl["step"][0];
          var octaveEl = pitchEl["octave"][0];
          measure.notes.push(teoria.note(stepEl + octaveEl, { value: 4 }));
        });

        part.measures.push(measure);
      });

      score.parts.push(part);
    });
  });

  return score;
};

module.exports.newStream = function(xml, bitsPerSample, samplesPerSecond) {
  var score = readScore(xml);
  var bytesPerSample = bitsPerSample / 8;
  var amplitude = (Math.pow(2, bitsPerSample) / 2) - 1;
  var partIndex = 0;
  var measureIndex = 0;
  var noteIndex = 0;
  var pcmStream = new stream.Readable();

  pcmStream._read = function() {
    var part = score.parts[partIndex];
    if (part) {
      var measure = part.measures[measureIndex];
      if (measure) {
        var note = measure.notes[noteIndex];
        if (note) {
          var frequency = note.fq();
          var durationInSeconds = note.durationInSeconds(score.beatsPerMinute, score.beatUnit);
          var totalSamples = samplesPerSecond * durationInSeconds;

          // Fill a buffer with all of the PCM audio data samples for this note. Since the
          // buffer holds 1 byte per slot, and each sample is 2 bytes (a 16-bit integer),
          // the buffer's capacity needs to be twice the number of samples.
          var buffer = new Buffer(totalSamples * bytesPerSample);
          for (var sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
            var sample = Math.floor(amplitude * Math.sin((2 * Math.PI * frequency * sampleIndex) / samplesPerSecond));
            buffer.writeInt16LE(sample, sampleIndex * bytesPerSample);
          }

          this.push(buffer);
          noteIndex++;
        }

        if (noteIndex >= measure.notes.length) {
          measureIndex++;
          noteIndex = 0;
        }
      }

      if (measureIndex >= part.measures.length) {
        partIndex++;
        measureIndex = 0;
      }
    }

    if (partIndex >= score.parts.length) {
      this.push(null); // We're all out of notes! Finish streaming.
    }
  };

  return pcmStream;
};
