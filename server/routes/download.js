const storage = require('../storage');
const mozlog = require('../log');
const log = mozlog('send.download');

module.exports = async function(req, res) {
  const id = req.params.id;
  try {
    const metadata = await storage.metadata(id).metadata;
    const contentType =
      metadata && metadata.contentType
        ? metadata.contentType
        : 'application/octet-stream';

    const { length, stream } = await storage.get(id);
    res.sendSeekable(stream, {
      type: contentType,
      length: length
    });
  } catch (e) {
    log.warn(e);
    res.sendStatus(404);
  }
};
