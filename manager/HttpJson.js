const koa = require("koa");
const koaRouter = require("koa-router");
const koaBody = require("koa-body");

class HttpJsonManager {
  constructor(options = {}) {
    this.options = Object.assign({
      proxy: false,
      port: 8080,
      host: "127.0.0.1",
    }, options);

    this.streamer = null;

    this.app = new koa();
    this.app.proxy = this.options.proxy;

    this.app.use(koaBody());
    this.app.use(async (ctx, next) => {
      console.log(ctx.method, ctx.url);
      await next();
    });
    this.app.use((ctx, next) => this.mwResponseHandler(ctx, next));
    this.app.use((ctx, next) => this.mwCheckStreamer(ctx, next));

    const router = koaRouter();

    router.get("/status", ctx => this.getStatus(ctx));
    router.get("/playlist", ctx => this.getPlaylist(ctx));
    router.post("/playlist/addLocalFile", ctx => this.postPlaylistAddLocalFile(ctx));

    this.app.use(router.routes());
    this.app.use(router.allowedMethods());

    this.app.listen(this.options.port, this.options.host);
  }

  attach(musicStreamer) { this.streamer = musicStreamer; }

  //======================================================================================

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

  async mwCheckStreamer(ctx, next) {
    // if(this.streamer === null) ctx.throw(502, "Cannot connect to the MusicStreamer");
    await next();
  }

  //======================================================================================

  async getStatus(ctx) {
    let body = { status: "playing" };

    if(this.streamer.playing === false) {
      body.status = "idle";
    }
    else {
      if(this.streamer.paused === true) body.status = "paused";
      body.nowplaying = this.streamer.getNowplaying();
    }

    ctx.body = body;
    return;
  }

  async getPlaylist(ctx) {
    const size = Math.max(parseInt(ctx.query.size), 1);

    ctx.body = this.streamer.getUpcoming(size);
  }

  async postPlaylistAddLocalFile(ctx) {
    let filePath = ctx.request.body.filePath;
    if(!filePath) ctx.throw(400, "'filePath' is missing");

    try {
      let queueId = await this.streamer.addLocalFile(filePath, "HttpJson");
      ctx.body = { id: queueId };
    } catch(e) {
      if(e.detail) ctx.throw(400, `${e.message} (${e.detail})`);
      else ctx.throw(400, `${e.message}`);
    }
  }
}

module.exports = HttpJsonManager;
