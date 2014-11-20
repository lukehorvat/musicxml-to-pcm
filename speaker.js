var Speaker = require("speaker");
var index = require("./index");

var bitsPerSample = 16; // A 16-bit integer will represent each sample.
var samplesPerSecond = 44100;
var pcmStream = index.newStream(bitsPerSample, samplesPerSecond);

pcmStream
.pipe(new Speaker({ channels: 1, bitDepth: bitsPerSample, sampleRate: samplesPerSecond }))
.on("finish", function() {
  console.log("Finished!");
});
