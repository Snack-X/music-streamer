const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const url = require("url");
const MSError = require("../core/Error");

function download(remote, destination, maxSize = Infinity) {
  return new Promise((resolve, reject) => {
    const urlInfo = url.parse(remote);

    let interface;
    if(urlInfo.protocol === "https:") interface = https;
    else if(urlInfo.protocol === "http:") interface = http;
    else { reject(new MSError("Remote URL is not an http or https")); }

    const request = interface.get(urlInfo);
    let rejectReason;
    let reasonTooBig = new MSError(`Remote file size is over ${maxSize} bytes`);

    request.on("response", response => {
      const contentLength = parseInt(response.headers["content-length"]);
      if(contentLength && maxSize < contentLength) {
        rejectReason = reasonTooBig;
        return request.abort();
      }

      const chunks = [];
      let contentSize = 0;

      response.on("data", chunk => {
        contentSize += chunk.length;
        if(maxSize < contentSize) {
          rejectReason = reasonTooBig;
          return request.abort();
        }

        chunks.push(chunk);
      });

      response.on("end", () => {
        if(request.aborted) {
          console.log(request.aborted);
          // reject(rejectReason || new MSError("Request was aborted by unknown reason"));
        }
        else {
          const writeStream = fs.createWriteStream(destination);
          for(let chunk of chunks) writeStream.write(chunk);
          writeStream.end();

          resolve();
        }
      });
    });

    request.on("error", reject);
  });
}

module.exports = download;
