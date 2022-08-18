const onFinished = require('on-finished');
const mozlog = require('../log');

const log = mozlog('send.accesslog');

module.exports = function (req, res, next) {
  req.trace_start = process.hrtime.bigint();
  onFinished(res, function (err, response) {
    const trace_end = process.hrtime.bigint();
    const req_sec = Math.round(Number(trace_end - req.trace_start) / 1e3) / 1e6;
    const request = response.req;
    log.info('summary', {
      method: request.method,
      url: request.url,
      processing_time: req_sec,
      status: response.statusCode,
      error: err || undefined,
      ...request.metrics,
    });
  });
  next();
};
