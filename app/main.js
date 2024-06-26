/* global DEFAULTS LIMITS WEB_UI PREFS */
import 'core-js';
import 'intl-pluralrules';
import choo from 'choo';
import nanotiming from 'nanotiming';
import routes from './routes';
import getCapabilities from './capabilities';
import controller from './controller';
import dragManager from './dragManager';
import pasteManager from './pasteManager';
import storage from './storage';
import experiments from './experiments';
import * as Sentry from '@sentry/browser';
import './main.css';
import User from './user';
import { getTranslator } from './locale';
import Archive from './archive';
import { setTranslate, locale } from './utils';

if (navigator.doNotTrack !== '1' && window.SENTRY_CONFIG) {
  Sentry.init(window.SENTRY_CONFIG);
}

if (process.env.NODE_ENV === 'production') {
  nanotiming.disabled = true;
}

(async function start() {
  const capabilities = await getCapabilities();
  if (
    !capabilities.crypto &&
    window.location.pathname !== '/unsupported/crypto'
  ) {
    return window.location.assign('/unsupported/crypto');
  }
  if (capabilities.serviceWorker) {
    try {
      await navigator.serviceWorker.register('/serviceWorker.js');
      await navigator.serviceWorker.ready;
    } catch (e) {
      // continue but disable streaming downloads
      capabilities.streamDownload = false;
    }
  }

  const translate = await getTranslator(locale());
  setTranslate(translate);
  // eslint-disable-next-line require-atomic-updates
  window.initialState = {
    LIMITS,
    DEFAULTS,
    WEB_UI,
    PREFS,
    archive: new Archive([], DEFAULTS.EXPIRE_SECONDS, DEFAULTS.DOWNLOADS),
    capabilities,
    translate,
    storage,
    sentry: Sentry,
    user: new User(storage, LIMITS, window.AUTH_CONFIG),
    transfer: null,
    fileInfo: null,
    locale: locale()
  };

  const app = routes(choo({ hash: true }));
  // eslint-disable-next-line require-atomic-updates
  window.app = app;
  app.use(experiments);
  app.use(controller);
  app.use(dragManager);
  app.use(pasteManager);
  app.mount('body');
})();
