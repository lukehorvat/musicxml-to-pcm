# musicxml-to-pcm [![NPM version](http://img.shields.io/npm/v/musicxml-to-pcm.svg?style=flat-square)](https://www.npmjs.org/package/musicxml-to-pcm) [![Build status](http://img.shields.io/travis/lukehorvat/musicxml-to-pcm.svg?style=flat-square)](https://travis-ci.org/lukehorvat/musicxml-to-pcm)

Convert MusicXML to PCM audio data.

Provides a simple interface for transforming a MusicXML document into a stream of sound samples, which can then be piped to other audio tools / programs (e.g. encoders).

## Installation

Install the package with NPM:

```bash
$ npm install musicxml-to-pcm
```

## Usage

A single method is exposed, `newStream(xml, bitsPerSample, samplesPerSecond)`, that returns a readable stream emitting notes:

```javascript
var musicXmlToPcm = require("musicxml-to-pcm");
var fs = require("fs");

var xml = fs.readFileSync("song.xml");
var bitsPerSample = 16;
var samplesPerSecond = 44100;

var stream = musicXmlToPcm.newStream(xml, bitsPerSample, samplesPerSecond);
stream.on("data", function(note) { console.log(note) });
stream.on("end", function() { console.log("Done!") });
```

## Related

A few packages that utilize this interface:

- [musicxml-to-mp3](https://github.com/lukehorvat/musicxml-to-mp3)
- [musicxml-to-wav](https://github.com/lukehorvat/musicxml-to-wav)
- [musicxml-to-speaker](https://github.com/lukehorvat/musicxml-to-speaker)
