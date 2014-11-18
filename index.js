var lame = require("lame");
var stream = require("stream");
var fs = require("fs");
var sampleRate = 44100; // Samples in 1 second.
var durationSeconds = 5;
var totalSamples = sampleRate * durationSeconds;
var frequency = 440;
var bitDepth = 16; // A 16-bit integer will represent each sample.
var amplitude = (Math.pow(2, bitDepth) / 2) - 1;
var sampleNo = 0;
var readableStream = new stream.Readable();
var mp3Encoder = new lame.Encoder({ channels: 1, bitDepth: bitDepth, sampleRate: sampleRate });

readableStream._read = function() {
  // Sample the current moment in the PCM stream.
  var sample = Math.floor(amplitude * Math.sin((2 * Math.PI * frequency * sampleNo) / sampleRate));

  // LAME expects a byte stream. Since a sample is a 16-bit integer,
  // a buffer of 2 bytes is required to transport it on the stream.
  var buffer = new Buffer(2);
  buffer.writeInt16LE(sample, 0);
  this.push(buffer);
  sampleNo++;

  if (sampleNo >= totalSamples) {
    this.push(null); // All out of samples. Stop reading!
  }
};

readableStream.pipe(mp3Encoder).pipe(fs.createWriteStream("test.mp3")).on("finish", function() { console.log("Finished."); });
