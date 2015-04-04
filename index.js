"use strict";

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
  var score = { parts: [] };

  xmlParser.parseString(xml, function(err, result) {
    var scoreEl = result["score-partwise"];
    if (!scoreEl) {
      // TODO: Add support for score-timewise.
      throw new Error("MusicXML document does not have a partwise score element defined.");
    }

    var partEls = scoreEl["part"];
    if (!partEls || partEls.length == 0) {
      throw new Error("Score element does not have any part elements defined.");
    }

    partEls.forEach(function(partEl) {
      var part = { measures: [] }

      var measureEls = partEl["measure"];
      if (!measureEls || measureEls.length == 0) {
        throw new Error("Part element does not have any measure elements defined.");
      }

      measureEls.forEach(function(measureEl) {
        var measure = { notes: [], beatsPerMinute: 120, beatUnit: 4 }; // TODO: Read BPM from measure element.

        var noteEls = measureEl["note"];
        if (!noteEls || noteEls.length == 0) {
          throw new Error("Measure element does not have any note elements defined.");
        }

        noteEls.forEach(function(noteEl) {
          var note = {};

          var pitchEls = noteEl["pitch"];
          if (!pitchEls || pitchEls.length == 0) {
            throw new Error("Note element does not have a pitch element defined.");
          }
          else if (pitchEls.length > 1) {
            throw new Error("Note element has multiple pitch elements defined.");
          }

          var pitchEl = pitchEls[0];

          var stepEls = pitchEl["step"];
          if (!stepEls || stepEls.length == 0) {
            throw new Error("Pitch element does not have a step element defined.");
          }
          else if (stepEls.length > 1) {
            throw new Error("Pitch element has multiple step elements defined.");
          }
          else {
            note.step = stepEls[0];
          }

          var octaveEls = pitchEl["octave"];
          if (!octaveEls || octaveEls.length == 0) {
            throw new Error("Pitch element does not have an octave element defined.");
          }
          else if (octaveEls.length > 1) {
            throw new Error("Pitch element has multiple octave elements defined.");
          }
          else {
            note.octave = octaveEls[0];
          }

          var alterEls = pitchEl["alter"];
          if (!alterEls || alterEls.length == 0) {
            note.alter = "";
          }
          else if (alterEls.length > 1) {
            throw new Error("Pitch element has multiple alter elements defined.");
          }
          else {
            note.alter = function(alterEl) {
              switch(parseInt(alterEl, 10)) {
                case -2: return "bb";
                case -1: return "b";
                case 1: return "#";
                case 2: return "x";
              }
            }(alterEls[0]);
          }

          var typeEls = noteEl["type"];
          if (!typeEls || typeEls.length == 0) {
            throw new Error("Note element does not have a type element defined.");
          }
          else if (typeEls.length > 1) {
            throw new Error("Note element has multiple type elements defined.");
          }
          else {
            note.duration = function(typeEl) {
              switch(typeEl) {
                case "whole": return 1;
                case "half": return 2;
                case "quarter": return 4;
                case "eighth": return 8;
                case "16th": return 16;
                case "32nd": return 32;
                case "64th": return 64;
                case "128th": return 128;
                case "256th": return 256;
              }
            }(typeEls[0]);
          }

          measure.notes.push(note);
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
          var teoriaNote = teoria.note(note.step + note.alter + note.octave, { value: note.duration });
          var frequency = teoriaNote.fq();
          var durationInSeconds = teoriaNote.durationInSeconds(measure.beatsPerMinute, measure.beatUnit);
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
