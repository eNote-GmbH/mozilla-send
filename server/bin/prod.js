const express = require('express');
const path = require('path');
const Sentry = require('@sentry/node');
const config = require('../config');
const routes = require('../routes');
const pages = require('../routes/pages');
const expressWs = require('@dannycoates/express-ws');
const mozlog = require('../log');
const log = mozlog('send.server');

log.debug('config', config);

if (config.sentry_dsn) {
  Sentry.init({ dsn: config.sentry_dsn });
}

const app = express();

if (config.access_log.enabled) {
  const accessLog = require('../middleware/access_log');
  app.use(accessLog);
}

expressWs(app, null, { perMessageDeflate: false });
routes(app);
app.ws('/api/ws', require('../routes/ws'));

app.use(
  express.static(path.resolve(__dirname, '../../dist/'), {
    setHeaders: function (res, path) {
      if (!/serviceWorker\.js$/.test(path)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      res.removeHeader('Pragma');
    },
  })
);

app.use(pages.notfound);

const server = app.listen(config.listen_port, config.listen_address);

for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR2']) {
  process.on(signal, async () => {
    log.info('shutdown', { msg: 'Server shutdown initiated' });
    server.close(async () => {
      await app.shutdown();
      log.info('shutdown', { msg: 'Server stopped' });
    });
  });
}
