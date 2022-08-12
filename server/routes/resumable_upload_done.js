const createReadStream = require('fs').createReadStream;

const Limiter = require('../limiter');
const { encryptedSize } = require('../../app/utils');

const fileStreamUpload = function(req, res, config) {
  const limiter = new Limiter(encryptedSize(config.max_file_size));
  const fileName = '.'.concat(config.resumable_file_dir, '/', req.params.id);
  const sourceFileStream = createReadStream(fileName);
  return sourceFileStream.pipe(limiter);
};

const uploader = require('../utils');

module.exports = async function(req, res) {
  await uploader(req, res, fileStreamUpload);
};
