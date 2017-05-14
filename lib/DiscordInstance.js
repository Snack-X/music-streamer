const EventEmitter = require("events");

const Discord = require("discord.js");

// Singleton clients
const clients = {};

class DiscordInstance {
  static async get(options) {
    if(!options.token)
      throw "Missing `token` from options";

    let token = options.token;
    let existingClient = clients[token];

    if(existingClient) return existingClient;
    else {
      clients[token] = new Discord.Client(options.clientOptions);
      await clients[token].login(options.token);
      return clients[token];
    }
  }
}

module.exports = DiscordInstance;
