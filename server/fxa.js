const fetch = require('node-fetch');
const config = require('./config');

const KEY_SCOPE = config.fxa_key_scope;
const CONFIG_REFRESH_INTERVAL = 1000 * 60 * 5;
let fxaConfig = null;
let lastConfigRefresh = 0;

const fxa_mock = require('./fxa-mock');
const use_fxa_mock = config.env === 'development' && config.fxa_url === 'mock';

async function getFxaConfig() {
  const nextConfigRefresh = lastConfigRefresh + CONFIG_REFRESH_INTERVAL;
  const now = Date.now();
  if (fxaConfig && nextConfigRefresh > now) {
    return fxaConfig;
  }
  lastConfigRefresh = now;
  try {
    const res = await fetch(
      `${config.fxa_url}/.well-known/openid-configuration`,
      { timeout: 3000 }
    );
    const newConfig = await res.json();
    newConfig.key_scope = KEY_SCOPE;

    // eslint-disable-next-line require-atomic-updates
    fxaConfig = newConfig;
  } catch (e) {
    // continue with previous fxaConfig
  }
  return fxaConfig;
}

module.exports = use_fxa_mock
  ? fxa_mock
  : {
      getFxaConfig,
      verify: async function (token) {
        if (!token) {
          return null;
        }

        const c = await getFxaConfig();
        try {
          const verifyUrl = c.jwks_uri.replace('jwks', 'verify'); //HACK
          const result = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const info = await result.json();
          if (
            info.scope &&
            Array.isArray(info.scope) &&
            info.scope.includes(KEY_SCOPE)
          ) {
            return info.user;
          }
        } catch (e) {
          // gulp
        }
        return null;
      },
    };
