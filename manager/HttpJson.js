const koa = require("koa");
const koaRouter = require("koa-router");
const koaBody = require("koa-body");
const Manager = require("./Manager");

class HttpJsonManager extends Manager {
  constructor(options = {}) {
    this.options = Object.assign({
      proxy: false,
      port: 8080,
      host: "127.0.0.1",
    }, options);
  }

  attach(musicStreamer) {
    super.attach(musicStreamer);

    this._startInterface();
  }

  _startInterface() {
    this.app = new koa();
    this.app.proxy = this.options.proxy;

    this.app.use(koaBody());
    this.app.use(async (ctx, next) => {
      console.log(ctx.method, ctx.url);
      await next();
    });
    this.app.use(async (ctx, next) => this.mwResponseHandler(ctx, next));

    const router = koaRouter();

    router.get("/info",   ctx => this.getInfo(ctx));
    router.get("/status", ctx => this.getStatus(ctx));
    router.get("/quit",   ctx => this.getQuit(ctx));

    router.get("/start",  ctx => this.getStart(ctx));
    router.get("/stop",   ctx => this.getStop(ctx));
    router.get("/pause",  ctx => this.getPause(ctx));
    router.get("/resume", ctx => this.getResume(ctx));
    router.get("/skipNext", ctx => this.getSkipNext(ctx));

    router.get("/nowplaying", ctx => this.getNowplaying(ctx));
    router.get("/upcoming",   ctx => this.getUpcoming(ctx));
    router.post("/add/localFile", ctx => this.postAddLocalFile(ctx));
    router.post("/add/remoteFile", ctx => this.postAddRemoteFile(ctx));

    this.app.use(router.routes());
    this.app.use(router.allowedMethods());

    this.app.listen(this.options.port, this.options.host);
  }

  async mwResponseHandler(ctx, next) {
    try {
      await next();
      if(ctx.status !== 200) ctx.throw(ctx.status, ctx.response.message);
      if(ctx.response.is("json")) ctx.body = { result: true, data: ctx.body };
    } catch(e) {
      ctx.status = e.status;
      ctx.body = { result: false, code: e.status, message: e.message };
    }
  }

  //======================================================================================
  // Stream

  async getInfo(ctx) {
    const info = this.info();
    const body = {
      version: info.version,
      output: info.output,
      playlistRepeat: info.playlistRepeat,
    };

    ctx.body = body;
  }

  async getStatus(ctx) {
    let body = { status: "playing" };

    if(this.streamer.playing === false) {
      body.status = "idle";
    }
    else {
      if(this.streamer.paused === true) body.status = "paused";
      body.nowplaying = this.getNowplaying();
    }

    ctx.body = body;
  }

  async getQuit(ctx) {
    ctx.body = {};
    this.quit();
  }

  //======================================================================================
  // Playback

  async getStart() {
    this.start();
    ctx.body = {};
  }

  async getStop(ctx) {
    this.stop();
    ctx.body = {};
  }

  async getPause(ctx) {
    this.pause();
    ctx.body = {};
  }

  async getResume(ctx) {
    this.resume();
    ctx.body = {};
  }

  async getSkipNext() {
    const result = this.skipNext();

    if(result) ctx.body = { next: true };
    else ctx.throw(503, "End of playlist, stopped");
  }

  //======================================================================================
  // Playlist

  async getNowplaying() {
    const nowplaying = this.getNowplaying();

    if(!nowplaying) ctx.throw(503, "Streaming is stopped");
    else ctx.body = nowplaying;
  }

  async getUpcoming(ctx) {
    const size = Math.max(parseInt(ctx.query.size) || 1, 1);
    ctx.body = this.streamer.getUpcoming(size);
  }

  async postAddLocalFile(ctx) {
    let filePath = ctx.request.body.filePath;
    if(!filePath) ctx.throw(400, "'filePath' is missing from POST body");

    try {
      let queueId = await this.streamer.addLocalFile(filePath, "HttpJson:" + ctx.ip);
      ctx.body = { id: queueId };
    } catch(e) {
      if(e.detail) ctx.throw(400, `${e.message}`);
      else ctx.throw(400, `${e.message}`);
    }
  }

  async postAddRemoteFile(ctx) {
    let remoteURL = ctx.request.body.remoteURL;
    if(!remoteURL) ctx.throw(400, "'remoteURL' is missing from POST body");

    try {
      let queueId = await this.streamer.addRemoteFile(remoteURL, "HttpJson:" + ctx.ip);
      ctx.body = { id: queueId };
    } catch(e) {
      if(e.detail) ctx.throw(400, `${e.message}`);
      else ctx.throw(400, `${e.message}`);
    }
  }
}

module.exports = HttpJsonManager;
