var lame = require("lame");
var teoria = require("teoria");
var stream = require("stream");
var fs = require("fs");

var sampleRate = 44100; // Samples in 1 second.
var bitDepth = 16; // A 16-bit integer will represent each sample.
var amplitude = (Math.pow(2, bitDepth) / 2) - 1;
var bpm = 120;
var beatUnit = 4;

var notes = []
notes.push(teoria.note("C4", { value: 4 }));
notes.push(teoria.note("D4", { value: 4 }));
notes.push(teoria.note("E4", { value: 4 }));
notes.push(teoria.note("F4", { value: 4 }));
notes.push(teoria.note("G4", { value: 4 }));
notes.push(teoria.note("A4", { value: 4 }));
notes.push(teoria.note("B4", { value: 4 }));
notes.push(teoria.note("C5", { value: 4 }));
notes.push(teoria.note("C5", { value: 4 }));
notes.push(teoria.note("B4", { value: 4 }));
notes.push(teoria.note("A4", { value: 4 }));
notes.push(teoria.note("G4", { value: 4 }));
notes.push(teoria.note("F4", { value: 4 }));
notes.push(teoria.note("E4", { value: 4 }));
notes.push(teoria.note("D4", { value: 4 }));
notes.push(teoria.note("C4", { value: 4 }));

var noteIndex = 0;
var sampleIndex = 0;
var readableStream = new stream.Readable();

readableStream._read = function() {
  var note = notes[noteIndex];
  var frequency = note.fq();
  var durationInSeconds = note.durationInSeconds(bpm, beatUnit);
  var totalSamples = sampleRate * durationInSeconds;

  // Sample the current moment in the PCM stream.
  var sample = Math.floor(amplitude * Math.sin((2 * Math.PI * frequency * sampleIndex) / sampleRate));

  // LAME expects a byte stream. Since a sample is a 16-bit integer,
  // a buffer of 2 bytes is required to transport it on the stream.
  var buffer = new Buffer(2);
  buffer.writeInt16LE(sample, 0);
  this.push(buffer);
  sampleIndex++;

  // Are we all out of samples for this note?
  if (sampleIndex >= totalSamples) {
    noteIndex++; // Next note.
    sampleIndex = 0; // Reset.

    // Are we all out of notes?
    if (noteIndex >= notes.length) {
      this.push(null); // Finish reading!
    }
  }
};

readableStream
  .pipe(new lame.Encoder({ channels: 1, bitDepth: bitDepth, sampleRate: sampleRate }))
  .pipe(fs.createWriteStream("test.mp3"))
  .on("finish", function() {
    console.log("Finished!");
  });
