const crypto = require('crypto');
const mozlog = require('../log');
const storage = require('../storage');
const fxa = require('../fxa');
const log = mozlog('send.auth');

const get_valid_meta = async function (storage, req) {
  if (!req.meta) {
    const id = req.params.id;
    if (id) {
      const meta = await storage.metadata(id);
      if (!req.meta) {
        req.meta = meta;
      }
    }
  }
  if (req.meta && !req.meta.dead) {
    return req.meta;
  }

  return null;
};

const get_auth_info = function (req) {
  const authHeader = req.header('Authorization');
  if (authHeader) {
    return authHeader.split(' ', 2);
  }
  return [null, null];
};

const test_auth_fxa = async function (meta, req, auth_type, auth_value) {
  if (auth_type == 'Bearer' && auth_value) {
    req.user = await fxa.verify(auth_value);
  }

  let success = false;
  if (req.user) {
    if (meta && meta.user) {
      const metaAuth = Buffer.from(meta.user, 'utf8');
      const userAuth = Buffer.from(req.user, 'utf8');
      success = crypto.timingSafeEqual(metaAuth, userAuth);
    } else {
      // no meta but we have a valid user
      success = true;
    }
  }

  if (success) {
    req.fxa_user = req.user;
  }

  return success;
};

const test_auth_hmac = async function (
  meta,
  storage,
  req,
  res,
  auth_type,
  auth_value
) {
  if (auth_type == 'send-v1' && auth_value) {
    if (meta && meta.auth && meta.nonce) {
      const hmac = crypto.createHmac(
        'sha256',
        Buffer.from(meta.auth, 'base64')
      );
      hmac.update(Buffer.from(meta.nonce, 'base64'));
      const verifyHash = hmac.digest();
      if (
        crypto.timingSafeEqual(verifyHash, Buffer.from(auth_value, 'base64'))
      ) {
        req.nonce = crypto.randomBytes(16).toString('base64');
        storage.setField(meta.id, 'nonce', req.nonce);
        res.set('WWW-Authenticate', `send-v1 ${req.nonce}`);
        return true;
      } else {
        res.set('WWW-Authenticate', `send-v1 ${meta.nonce}`);
      }
    } else {
      res.set('WWW-Authenticate', `send-v1 ${meta.nonce}`);
    }
  }
  return false;
};

const test_auth_dlToken = async function (meta, auth_type, auth_value) {
  if (auth_type == 'Bearer' && auth_value) {
    try {
      return await meta.verifyDownloadToken(auth_value);
    } catch (err) {
      if (err instanceof TypeError) {
        // we may see an actual OAuth token here
        return false;
      }
      throw err;
    }
  }
  return false;
};

const test_auth_owner = async function (meta, req) {
  const ownerToken = req.body.owner_token;
  if (ownerToken && meta.owner) {
    const metaOwner = Buffer.from(meta.owner, 'utf8');
    const owner = Buffer.from(ownerToken, 'utf8');
    if (metaOwner.length > 0 && metaOwner.length === owner.length) {
      return crypto.timingSafeEqual(metaOwner, owner);
    }
  }
  return false;
};

module.exports = {
  hmac: async function (req, res, next) {
    let auth_success = false;
    try {
      const [auth_type, token] = get_auth_info(req);
      if (token) {
        const meta = await get_valid_meta(storage, req);
        if (!meta) {
          return res.sendStatus(404);
        }

        auth_success = await test_auth_hmac(
          meta,
          storage,
          req,
          res,
          auth_type,
          token
        );

        if (!auth_success) {
          // always allow FxA-authenticated users to see their data
          auth_success = await test_auth_fxa(meta, req, auth_type, token);
        }
      }
    } catch (e) {
      log.warn('hmac', e);
      auth_success = false;
    }

    // eslint-disable-next-line require-atomic-updates
    req.authorized = auth_success;

    if (auth_success) {
      next();
    } else {
      res.sendStatus(401);
    }
  },
  owner: async function (req, res, next) {
    let auth_success = false;
    try {
      const meta = await get_valid_meta(storage, req);
      if (!meta) {
        return res.sendStatus(404);
      }

      auth_success = await test_auth_owner(meta, req);

      if (!auth_success) {
        const [auth_type, token] = get_auth_info(req);
        if (token) {
          // always allow FxA-authenticated users to see their data
          auth_success = await test_auth_fxa(meta, req, auth_type, token);
        }
      }
    } catch (e) {
      log.warn('owner', e);
      auth_success = false;
    }

    // eslint-disable-next-line require-atomic-updates
    req.authorized = auth_success;

    if (auth_success) {
      next();
    } else {
      res.sendStatus(401);
    }
  },
  fxa: async function (req, res, next) {
    let auth_success = false;
    try {
      const [auth_type, token] = get_auth_info(req);
      if (token) {
        const meta = await get_valid_meta(storage, req);
        // let's try to find the user first by the JWT bearer
        auth_success = await test_auth_fxa(meta, req, auth_type, token);
      }
    } catch (e) {
      log.warn('fxa', e);
      auth_success = false;
    }

    // eslint-disable-next-line require-atomic-updates
    req.authorized = auth_success;

    if (auth_success) {
      next();
    } else {
      res.sendStatus(401);
    }
  },
  dlToken: async function (req, res, next) {
    let auth_success = false;
    try {
      const [auth_type, token] = get_auth_info(req);
      if (token) {
        const meta = await get_valid_meta(storage, req);
        if (!meta) {
          return res.sendStatus(404);
        }

        auth_success = await test_auth_dlToken(meta, auth_type, token);

        if (!auth_success) {
          // try with HMAC next, since that was how it used to be
          auth_success = await test_auth_hmac(
            meta,
            storage,
            req,
            res,
            auth_type,
            token
          );
        }

        if (!auth_success) {
          // always allow FxA-authenticated users to see their data
          auth_success = await test_auth_fxa(meta, req, auth_type, token);
        }
      }
    } catch (e) {
      log.warn('dlToken', e);
      auth_success = false;
    }

    // eslint-disable-next-line require-atomic-updates
    req.authorized = auth_success;

    if (auth_success) {
      next();
    } else {
      res.sendStatus(401);
    }
  },
};
