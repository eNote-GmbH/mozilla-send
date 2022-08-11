const createReadStream = require('fs').createReadStream;

const crypto = require('crypto');
const storage = require('../storage');
const config = require('../config');
const mozlog = require('../log');

const log = mozlog('send.upload');

module.exports = async function(req, res) {
  const newId = crypto.randomBytes(8).toString('hex');
  const metadata = req.header('X-File-Metadata');
  const auth = req.header('Authorization');
  const contentType = req.header('Content-Type');
  if (!metadata || !auth) {
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

  console.log('newId', newId, 'owner', owner, 'meta', meta);

  try {
    //const limiter = new Limiter(encryptedSize(config.max_file_size));
    const fileName = '.'.concat(config.resumable_file_dir, '/', req.params.id);
    console.log('fileName to put to storage', fileName);
    const fileStream = createReadStream(fileName);

    //this hasn't been updated to expiration time setting yet
    //if you want to fallback to this code add this
    await storage.set(newId, fileStream, meta, config.default_expire_seconds);
    const url = `${config.deriveBaseUrl(req)}/download/${newId}/`;

    console.log('url', url);

    res.set('WWW-Authenticate', `send-v1 ${meta.nonce}`);

    console.log('setting json');

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
