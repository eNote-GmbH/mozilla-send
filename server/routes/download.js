const storage = require('../storage');
const mozlog = require('../log');
const log = mozlog('send.download');

module.exports = async function (req, res) {
  const id = req.params.id;
  let meta = req.meta;
  try {
    if (!meta) {
      const metadata = await storage.metadata(id);
      if (metadata) {
        meta = metadata.metadata;
      }
    }

    if (!meta) {
      // either not available at all or expired already...
      return res.sendStatus(404);
    }

    const contentType = meta.contentType || 'application/octet-stream';

    const length = await storage.length(id);
    if (!length) {
      log.warn('length', {
        msg: 'Stale metadata (file does not exist)',
        id,
      });
      return res.sendStatus(404);
    }

    const ranges = req.range(length);
    if (ranges === -2) {
      return res.sendStatus(400);
    }
    if (ranges === -1) {
      return res.sendStatus(416);
    }

    let range = null;
    if (ranges && ranges.type === 'bytes') {
      // we only support a single range for now
      range = ranges[0];
    }

    const { stream, range: contentRange } = await storage.get(id, range);

    let contentLength = length;
    if (range) {
      const start = range.start || 0;
      const end = range.end || length - 1;
      contentLength = end - start + 1;
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Accept-Ranges': 'bytes',
    };

    if (contentRange) {
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${contentRange.start}-${contentRange.end}/${length}`,
      });
    } else {
      res.writeHead(200, headers);
    }

    stream.pipe(res);
  } catch (e) {
    log.warn(e);
    res.sendStatus(404);
  }
};
