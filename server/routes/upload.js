const Limiter = require('../limiter');
const { encryptedSize } = require('../../app/utils');

const uploader = require('../utils');

const reqStreamUpload = function(req, res, config) {
  const limiter = new Limiter(encryptedSize(config.max_file_size));
  return req.pipe(limiter);
};

module.exports = async function(req, res) {
  await uploader(req, res, reqStreamUpload);
};
