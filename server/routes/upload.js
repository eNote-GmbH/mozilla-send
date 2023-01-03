const Limiter = require('../limiter');
const tus = require('tus-node-server');
const { encryptedSize } = require('../../app/utils');
const config = require('../config');
const mozlog = require('../log');
const uploader = require('../utils');

const HEADER_NAME = 'Tus-Resumable';
const HEADER_VALUE = '1.0.0';

const REQUEST_HEADERS_DROP = [
  'Tus-Extension',
  'Tus-Max-Size',
  'Tus-Version',
  'Upload-Concat',
  'Upload-Defer-Length',
  'X-Http-Method-Override',
  'X-Requested-With',
];

const RESPONSE_HEADERS_DROP = [HEADER_NAME, 'Access-Control-Expose-Headers'];

// do not expose Tus-specific headers
const HEADERS_EXPOSE = [
  'Authorization',
  'Content-Type',
  'Location',
  'Upload-Length',
  'Upload-Metadata',
  'Upload-Offset',
].join(', ');

const log = mozlog('send.upload');

const tusServer = new tus.Server();
tusServer.datastore = new tus.FileStore({
  path: '/api/upload',
  directory: config.resumable_file_dir,
});

const reqStreamUpload = function (req, res, config) {
  const limiter = new Limiter(encryptedSize(config.max_file_size));
  return req.pipe(limiter);
};

const isResumableRequest = function (req) {
  if (req.params.resumeId) {
    return true;
  }

  if (req.method === 'POST' && req.header('Upload-Length')) {
    return !req.header('Content-Length') || String(req.header('Content-Length')) === '0';
  }

  return false;
};

module.exports = async function (req, res) {
  if (isResumableRequest(req)) {
    log.debug('api', { resumable: true });

    // remove potentially harmful request headers...
    REQUEST_HEADERS_DROP.forEach((header) => {
      delete req.headers[header.toLowerCase()];
    });

    // always set the mandatory request header...
    req.headers[HEADER_NAME.toLowerCase()] = HEADER_VALUE;

    // override writeHead to manipulate response headers...
    res.orig_writeHead = res.writeHead;
    res.writeHead = function (statusCode, headers) {
      RESPONSE_HEADERS_DROP.forEach((header) => {
        delete headers[header];
        res.removeHeader(header);
      });
      headers['Access-Control-Expose-Headers'] = HEADERS_EXPOSE;

      const location = headers['Location'];
      if (statusCode === 201 && location && location.startsWith('//')) {
        // "//localhost..." => "http://localhost..."
        headers['Location'] = `${req.protocol}:${location}`;
      }

      return res.orig_writeHead(statusCode, headers);
    };

    tusServer.handle(req, res);
  } else {
    log.debug('api', { resumable: false });
    await uploader(req, res, reqStreamUpload);
  }
};
