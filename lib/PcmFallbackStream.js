const stream = require("stream");

class PcmFallbackStream extends stream.Readable {
  constructor(options) {
    super(options);

    this.paused = false;
    this.upstream = null;
  }

  setUpstream(stream) {
    this.upstream = stream;
    this.upstream.on("end", () => { this.upstream = null; });
  }

  closeUpstream() {
    this.upstream = null;
  }

  pauseUpstream() { this.paused = true; }
  resumeUpstream() { this.paused = false; }

  _read(size) {
    let chunk = null;
    if(this.upstream && !this.paused) chunk = this.upstream.read(size);
    if(chunk === null) this.push(Buffer.alloc(size));
    else this.push(chunk);
  }
}

module.exports = PcmFallbackStream;
