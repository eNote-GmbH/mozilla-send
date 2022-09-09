const crypto = require('crypto');
const storage = require('./storage');
const config = require('./config');
const mozlog = require('./log');

const log = mozlog('send.upload');

module.exports = async function (req, res, streamPreparator) {
  const metadata = req.header('X-File-Metadata');
  const auth = req.header('Authorization');
  if (!metadata || !auth) {
    return res.sendStatus(400);
  }

  const contentType = req.header('Content-Type');
  const newId = crypto.randomBytes(8).toString('hex');
  const owner = crypto.randomBytes(10).toString('hex');
  const meta = {
    owner,
    metadata,
    auth: auth.split(' ')[1],
    nonce: crypto.randomBytes(16).toString('base64'),
  };

  if (req.user) {
    meta.user = req.user;
  }
  if (req.fxa_user) {
    meta.fxa = req.fxa_user;
  }
  if (contentType) {
    meta.contentType = contentType;
  }

  try {
    const fileStream = streamPreparator(req, res, config);
    //this hasn't been updated to expiration time setting yet
    //if you want to fallback to this code add this
    await storage.set(newId, fileStream, meta, config.default_expire_seconds);
    const url = `${config.deriveBaseUrl(req)}/api/download/${newId}`;
    res.set('WWW-Authenticate', `send-v1 ${meta.nonce}`);
    res.json({
      url,
      owner: meta.owner,
      id: newId,
    });
  } catch (e) {
    if (e.message === 'limit') {
      return res.sendStatus(413);
    }
    if (e.code === 'ENOENT') {
      // file does not exist (see /api/upload/.../done)
      return res.sendStatus(404);
    }
    log.error('error', e);
    res.sendStatus(500);
  }
};
