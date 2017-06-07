const Package = require("../package.json");
const MusicPlaylist = require("./MusicPlaylist");

class MusicStreamer {
  constructor(options = {}) {
    this.version = Package.version;

    this.playing = false;
    this.paused = false;
    this.playlist = new MusicPlaylist(options.playlist);

    this.volume = 1.0;

    this.output = options.output;
  }

  //======================================================================================
  // Stream

  _play() {
    const current = this.playlist.getCurrent();

    const stream = current.openAsStream();
    this.output.play(stream, () => {
      this.nextSong();
    });
  }

  start() {
    if(this.paused) return this.resume();
    if(this.playing) return;

    this._play();
    this.playing = true;
  }

  stop() {
    if(!this.playing) return;

    this.output.stop();
    this.playing = false;
  }

  pause() {
    if(!this.playing) return;
    if(this.paused) return;

    this.output.pause();
    this.paused = true;
  }

  resume() {
    if(!this.playing) return this.start();
    if(!this.paused) return;

    this.output.resume();
    this.paused = false;
  }

  //======================================================================================
  // Playback

  setVolume(volume) {
    this.volume = volume;
    return this.output.setVolume(volume);
  }

  nextSong() {
    if(this.playing) {
      const result = this.playlist.changeNext();

      if(result) this._play();
      else { this.stop(); return false; }
    }
    else {
      this.playlist.changeNext();
    }

    return true;
  }

  //======================================================================================
  // Playlist

  getNowplaying() {
    return this.playlist.getCurrent();
  }

  getUpcoming(size = 5) {
    return this.playlist.getUpcoming(size);
  }

  addLocalFile(filePath, adderId) {
    return this.playlist.addLocalFile(filePath, adderId);
  }

  addRemoteFile(remoteURL, adderId) {
    return this.playlist.addRemoteFile(remoteURL, adderId);
  }
}

module.exports = MusicStreamer;
