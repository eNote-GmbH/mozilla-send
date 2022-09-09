const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const log = {
  debug: sinon.stub(),
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
};

const s3Stub = {
  headObject: sinon.stub(),
  getObject: sinon.stub(),
  upload: sinon.stub(),
  deleteObject: sinon.stub(),
};

const awsStub = {
  config: {
    update: sinon.stub(),
  },
  S3: function () {
    return s3Stub;
  },
};

const awsUploadStub = {
  abort: sinon.stub(),
  done: sinon.stub(),
};

const awsUploadConst = sinon.spy(() => {
  return awsUploadStub;
});

const awsLibraryStub = {
  Upload: awsUploadConst,
};

const S3Storage = proxyquire('../../server/storage/s3', {
  '@aws-sdk/client-s3': awsStub,
  '@aws-sdk/lib-storage': awsLibraryStub,
});

describe('S3Storage', function () {
  it('uses config.s3_bucket', function () {
    const s = new S3Storage({ s3_bucket: 'foo' }, log);
    assert.equal(s.bucket, 'foo');
  });

  describe('length', function () {
    it('returns the ContentLength', async function () {
      s3Stub.headObject = sinon.stub().resolves({ ContentLength: 123 });
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      const len = await s.length('x');
      assert.equal(len, 123);
      sinon.assert.calledWithMatch(s3Stub.headObject, {
        Bucket: 'foo',
        Key: 'x',
      });
    });

    it('throws when id not found', async function () {
      const err = new Error();
      s3Stub.headObject = sinon.stub().rejects(err);
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      try {
        await s.length('x');
        assert.fail();
      } catch (e) {
        assert.equal(e, err);
      }
    });
  });

  describe('getStream', function () {
    it('returns a Stream object', async function () {
      const stream = {};
      s3Stub.getObject = sinon.stub().resolves({ Body: stream });
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      const result = await s.getStream('x');
      assert.equal(result, stream);
      sinon.assert.calledWithMatch(s3Stub.getObject, {
        Bucket: 'foo',
        Key: 'x',
      });
    });
  });

  describe('set', function () {
    it('calls s3.upload', async function () {
      const file = { on: sinon.stub() };
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      await s.set('x', file);
      sinon.assert.called(awsUploadConst);
      awsUploadConst.getCall(0).calledWith(
        sinon.match({
          params: {
            Bucket: 'foo',
            Key: 'x',
            Body: file,
          },
        })
      );
    });

    it('aborts upload if limit is hit', async function () {
      const file = {
        on: (ev, fn) => fn(),
      };
      const err = new Error('limit');
      awsUploadStub.done.rejects(err);
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      try {
        await s.set('x', file);
        assert.fail();
      } catch (e) {
        assert.equal(e.message, 'limit');
        sinon.assert.calledOnce(awsUploadStub.abort);
      }
    });

    it('throws when s3.upload fails', async function () {
      const file = {
        on: sinon.stub(),
      };
      const err = new Error();
      awsUploadStub.done.rejects(err);
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      try {
        await s.set('x', file);
        assert.fail();
      } catch (e) {
        assert.equal(e, err);
      }
    });
  });

  describe('del', function () {
    it('calls s3.deleteObject', async function () {
      s3Stub.deleteObject = sinon.stub().resolves(true);
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      const result = await s.del('x');
      assert.equal(result, true);
      sinon.assert.calledWithMatch(s3Stub.deleteObject, {
        Bucket: 'foo',
        Key: 'x',
      });
    });
  });

  describe('ping', function () {
    it('calls s3.headBucket', async function () {
      s3Stub.headBucket = sinon.stub().resolves(true);
      const s = new S3Storage({ s3_bucket: 'foo' }, log);
      const result = await s.ping();
      assert.equal(result, true);
      sinon.assert.calledWithMatch(s3Stub.headBucket, { Bucket: 'foo' });
    });
  });
});
