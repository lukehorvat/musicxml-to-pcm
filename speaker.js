var fs = require("fs");
var Speaker = require("speaker");
var index = require("./index");

var bitsPerSample = 16; // A 16-bit integer will represent each sample.
var samplesPerSecond = 44100;
var pcmStream = index.newStream(fs.readFileSync("tab1.xml", "utf8"), bitsPerSample, samplesPerSecond);

pcmStream
.pipe(new Speaker({ channels: 1, bitDepth: bitsPerSample, sampleRate: samplesPerSecond }))
.on("finish", function() {
  console.log("Finished!");
});
