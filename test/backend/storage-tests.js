const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

const stream = {};
class MockStorage {
  async length() {
    return 12;
  }
  async getStream() {
    return stream;
  }
  set() {
    return Promise.resolve();
  }
  del() {
    return Promise.resolve();
  }
  ping() {
    return Promise.resolve();
  }
}

const config = {
  s3_bucket: 'foo',
  default_expire_seconds: 20,
  expire_times_seconds: [10, 20, 30],
  env: 'development',
  redis_host: 'mock',
  redis_port: 1234,
};

const logStub = () => {
  return {
    debug: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
  };
};

const storage = proxyquire('../../server/storage', {
  '../config': config,
  '../log': logStub,
  './s3': MockStorage,
});

describe('Storage', function () {
  describe('ttl', function () {
    it('returns milliseconds remaining', async function () {
      const time = 40;
      await storage.set('x', null, { foo: 'bar' }, time);
      const ms = await storage.ttl('x');
      await storage.del('x');
      assert.equal(ms, time * 1000);
    });
  });

  describe('length', function () {
    it('returns the file size', async function () {
      const len = await storage.length('x');
      assert.equal(len, 12);
    });
  });

  describe('get', function () {
    it('returns a stream', async function () {
      const { stream: s } = await storage.get('x');
      assert.equal(s, stream);
    });
  });

  describe('set', function () {
    it('sets expiration to expire time', async function () {
      const seconds = 100;
      await storage.set('x', null, { foo: 'bar' }, seconds);
      const s = await storage.redis.ttl('x');
      await storage.del('x');
      assert.equal(Math.ceil(s), seconds);
    });

    it('adds right prefix based on expire time', async function () {
      await storage.set('x', null, { foo: 'bar' }, 300);
      const { filePath: path_x } = await storage.getPrefixedInfo('x');
      assert.equal(path_x, '1-x');
      await storage.del('x');

      await storage.set('y', null, { foo: 'bar' }, 86400);
      const { filePath: path_y } = await storage.getPrefixedInfo('y');
      assert.equal(path_y, '1-y');
      await storage.del('y');

      await storage.set('z', null, { foo: 'bar' }, 86400 * 7);
      const { filePath: path_z } = await storage.getPrefixedInfo('z');
      assert.equal(path_z, '7-z');
      await storage.del('z');
    });

    it('sets metadata', async function () {
      const m = { foo: 'bar' };
      await storage.set('x', null, m);
      const meta = await storage.redis.hGetAll('x');
      delete meta.prefix;
      await storage.del('x');
      assert.deepEqual(meta, m);
    });
  });

  describe('setField', function () {
    it('works', async function () {
      await storage.set('x', null);
      storage.setField('x', 'y', 'z');
      const z = await storage.redis.hGet('x', 'y');
      assert.equal(z, 'z');
      await storage.del('x');
    });
  });

  describe('del', function () {
    it('works', async function () {
      await storage.set('x', null, { foo: 'bar' });
      await storage.del('x');
      const meta = await storage.metadata('x');
      assert.equal(meta, null);
    });
  });

  describe('ping', function () {
    it('works', async function () {
      await storage.ping();
    });
  });

  describe('metadata', function () {
    it('returns all metadata fields', async function () {
      const m = {
        id: 'a1',
        pwd: 0,
        dl: 1,
        dlimit: 1,
        fxa: 1,
        auth: 'foo',
        metadata: 'bar',
        nonce: 'baz',
        owner: 'bmo',
        user: 'bus',
        contentType: 'image/gif',
      };
      await storage.set('x', null, m);
      const meta = await storage.metadata('x');
      assert.deepEqual(
        { ...meta, storage: 'excluded' },
        {
          ...m,
          dead: false,
          flagged: false,
          dlToken: 0,
          fxa: true,
          pwd: false,
          storage: 'excluded',
        }
      );
    });
  });

  describe('allOwnerMetadata', function () {
    it('returns all files of user', async function () {
      const x = {
        id: 'a1',
        pwd: 0,
        dl: 1,
        dlimit: 1,
        fxa: 1,
        auth: 'foo',
        metadata: 'bar',
        nonce: 'baz',
        owner: 'bmo',
        user: 'bus',
        contentType: 'image/gif',
      };
      await storage.set('x', null, x);
      const y = {
        id: 'a2',
        pwd: 0,
        dl: 1,
        dlimit: 1,
        fxa: 1,
        auth: 'foo2',
        metadata: 'bar2',
        nonce: 'baz2',
        owner: 'bmo',
        user: 'bus',
        contentType: 'image/gif',
      };
      await storage.set('y', null, y);
      const allOwnerMetadata = await storage.allOwnerMetadata('bus');
      assert.deepEqual(allOwnerMetadata, {
        files: [
          {
            id: 'x',
            created: allOwnerMetadata.files[0].created,
            last_modified: allOwnerMetadata.files[0].last_modified,
          },
          {
            id: 'y',
            created: allOwnerMetadata.files[1].created,
            last_modified: allOwnerMetadata.files[1].last_modified,
          },
        ],
        lastModified: allOwnerMetadata.files[1].last_modified,
      });
    });
  });
});
