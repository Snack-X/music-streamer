const Output = require("./Output");
const DiscordInstance = require("../lib/DiscordInstance");
const MSError = require("../core/Error");

class DiscordOutput extends Output {
  constructor(options) {
    super();

    this.name = "DiscordOutput";
    this.options = Object.assign({}, options);

    const _SCOPE_ = "DiscordOutput";

    if(!this.options.token) throw MSError(_SCOPE_, "Missing `token` from options");
    if(!this.options.guild) throw MSError(_SCOPE_, "Missing `guild` from options");
    if(!this.options.channel) throw MSError(_SCOPE_, "Missing `channel` from options");

    DiscordInstance.get({
      token: options.token,
      clientOptions: options.clientOptions
    }).then(client => {
      this.client = client;
      this._connect();
    });
  }

  _connect() {
    this.guild = this.client.guilds.get(this.options.guild);
    this.channel = this.guild.channels.get(this.options.channel);

    this.voiceConnection = null;
    this.currentStream = null;

    this.channel.join().then(conn => {
      this.voiceConnection = conn;
    });
  }

  play(stream, onPlaybackEnd) {
    if(!this.voiceConnection) throw MSError("DiscordOutput.play", "Not connected to the voice channel");

    if(this.currentStream) this.currentStream.end();

    this.currentStream = this.voiceConnection.playStream(stream);

    this.currentStream.on("end", () => {
      onPlaybackEnd();
    });
    this.currentStream.on("error", e => {
      console.log(e);
    });

    return true;
  }

  stop() {
    this.currentStream.end();
    this.currentStream = null;
    return true;
  }

  pause() {
    this.currentStream.pause();
    return true;
  }

  resume() {
    this.currentStream.resume();
    return true;
  }

  setVolume(volume) {
    this.currentStream.setVolume(volume);
    return true;
  }
}

module.exports = DiscordOutput;
