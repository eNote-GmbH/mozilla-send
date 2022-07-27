const storage = require('../storage');
const mozlog = require('../log');
const log = mozlog('send.download');

module.exports = async function(req, res) {
  console.log('download');
  const id = req.params.id;

  console.log('id', id);

  try {
    const metadata = await storage.metadata(id).metadata;
    const contentType =
      metadata && metadata.contentType
        ? metadata.contentType
        : 'application/octet-stream';

    const { length, stream } = await storage.get(id);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': length
    });
    stream.pipe(res);
    console.log('download complete');
  } catch (e) {
    log.warn(e);
    console.log('download 404');
    res.sendStatus(404);
  }
};
