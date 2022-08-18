const { URL } = require('url');
const promisify = require('util').promisify;

const createClientConfig = function (config) {
  const redisUrl = new URL(`redis://${config.redis_host}:${config.redis_port}`);

  const client_config = {
    host: config.redis_host,
    port: config.redis_port,
    retry_strategy: (options) => {
      if (options.total_retry_time > config.redis_retry_time) {
        // client.emit('error', 'Retry time exhausted');
        return new Error('Retry time exhausted');
      }

      return config.redis_retry_delay;
    },
  };

  if (config.redis_user != null && config.redis_user.length > 0) {
    client_config.user = config.redis_user;
    redisUrl.username = config.redis_user;
  }

  if (config.redis_password != null && config.redis_password.length > 0) {
    client_config.password = config.redis_password;
    redisUrl.password = config.redis_password;
  }

  if (config.redis_db != null && config.redis_db.length > 0) {
    client_config.db = config.redis_db;
  }

  client_config.url = redisUrl.toString();

  return client_config;
};

module.exports = function (config) {
  const isMock = config.env === 'development' && config.redis_host === 'mock';
  let redis;

  if (isMock) {
    redis = require('redis-mock');
  } else {
    redis = require('redis');
  }

  const client_config = createClientConfig(config);
  const client = redis.createClient(client_config);

  if (isMock) {
    client.ttl = promisify(client.ttl);
    client.hGetAll = promisify(client.hgetall);
    client.hGet = promisify(client.hget);
    client.hmGet = promisify(client.hmget);
    client.hSet = function (hash, key, value) {
      if (typeof key === 'object') {
        return new Promise((resolve, reject) => {
          try {
            Object.entries(key).forEach(([hashKey, hashValue]) => {
              client.hset(hash, hashKey, hashValue);
            });
          } catch (err) {
            reject(err);
          }
          resolve();
        });
      } else {
        return new Promise((resolve, reject) => {
          try {
            client.hset(hash, key, value);
          } catch (err) {
            reject(err);
          }
          resolve();
        });
      }
    };
    client.hIncrBy = promisify(client.hincrby);
    client.hDel = promisify(client.hdel);
    client.ping = promisify(client.ping);
    client.exists = promisify(client.exists);
    client.expire = promisify(client.expire);
    client.del = promisify(client.del);
  } else {
    client.connect();
  }

  return client;
};
