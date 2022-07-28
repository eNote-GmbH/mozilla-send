const config = require('./config');

const KEY_SCOPE = config.fxa_key_scope;
let fxaConfig = null;
let lastConfigRefresh = 0;

const correct_token = 'correct_token.correct_token.correct_token';

async function getFxaConfig() {
  if (fxaConfig && Date.now() - lastConfigRefresh < 1000 * 60 * 5) {
    return fxaConfig;
  }
  try {
    fxaConfig = {
      authorization_endpoint: 'https://accounts_enote/authorization',
      introspection_endpoint: 'https://api-accounts_enote/v1/introspect',
      issuer: 'https://accounts_enote',
      jwks_uri: 'https://api-accounts_enote/v1/jwks',
      revocation_endpoint: 'https://api-accounts_enote/v1/destroy',
      token_endpoint: 'https://api-accounts_enote/v1/token',
      userinfo_endpoint: 'https://profiles_enote/v1/profile',
      claims_supported: ['aud', 'exp', 'iat', 'iss', 'sub'],
      id_token_signing_alg_values_supported: ['RS256'],
      response_types_supported: ['code', 'token'],
      scopes_supported: ['openid', 'profile', 'email'],
      subject_types_supported: ['public'],
      token_endpoint_auth_methods_supported: ['client_secret_post']
    };
    fxaConfig.key_scope = KEY_SCOPE;
    lastConfigRefresh = Date.now();
  } catch (e) {
    // continue with previous fxaConfig
  }
  return fxaConfig;
}

module.exports = {
  token: correct_token,
  getFxaConfig,
  verify: async function(token) {
    if (!token) {
      return null;
    }

    if (token == correct_token) {
      return {
        iss: 'https://api-accounts_enote',
        aud: 'https://sync_dev_enote',
        client_id: '67372424e5b9bdd7',
        exp: 1858483311,
        iat: 1658479711,
        jti: '5aad1d419e814ba16a3c210d7ea33eb72071082a7cc8f1140d6eb620aabf920f',
        scope:
          'profile:write email https://identity.mozilla.com/apps/oldsync escore search metadata quota sources subscriptions',
        sub: '7aaa754b64d7425eb26fc71594bfb98e',
        'fxa-profileChangedAt': 1650695379020
      };
    }

    return null;
  }
};
