const { createReadStream, rmSync } = require('fs');
const path = require('path');
const uploader = require('../utils');

const UPLOAD_BUFFER = 256 * 2 ** 10;

const fileStreamUpload = function (req, res, config) {
  const id = req.params.resumeId;
  if (!id) {
    return null;
  }

  const filePath = path.join(config.resumable_file_dir, id);
  try {
    const stream = createReadStream(filePath, { highWaterMark: UPLOAD_BUFFER });
    stream.on('close', () => {
      rmSync(filePath, { force: true });
    });
    return stream;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
};

module.exports = async function (req, res) {
  await uploader(req, res, fileStreamUpload);
};
