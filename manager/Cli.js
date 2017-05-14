const readline = require("mz/readline");
const Manager = require("./Manager");

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

  "add-local-file": "Add local music file to the playlist",
};
const Commands = Object.keys(CommandHelps);

class CliManager extends Manager {
  constructor() {
    super();
  }

  attach(musicStreamer) {
    super.attach(musicStreamer);

    this._startInterface();
  }

  _startInterface() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: line => {
        const hits = Commands.filter(c => c.startsWith(line));
        return [ hits.length ? hits : Commands, line ];
      },
      historySize: 0,
    });

    this._prompt().then(() => {});
  }

  async _prompt() {
    while(true) {
      let answer = await this.rl.question("\nCMD > ");
      answer = answer.trim();

      if(Commands.includes(answer)) {
        let method = "cmd_" + answer.replace(/-/g, "_");
        method = this[method];
        await method.call(this);
      }
      else {
        this.rl.write("Unknown command. Type 'help' for help.\n");
      }
    }
  }

  //======================================================================================

  async cmd_help() {
    const message = [];
    const padLength = Math.max(...Commands.map(c => c.length));

    for(const cmd of Commands)
      message.push(`${cmd}${" ".repeat(padLength - cmd.length)} => ${CommandHelps[cmd]}`);

    this.rl.write(message.join("\n"));
    this.rl.write("\n");
  }

  //======================================================================================
  // Stream

  async cmd_info() {
    const info = this.info();

    this.rl.write(`INFO: Music Streamer ${info.version}\n`);
    this.rl.write(`INFO: Connected output is '${info.output}'\n`);

    const repetition = info.playlistRepeat ? "on" : "off";
    this.rl.write(`INFO: Playlist repetition is turned ${repetition}\n`);
  }

  async cmd_status() {
    const status = this.status();
    this.rl.write(`STATUS: ${status}\n`);

    if(status !== "idle")
      this.rl.write(`NOWPLAYING: ${this.getNowplaying()}\n`);
  }

  async cmd_start() {
    this.start();
    this.rl.write(`Streaming started.\n`);
  }

  async cmd_stop() {
    this.stop();
    this.rl.write(`Streaming stopped.\n`);
  }

  async cmd_pause() {
    this.pause();
    this.rl.write(`Streaming paused.\n`);
  }

  async cmd_resume() {
    this.resume();
    this.rl.write(`Streaming resumed.\n`);
  }

  async cmd_quit() {
    this.rl.write(`Stopping streamer...\n`);
    this.quit();
  }

  //======================================================================================
  // Playback

  async cmd_skip_next() {
    const result = this.skipNext();

    if(result) this.rl.write(`Playing next song.\n`);
    else this.rl.write(`End of playlist, stopped.\n`);
  }

  //======================================================================================
  // Playlist

  async cmd_get_nowplaying() {
    const nowplaying = this.getNowplaying();

    if(!nowplaying)
      this.rl.write("NOWPLAYING: (none, streaming is stopped)\n");
    else
      this.rl.write(`NOWPLAYING: ${nowplaying}\n`);
  }

  async cmd_get_upcoming() {
    const upcoming = this.getUpcoming(10);

    upcoming.forEach((entry, idx) => {
      this.rl.write(`${idx + 1}. ${entry}\n`);
    });
  }

  async cmd_add_local_file() {
    this.rl.write("Adding local file. Type file's path, or drag it into the shell\n");
    const filePath = await this.rl.question("Filename? > ");

    try {
      let id = await this.addLocalFile(filePath, "CLI");
      this.rl.write(`SUCCESS: Added to the playlist (ID: ${id})\n`);
    } catch(e) {
      if(e.detail) this.rl.write(`FAILED: ${e.message} (${e.detail})\n`);
      else this.rl.write(`FAILED: ${e.message}\n`);
    }
  }
}

module.exports = CliManager;
