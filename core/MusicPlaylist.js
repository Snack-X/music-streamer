const fs = require("mz/fs");
const path = require("path");
const EventEmitter = require("events").EventEmitter;

const MSError = require("./Error");
const Probe = require("../lib/Probe");

class MusicEntry {
  constructor(id, type, adder, key, filePath, duration, title, artist, album) {
    this.id = id;
    this.type = type;
    this.adder = adder;
    this.key = key;
    this.filePath = filePath;
    this.duration = duration;
    this.title = title;
    this.artist = artist;
    this.album = album;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      adder: this.adder,
      duration: this.duration,
      title: this.title,
      artist: this.artist,
      album: this.album,
    };
  }

  toString() {
    return `MusicEntry(type=${this.type}, path=${this.filePath})`;
  }

  inspect() { return this.toString(); }

  openAsStream() {
    return fs.createReadStream(this.filePath);
  }
}

class MusicPlaylist extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = Object.assign({
      allowDuplicate: false,
      repeat: true,
    }, options);

    this.listCurrent = 0;
    this.list = [];

    this.musicKey = new Set();
  }

  getCurrent() {
    return this.list[this.listCurrent];
  }

  getUpcoming(size) {
    if(this.list.length === 0) return [];

    let list = [], i = this.listCurrent;

    while(list.length < size) {
      list.push(...this.list.slice(i, i + (size - list.length)));

      i += size;
      if(i >= this.list.length) i = 0;

      if(this.options.repeat === false) break;
    }

    return list;
  }

  getSize() {
    return this.list.length;
  }

  isEmpty() {
    return this.list.length === 0;
  }

  changeNext() {
    let next = this.listCurrent += 1;
    if(next >= this.list.length) {
      if(this.options.repeat) next = 0;
      else return false;
    }

    this.listCurrent = next;
    return true;
  }

  async addLocalFile(filePath, adderId, customValidator) {
    const _SCOPE_ = "Probe.addLocalFile";
    const musicKey = "localFile:" + filePath;

    // Duplicate check
    if(!this.options.allowDuplicate) {
      if(this.musicKey.has(musicKey))
        throw new MSError(_SCOPE_, "Duplicated file", "This file is already queued");

      this.musicKey.add(musicKey);
    }

    // Basic validation
    let fileStat;
    try {
      await fs.access(filePath, fs.constants.R_OK);
      fileStat = await fs.stat(filePath);
    }
    catch(e) {
      throw new MSError(_SCOPE_, "File not found", "File is not found, or not available");
    }

    if(!fileStat.isFile())
      throw new MSError(_SCOPE_, "Not a valid file", "This is not a file, but could be a directory, or not a regular file, etc");

    // Probe validation
    const probe = await Probe(filePath);

    if(!probe.streams)
      throw new MSError(_SCOPE_, "No stream found", "This file is not a valid media file");
    if(probe.streams[0].codec_type !== "audio")
      throw new MSError(_SCOPE_, "Invalid audio file", "This file is not a compatible audio file");

    // Build music entry
    const musicId = this.list.length;
    const duration = parseFloat(probe.format.duration);
    let title = path.basename(filePath), artist = "", album = "";

    if(probe.format.tags) {
      if(probe.format.tags.title) title = probe.format.tags.title;
      if(probe.format.tags.artist) artist = probe.format.tags.artist;
      if(probe.format.tags.album) album = probe.format.tags.album;
    }

    const music = new MusicEntry(musicId, "localFile", adderId, musicKey, filePath, duration, title, artist, album);

    // Custom validator
    if(customValidator) {
      const result = await customValidator(music);
      if(result !== true) throw new MSError(_SCOPE_, "Rejected", result);
    }

    // Good to go
    this.list.push(music);

    this.emit("listUpdate");
    return musicId;
  }
}

module.exports = MusicPlaylist;
