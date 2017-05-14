const Speaker = require("speaker");
const ffmpeg = require("fluent-ffmpeg");

const Output = require("./Output");
const PcmFallbackStream = require("../lib/PcmFallbackStream");

class SpeakerOutput {
  constructor(options) {
    this.name = "SpeakerOutput";

    this.speaker = new Speaker({
      channels: 2,
      bitDepth: 16,
      sampleRate: 48000,
    });

    this.currentStream = null;
    this.stream = new PcmFallbackStream();
    this.stream.pipe(this.speaker);
  }

  play(stream, onPlaybackEnd) {
    if(this.currentStream) this.stop();

    this.currentStream = ffmpeg()
      .input(stream).format("s16le").audioFrequency(48000).audioChannels(2)
      .on("start", (cmd) => { })
      .on("error", (err, stdout, stderr) => { })
      .on("end", (stdout, stderr) => {
        this.stream.closeUpstream();
        this.currentStream = null;

        onPlaybackEnd();
      });

    this.stream.setUpstream(this.currentStream.stream());

    return true;
  }

  stop() {
    this.stream.closeUpstream();
    this.currentStream.kill("SIGKILL");
    this.currentStream = null;

    return true;
  }

  pause() {
    this.stream.pauseUpstream();
    return true;
  }

  resume() {
    this.stream.resumeUpstream();
    return true;
  }
}

module.exports = SpeakerOutput;
