const config = require("./config.json");

//========================================================================================
// Configure output

// const SpeakerOutput = require("../output/Speaker");
// const output = new SpeakerOutput();

// const DiscordOutput = require("../output/Discord");
// const output = new DiscordOutput({
//   token: config.discord.token,
//   guild: config.discord.guild,
//   channel: config.discord.voiceChannel,
// });


//========================================================================================
// Configure streamer

// const MusicStreamer = require("../core/MusicStreamer");
// const streamer = new MusicStreamer({
//   playlist: { repeat: false },
//   output: output,
// });


//========================================================================================
// Configure management interface


// const CliManager = require("../manager/Cli");
// const manager = new CliManager();
// manager.attach(streamer);

// const HttpJsonManager = require("../manager/HttpJson");
// const manager = new HttpJsonManager();
// manager.attach(streamer);

// const DiscordManager = require("../manager/Discord");
// const mnager = new DiscordManager({
//   token: config.discord.token,
//   guild: config.discord.guild,
// });
// manager.attach(streamer);
