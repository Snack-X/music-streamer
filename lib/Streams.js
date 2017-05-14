const stream = require("stream");

class NullWritable extends stream.Writable {
  constructor(options) { super(options); }

  _write(chunk, encoding, cb) { setImmediate(cb); }
  _writev(chunks, cb) { setImmediate(cb); }
}

class ZeroReadable extends stream.Readable {
  constructor(options) { super(options); }
  _read(size) { this.push(Buffer.alloc(size)); }
}

class Throttle extends stream.Transform {
  constructor(options) {
    if(!options.bps) throw "Streams.Throttle: `bps` (bytes per second) option is required";
    if(!options.chunkSize) options.chunkSize = Math.floor(options.bps / 10) | 0;

    super(options);

    this.bps = options.bps;
    this.chunkSize = Math.max(1, options.chunkSize);
    this.interval = 1000 / (this.bps / this.chunkSize);

    // bytes written after lastWrite
    this.bytesWritten = 0;
    this.lastWrite = Date.now();
  }

  _transform(chunk, encoding, cb) {
    let chunkOffset = 0;
    let writeSome = () => {
      let elapsed = Date.now() - this.lastWrite;

      // Already fully wrote
      if(this.bytesWritten === this.chunkSize) {
        // Wait until the interval
        if(elapsed < this.interval)
          return setTimeout(writeSome, this.interval - elapsed);
        // ...but time has passed enough, so okay to write
        else this.bytesWritten = 0;
      }

      // No more left
      if(chunkOffset === chunk.length) return cb();
      // Can write more
      else {
        let size = this.chunkSize - this.bytesWritten;
        let slice = chunk.slice(chunkOffset, chunkOffset + size);
        this.push(slice);

        chunkOffset += slice.length;
        this.bytesWritten += slice.length;
        this.lastWrite = Date.now();

        return setImmediate(writeSome);
      }
    }

    writeSome();
  };
}

module.exports = {
  NullWritable,
  ZeroReadable,
  Throttle,
};
