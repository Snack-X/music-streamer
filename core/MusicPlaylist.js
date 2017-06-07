const crypto = require("crypto");
const fs = require("mz/fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const url = require("url");
const EventEmitter = require("events").EventEmitter;

const MSError = require("./Error");
const Probe = require("../lib/Probe");
const RemoteDownload = require("../lib/RemoteDownload");

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

      localFile: true,
      remoteFile: true,

      remoteSaveDir: os.tmpdir(),
      remoteMaxSize: Infinity,
      remoteOverwrite: false,
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

  //======================================================================================

  async _validate(filePath) {
    let fileStat;
    try {
      await fs.access(filePath, fs.constants.R_OK);
      fileStat = await fs.stat(filePath);
    }
    catch(e) {
      throw new MSError("File is not found, or not available");
    }

    if(!fileStat.isFile())
      throw new MSError("Not regular file, but could be directory, socket, etc");
  }

  async _probe(filePath) {
    const probe = await Probe(filePath);

    if(!probe.streams)
      throw new MSError("Not valid media file");
    if(probe.streams[0].codec_type !== "audio")
      throw new MSError("Not compatible audio file");

    return probe;
  }

  //======================================================================================

  async _addLocalFile(musicType, filePath, musicKey, adderId, customValidator) {
    // Validate and probe
    await this._validate(filePath);
    const probe = await this._probe(filePath);

    // Build music entry
    const musicId = this.list.length;
    const duration = parseFloat(probe.format.duration);
    let title = path.basename(filePath), artist = "", album = "";

    if(probe.format.tags) {
      if(probe.format.tags.title) title = probe.format.tags.title;
      if(probe.format.tags.artist) artist = probe.format.tags.artist;
      if(probe.format.tags.album) album = probe.format.tags.album;
    }

    const music = new MusicEntry(musicId, musicType, adderId, musicKey, filePath, duration, title, artist, album);

    // Custom validator
    if(customValidator) {
      const result = await customValidator(music);
      if(result !== true) throw new MSError("Rejected (" + result + ")");
    }

    // Add music
    if(this.options.allowDuplicate) {
      this.list.push(music);
    }
    // Just in case of some kind of race condition
    else if(this.musicKey.has(musicKey)) {
      throw new MSError("Music is already queued by other");
    }
    else {
      this.list.push(music);
      this.musicKey.add(musicKey);
    }

    return musicId;
  }

  async addLocalFile(filePath, adderId, customValidator) {
    if(!this.options.localFile) throw new MSError("Adding local file is not allowed");

    const musicKey = "localFile:" + filePath;

    // Playlist duplicate check
    if(!this.options.allowDuplicate && this.musicKey.has(musicKey))
      throw new MSError("This local file is already queued");

    // Add
    const musicId = await this._addLocalFile("localFile", filePath, musicKey, adderId, customValidator);

    this.emit("listUpdate");
    return musicId;
  }

  async addRemoteFile(remoteURL, adderId, customValidator) {
    if(!this.options.remoteFile) throw new MSError("Adding remote file is not allowed");

    const musicKey = "remoteFile:" + remoteURL;

    // Playlist duplicate check
    if(!this.options.allowDuplicate && this.musicKey.has(musicKey))
      throw new MSError("This remote file is already queued");

    // Download
    let filename = remoteURL;
    if(!this.options.remoteOverwrite) filename = new Date().getTime() + filename;

    const sha256 = crypto.createHash("sha256");
    sha256.update(filename);
    filename = sha256.digest("hex");

    const destination = path.join(this.options.remoteSaveDir, filename);
    await RemoteDownload(remoteURL, destination, this.options.remoteMaxSize);

    // Add downloaded
    const musicId = await this._addLocalFile("remoteFile", destination, musicKey, adderId, customValidator);

    this.emit("listUpdate");
    return musicId;
  }
}

module.exports = MusicPlaylist;
