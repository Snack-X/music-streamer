class MusicStreamerError extends Error {
  constructor(message) {
    super(message);
    this.name = "MusicStreamerError";
  }
}

module.exports = MusicStreamerError;
