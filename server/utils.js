const crypto = require('crypto');
const storage = require('./storage');
const config = require('./config');
const mozlog = require('./log');

const log = mozlog('send.upload');

module.exports = async function(req, res, streamPreparator) {
  const metadata = req.header('X-File-Metadata');
  const auth = req.header('Authorization');
  if (!metadata || !auth || !req.user) {
    return res.sendStatus(400);
  }

  const contentType = req.header('Content-Type');
  const newId = crypto.randomBytes(8).toString('hex');
  const owner = crypto.randomBytes(10).toString('hex');
  const meta = {
    owner,
    metadata,
    auth: auth.split(' ')[1],
    user: req.user.client_id,
    nonce: crypto.randomBytes(16).toString('base64'),
    contentType
  };

  try {
    const fileStream = streamPreparator(req, res, config);
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
      return res.sendStatus(413);
    }
    log.error('upload', e);
    res.sendStatus(500);
  }
};
