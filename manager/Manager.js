const EventEmitter = require("events").EventEmitter;

class Manager extends EventEmitter {
  constructor() {
    super();

    this.streamer = null;
  }

  attach(musicStreamer) {
    this.streamer = musicStreamer;
  }

  //======================================================================================
  // Stream

  info() {
    return {
      version: this.streamer.version,
      output: this.streamer.output.name,
      playlistRepeat: this.streamer.playlist.options.repeat,
    };
  }

  status() {
    if(this.streamer.playing === false) return "idle";
    else if(this.streamer.paused) return "paused";
    else return "playing";
  }

  start() {
    this.streamer.start();
  }

  stop() {
    this.streamer.stop();
  }

  pause() {
    this.streamer.pause();
  }

  resume() {
    this.streamer.resume();
  }

  quit() {
    this.streamer.stop();
    process.exit(0);
  }

  //======================================================================================
  // Playback

  setVolume(volume) {
    return this.streamer.setVolume(volume);
  }

  skipNext() {
    return this.streamer.nextSong();
  }

  //======================================================================================
  // Playlist

  getNowplaying() {
    if(this.streamer.playing === false) return null;
    return this.streamer.getNowplaying();
  }

  getUpcoming(size) {
    return this.streamer.getUpcoming(size);
  }

  addLocalFile(filePath, adderId) {
    return this.streamer.addLocalFile(filePath, adderId);
  }
}

module.exports = Manager;
