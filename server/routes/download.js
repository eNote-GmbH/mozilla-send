const storage = require('../storage');
const mozlog = require('../log');
const log = mozlog('send.download');

module.exports = async function(req, res) {
  console.log('download');
  const id = req.params.id;

  console.log('id', id);

  try {
    const metadata = await storage.metadata(id).metadata;
    console.log('metadata', metadata);
    const contentType =
      metadata && metadata.contentType
        ? metadata.contentType
        : 'application/octet-stream';
    console.log('contentType', contentType);

    const { length, stream } = await storage.get(id);
    console.log('length', length);
    console.log('stream', stream);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': length
    });
    stream.pipe(res);
    console.log('download complete');
  } catch (e) {
    log.warn('exception', e);
    console.log('download 404');
    res.sendStatus(404);
  }
};
