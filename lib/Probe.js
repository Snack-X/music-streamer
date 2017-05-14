const exec = require("mz/child_process").exec;

module.exports = async (filename) => {
  const output = await exec(`ffprobe -v quiet -of json -show_format -show_streams ${filename}`);
  const result = JSON.parse(output[0]);
  return result;
};
