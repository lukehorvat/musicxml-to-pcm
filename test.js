"use strict";

var musicXmlToPcm = require("./");

describe("newStream()", function() {
  it("should throw an error for non-partwise scores", function() {
    var xml = "<score-timewise></score-timewise>";
    var bitsPerSample = 16;
    var samplesPerSecond = 44100;

    (function() {
      musicXmlToPcm.newStream(xml, bitsPerSample, samplesPerSecond);
    }).should.throw("MusicXML document does not have a partwise score element defined.");
  });
});
