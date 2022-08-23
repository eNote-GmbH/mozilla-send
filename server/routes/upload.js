const Limiter = require('../limiter');
const { encryptedSize } = require('../../app/utils');
const config = require('../config');
const tus = require('tus-node-server');
const uploader = require('../utils');

const tusServer = new tus.Server();
tusServer.datastore = new tus.FileStore({
  path: config.resumable_file_dir
});

const reqStreamUpload = function(req, res, config) {
  const limiter = new Limiter(encryptedSize(config.max_file_size));
  return req.pipe(limiter);
};

module.exports = async function(req, res) {
  if (req.header('Tus-Resumable')) {
    tusServer.handle(req, res);
  } else {
    await uploader(req, res, reqStreamUpload);
  }
};
