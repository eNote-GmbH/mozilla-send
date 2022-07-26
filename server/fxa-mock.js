const config = require('./config');

const KEY_SCOPE = config.fxa_key_scope;
let fxaConfig = null;
let lastConfigRefresh = 0;

const token =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjEwMTI4LTE1NzkwYWVmIiwidHlwIjoiYXQrSldUIn0.eyJhdWQiOiJodHRwczovL3N5bmMuZGV2LmVub3RlLmNvbSIsImNsaWVudF9pZCI6IjY3MzcyNDI0ZTViOWJkZDciLCJleHAiOjE2NTg0ODMzMTEsImZ4YS1wcm9maWxlQ2hhbmdlZEF0IjoxNjUwNjk1Mzc5MDIwLCJpYXQiOjE2NTg0Nzk3MTEsImlzcyI6Imh0dHBzOi8vYXBpLWFjY291bnRzLmRldi5lbm90ZS5jb20iLCJqdGkiOiI1YWFkMWQ0MTllODE0YmExNmEzYzIxMGQ3ZWEzM2ViNzIwNzEwODJhN2NjOGYxMTQwZDZlYjYyMGFhYmY5MjBmIiwic2NvcGUiOiJwcm9maWxlOndyaXRlIGVtYWlsIGh0dHBzOi8vaWRlbnRpdHkubW96aWxsYS5jb20vYXBwcy9vbGRzeW5jIGVzY29yZSBzZWFyY2ggbWV0YWRhdGEgcXVvdGEgc291cmNlcyBzdWJzY3JpcHRpb25zIiwic3ViIjoiN2FhYTc1NGI2NGQ3NDI1ZWIyNmZjNzE1OTRiZmI5OGUifQ.CpeUNlK79fwgfFU7ZXEWlIrXeyf6Hk0DbrivmQxInKPZpNk89gK-SZQVR9AlfHb7ingnpC6IOOsm9u2XlE2pFPlpveFOLsp4Yu0AvYbVJdWCxrRSShFfUvJI1NKzv1ptkhH8N37t-Xq9VcFKObRS95wDD0ISy1Y_UZOtbNCx-kyvrrlVFgjw-Cpnfu38LKp7LTZpa27jtwPBbeQUVapXWRrPW3_KML84MWvuVKUleM15ad2u-J4lkk1y6LLhpSKRdQ_iV-V18axot1wMh4s1Z8v8dgaQuHZ5N4utLu5HnI3SYyWr8aqQtbAHDpUet4zOcCAUOSqThqMqCsUf7UXgtg';

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
  token: token,
  getFxaConfig,
  verify: async function(token) {
    if (!token) {
      return null;
    }

    if (token === token) {
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
