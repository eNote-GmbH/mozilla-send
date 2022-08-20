const Limiter = require('../limiter');
const { encryptedSize } = require('../../app/utils');
const createReadStream = require('fs').createReadStream;
const uploader = require('../utils');

const fileStreamUpload = function(req, res, config) {
  const limiter = new Limiter(encryptedSize(config.max_file_size));
  const fileName = '.'.concat(config.resumable_file_dir, '/', req.params.id);
  const sourceFileStream = createReadStream(fileName);
  return sourceFileStream.pipe(limiter);
};

module.exports = async function(req, res) {
  await uploader(req, res, fileStreamUpload);
};
