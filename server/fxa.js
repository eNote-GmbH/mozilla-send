const fetch = require('node-fetch');
const config = require('./config');

const KEY_SCOPE = config.fxa_key_scope;
let fxaConfig = null;
let lastConfigRefresh = 0;

const fxa_mock = require('./fxa-mock');
const use_fxa_mock = config.env === 'development' && config.fxa_url === 'mock';

if (use_fxa_mock) {
  console.log('Use fxa mock', use_fxa_mock);
}

async function getFxaConfig() {
  if (fxaConfig && Date.now() - lastConfigRefresh < 1000 * 60 * 5) {
    return fxaConfig;
  }
  try {
    const res = await fetch(
      `${config.fxa_url}/.well-known/openid-configuration`,
      { timeout: 3000 }
    );
    fxaConfig = await res.json();
    fxaConfig.key_scope = KEY_SCOPE;
    lastConfigRefresh = Date.now();
  } catch (e) {
    // continue with previous fxaConfig
  }
  return fxaConfig;
}

module.exports = use_fxa_mock
  ? fxa_mock
  : {
      getFxaConfig,
      type: 'real',
      verify: async function(token) {
        if (!token) {
          return null;
        }

        const c = await getFxaConfig();
        try {
          const verifyUrl = c.jwks_uri.replace('jwks', 'verify'); //HACK
          const result = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
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
      }
    };
