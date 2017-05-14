const EventEmitter = require("events").EventEmitter;

class Output extends EventEmitter {
  constructor() {
    super();

    this.name = "DefaultOutput";
  }

  play(stream, onPlaybackEnd) {
    return false;
  }

  stop() {
    return false;
  }

  pause() {
    return false;
  }

  resume() {
    return false;
  }

  setVolume(volume) {
    return false;
  }
}

module.exports = Output;
