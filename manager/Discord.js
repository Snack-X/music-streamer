const Manager = require("./Manager");
const MSError = require("../core/Error");
const DiscordInstance = require("../lib/DiscordInstance");

const CommandHelps = {
  "help": "Show help message",

  "info": "Get streamer information",
  "status": "Get streaming status",
  "start": "Start streaming if it is stopped",
  "stop": "Stop streaming if it is started",
  "pause": "Pause music playback",
  "resume": "Resume music playback",
  "quit": "Stop streamer and quit",

  "get-nowplaying": "Get now playing music",
  "get-upcoming": "Get upcoming musics upto 10 items",

  "skip-next": "Skip this song and play next song",

  "add-local-file": "Add local music file to the playlist (add-local-file",
};
const Commands = Object.keys(CommandHelps);

class DiscordManager extends Manager {
  constructor(options) {
    super();

    this.options = Object.assign({
      commandPrefix: ".",
    }, options);

    const _SCOPE_ = "DiscordOutput";
    if(!this.options.token) throw MSError(_SCOPE_, "Missing `token` from options");

    DiscordInstance.get({
      token: this.options.token,
      clientOptions: this.options.clientOptions
    }).then(client => {
      this.client = client;
      this._connect();
    });
  }

  _connect() {
    this.client.on("message", message => this._onMessage(message));
  }

  _onMessage(message) {
    if(this.options.guild && message.guild && message.guild.id !== this.options.guild) return;
    if(this.options.channel && message.channel.id !== this.options.channel) return;

    // Reject own message
    if(message.guild && message.guild.me.id === message.author.id) return;

    let content = message.content.trim();
    if(!content.startsWith(this.options.commandPrefix)) return;

    content = content.split(/\s+/);

    const cmd = content[0].slice(this.options.commandPrefix.length);
    const args = content.slice(1);

    if(Commands.includes(cmd)) {
      const method = "cmd_" + cmd.replace(/-/g, "_");
      this[method].call(this, message, ...args)
        .then(content => {
          return message.channel.send(content);
        })
        .then(() => {});
    }
  }

  //======================================================================================

  async cmd_help() {
    const content = [];

    for(const cmd of Commands)
      content.push(`${this.options.commandPrefix}${cmd} => ${CommandHelps[cmd]}`);

    return content;
  }

  //======================================================================================
  // Stream

  async cmd_info() {
    const content = [];

    const info = this.info();
    content.push(`Music Streamer ${info.version}`);
    content.push(`Connected output is '${info.output}'`);

    const repetition = info.playlistRepeat ? "on" : "off";
    content.push(`INFO: Playlist repetition is turned ${repetition}`);

    return content;
  }

  async cmd_status() {
    const content = [];

    const status = this.status();
    content.push(`Streaming status: ${status}`);

    if(status !== "idle")
      content.push(`Nowplaying: ${this.getNowplaying()}`);

    return content;
  }

  async cmd_start() {
    this.start();
    return `Streaming started.`;
  }

  async cmd_stop() {
    this.stop();
    return `Streaming stopped.`;
  }

  async cmd_pause() {
    this.pause();
    return `Streaming paused.`;
  }

  async cmd_resume() {
    this.resume();
    return `Streaming resumed.`;
  }

  async cmd_quit() {
    return `Stopping streamer...`;
    this.quit();
  }

  //======================================================================================
  // Playback

  async cmd_skip_next() {
    const result = this.skipNext();

    if(result) return `Playing next song.`;
    else return `End of playlist, stopped.`;
  }

  //======================================================================================
  // Playlist

  async cmd_get_nowplaying() {
    const nowplaying = this.getNowplaying();

    if(!nowplaying) return "Nowplaying: (none, streaming is stopped)";
    else return `Nowplaying: ${nowplaying}`;
  }

  async cmd_get_upcoming() {
    const upcoming = this.getUpcoming(10);

    return upcoming.map((entry, idx) => {
      return `${idx + 1}. ${entry}`;
    });
  }

  async cmd_add_local_file(message, filePath) {
    if(!filePath) return `Usage: ${this.options.commandPrefix}add-local-file <file path>`;

    try {
      let id = await this.addLocalFile(filePath, "Discord:" + message.author.username);
      return `Added to the playlist (ID: ${id})`;
    } catch(e) {
      if(e.detail) return `Failed: ${e.message} (${e.detail})`;
      else return `Failed: ${e.message}`;
    }
  }
}

module.exports = DiscordManager;
