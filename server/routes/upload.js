const crypto = require('crypto');
const storage = require('../storage');
const config = require('../config');
const mozlog = require('../log');
const Limiter = require('../limiter');
const { encryptedSize } = require('../../app/utils');

const log = mozlog('send.upload');

module.exports = async function(req, res) {
  console.log('upload');
  const newId = crypto.randomBytes(8).toString('hex');
  const metadata = req.header('X-File-Metadata');
  const auth = req.header('Authorization');
  const contentType = req.header('Content-Type');
  if (!metadata || !auth) {
    console.log('upload 400');
    return res.sendStatus(400);
  }
  const owner = crypto.randomBytes(10).toString('hex');
  const meta = {
    owner,
    metadata,
    auth: auth.split(' ')[1],
    user: req.user,
    nonce: crypto.randomBytes(16).toString('base64'),
    contentType
  };

  try {
    const limiter = new Limiter(encryptedSize(config.max_file_size));
    const fileStream = req.pipe(limiter);
    //this hasn't been updated to expiration time setting yet
    //if you want to fallback to this code add this
    await storage.set(newId, fileStream, meta, config.default_expire_seconds);
    const url = `${config.deriveBaseUrl(req)}/download/${newId}/`;
    res.set('WWW-Authenticate', `send-v1 ${meta.nonce}`);
    res.json({
      url,
      owner: meta.owner,
      id: newId
    });
  } catch (e) {
    if (e.message === 'limit') {
      console.log('upload 413');
      return res.sendStatus(413);
    }
    log.error('upload 500', e);
    res.sendStatus(500);
  }
};
