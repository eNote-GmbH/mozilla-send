const config = require('../config');
const Metadata = require('../metadata');
const mozlog = require('../log');
const createRedisClient = require('./redis');

function getPrefix(seconds) {
  if (seconds === 0) {
    // does not expire...
    return 0;
  }
  return Math.max(Math.floor(seconds / 86400), 1);
}

function fileInfoPrefix(field, id) {
  return `${field}:${id}`;
}

class DB {
  constructor(config) {
    let Storage = null;
    if (config.s3_bucket) {
      Storage = require('./s3');
    } else if (config.gcs_bucket) {
      Storage = require('./gcs');
    } else {
      Storage = require('./fs');
    }
    this.log = mozlog('send.storage');

    this.storage = new Storage(config, this.log);

    this.redis = createRedisClient(config);
    if (this.redis.on !== undefined) {
      this.redis.on('error', (err) => {
        this.log.error('Redis:', err);
      });
    }
  }

  async close() {
    if (this.redis.isOpen) {
      await this.redis.quit();
      this.log.info('close', { msg: 'Redis client closed' });
    }
  }

  async ttl(id) {
    const result = await this.redis.ttl(id);
    switch (result) {
      case -2:
        return null;
      case -1:
        return 0;
      default:
        return Math.ceil(result) * 1000;
    }
  }

  async getPrefixedInfo(id) {
    const [prefix, dead, flagged] = await this.redis.hmGet(
      id,
      'prefix',
      'dead',
      'flagged'
    );
    return {
      filePath: `${prefix}-${id}`,
      flagged,
      dead,
    };
  }

  async length(id) {
    const { filePath } = await this.getPrefixedInfo(id);
    return await this.storage.length(filePath);
  }

  async get(id, range) {
    const info = await this.getPrefixedInfo(id);
    this.log.debug('get', { id, info });
    if (info.dead || info.flagged) {
      throw new Error(info.flagged ? 'flagged' : 'dead');
    }
    const stream = await this.storage.getStream(info.filePath, range);
    return { stream, range };
  }

  async set(id, file, meta, expireSeconds = config.default_expire_seconds) {
    const prefix = getPrefix(expireSeconds);
    const filePath = `${prefix}-${id}`;
    this.log.debug('set', { id, prefix, filePath, expireSeconds, info: meta });

    await this.storage.set(filePath, file);

    const promises = [];
    promises.push(this.redis.hSet(id, 'prefix', prefix));
    if (meta) {
      const uploadTime = Date.now();
      promises.push(this.redis.hSet(id, meta));

      if (meta.user) {
        promises.push(this.redis.hSet(meta.user, fileInfoPrefix('id', id), id));
        promises.push(
          this.redis.hSet(meta.user, fileInfoPrefix('created', id), uploadTime)
        );
        promises.push(
          this.redis.hSet(
            meta.user,
            fileInfoPrefix('last_modified', id),
            uploadTime
          )
        );

        // overall last_modified file timestamp
        promises.push(this.redis.hSet(meta.user, 'last_modified', uploadTime));
      }
    }

    await Promise.all(promises);

    if (expireSeconds > 0) {
      await this.redis.expire(id, expireSeconds);
    }
  }

  async setField(id, key, value) {
    await this.redis.hSet(id, key, value);
  }

  async incrementField(id, key, increment = 1) {
    return await this.redis.hIncrBy(id, key, increment);
  }

  async kill(id) {
    const { filePath, dead } = await this.getPrefixedInfo(id);
    if (!dead) {
      await this.redis.hSet(id, 'dead', 1);
      await this.storage.del(filePath);
    }
  }

  async flag(id, key) {
    await this.kill(id);
    await this.redis.hSet(id, { flagged: 1, key });
  }

  async del(id, user) {
    this.log.debug('del', { id, user });
    const { filePath } = await this.getPrefixedInfo(id);
    if (user) {
      await Promise.all([
        this.redis.hDel(user, fileInfoPrefix('id', id)),
        this.redis.hDel(user, fileInfoPrefix('created', id)),
        this.redis.hDel(user, fileInfoPrefix('last_modified', id)),
      ]);
    }
    await this.redis.del(id);
    this.storage.del(filePath);
  }

  async ping() {
    await this.redis.ping();
    await this.storage.ping();
  }

  async metadata(id) {
    const result = await this.redis.hGetAll(id);
    this.log.debug('metadata', { id, info: result });
    return result && new Metadata({ id, ...result }, this);
  }

  async allOwnerMetadata(user) {
    const filesRaw = await this.redis.hGetAll(user);
    const lastModified = filesRaw.last_modified;
    delete filesRaw.last_modified;
    const filesMap = new Map();
    for (const property in filesRaw) {
      const key = property.split(':')[0];
      const id = property.substring(key.length + 1);
      const value = filesRaw[property];
      if (filesMap.has(id)) {
        filesMap.get(id)[key] = value;
      } else {
        filesMap.set(id, { [key]: value });
      }
    }
    const files = Array.from(filesMap.values());
    return { files, lastModified };
  }
}

module.exports = new DB(config);
