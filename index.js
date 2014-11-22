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
    notes: [],
    beatsPerMinute: 120,
    beatUnit: 4
  };

  xmlParser.parseString(xml, function(err, result) {
    var part = result["score-partwise"]["part"][0];

    part["measure"].forEach(function(measure) {
      measure["note"].forEach(function(note) {
        var pitch = note["pitch"][0];
        var step = pitch["step"][0];
        var octave = pitch["octave"][0];
        score.notes.push(teoria.note(step + octave, { value: 4 }));
      });
    });
  });

  return score;
};

module.exports.newStream = function(xml, bitsPerSample, samplesPerSecond) {
  var score = readScore(xml);
  var bytesPerSample = bitsPerSample / 8;
  var amplitude = (Math.pow(2, bitsPerSample) / 2) - 1;
  var noteIndex = 0;
  var pcmStream = new stream.Readable();

  pcmStream._read = function() {
    var note = score.notes[noteIndex];
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
    if (noteIndex >= score.notes.length) {
      this.push(null); // We're all out of notes! Finish streaming.
    }
  };

  return pcmStream;
};
