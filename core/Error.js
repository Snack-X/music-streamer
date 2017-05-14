class MusicStreamerError extends Error {
  constructor(scope, message, detail) {
    super(message);

    this.name = "MusicStreamerError";
    this.scope = scope;
    this.detail = detail;
  }
}

module.exports = MusicStreamerError;
