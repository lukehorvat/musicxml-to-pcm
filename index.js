var lame = require("lame");
var teoria = require("teoria");
var stream = require("stream");
var fs = require("fs");

var sampleRate = 44100; // Samples in 1 second.
var bitsPerSample = 16; // A 16-bit integer will represent each sample.
var bytesPerSample = bitsPerSample / 8;
var amplitude = (Math.pow(2, bitsPerSample) / 2) - 1;
var beatsPerMinute = 120;
var beatUnit = 4;
var notes = [
  teoria.note("C4", { value: 4 }),
  teoria.note("D4", { value: 4 }),
  teoria.note("E4", { value: 4 }),
  teoria.note("F4", { value: 4 }),
  teoria.note("G4", { value: 4 }),
  teoria.note("A4", { value: 4 }),
  teoria.note("B4", { value: 4 }),
  teoria.note("C5", { value: 4 }),
  teoria.note("C5", { value: 4 }),
  teoria.note("B4", { value: 4 }),
  teoria.note("A4", { value: 4 }),
  teoria.note("G4", { value: 4 }),
  teoria.note("F4", { value: 4 }),
  teoria.note("E4", { value: 4 }),
  teoria.note("D4", { value: 4 }),
  teoria.note("C4", { value: 4 })
];
var noteIndex = 0;
var readableStream = new stream.Readable();

readableStream._read = function() {
  var note = notes[noteIndex];
  var frequency = note.fq();
  var durationInSeconds = note.durationInSeconds(beatsPerMinute, beatUnit);
  var totalSamples = sampleRate * durationInSeconds;

  // Fill a buffer with all of the PCM samples for this note. Since the
  // buffer holds 1 byte per slot, and each sample is 2 bytes (a 16-bit integer),
  // the buffer's capacity needs to be twice the number of samples.
  var buffer = new Buffer(totalSamples * bytesPerSample);
  for (var sampleIndex = 0; sampleIndex < totalSamples; sampleIndex++) {
    var sample = Math.floor(amplitude * Math.sin((2 * Math.PI * frequency * sampleIndex) / sampleRate));
    buffer.writeInt16LE(sample, sampleIndex * bytesPerSample);
  }
  this.push(buffer);

  noteIndex++;
  if (noteIndex >= notes.length) {
    this.push(null); // We're all out of notes! Finish streaming.
  }
};

readableStream
  .pipe(new lame.Encoder({ channels: 1, bitDepth: bitsPerSample, sampleRate: sampleRate }))
  .pipe(fs.createWriteStream("test.mp3"))
  .on("finish", function() {
    console.log("Finished!");
  });
