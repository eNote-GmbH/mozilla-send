const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ServerResponse } = require('http');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const tus = require('tus-node-server');
const config = require('../../server/config');

const tusServer = new tus.Server();
const datastore = new tus.DataStore({
  path: '/api/upload',
});

const sandbox = sinon.createSandbox();

const tusSpy = sinon.spy(tusServer);

sandbox.stub(tus, 'Server').returns(tusSpy);
sandbox.stub(tus, 'FileStore').returns(datastore);

const uploaderStub = sandbox.stub();

const baseRequest = {
  baseUrl: '/v1',
  protocol: 'http',
};

function requestWithBody(method, path, headers, body, params) {
  const realHeaders = {
    host: 'localhost',
  };
  for (const key in headers) {
    realHeaders[key.toLowerCase()] = headers[key];
  }

  return {
    ...baseRequest,
    method,
    url: baseRequest.baseUrl + path,
    header: function (key) {
      return realHeaders[key.toLowerCase()];
    },
    headers: realHeaders,
    params: params || {},
    body,
  };
}

const uploadRoute = proxyquire('../../server/routes/upload', {
  'tus-node-server': tus,
  '../utils': uploaderStub,
});

describe('/api/upload', function () {
  let uploadId;

  afterEach(function () {
    sandbox.restore();
  });

  after(function () {
    fs.rmSync(config.file_dir, { recursive: true, force: true });
  });

  it('Does not call TUS.handle for a standard upload', async function () {
    const headers = {
      'X-File-Metadata': 'test',
      Authorization: 'correct_token.correct_token.correct_token',
      'Content-Length': 2,
    };
    const req = requestWithBody('POST', '/api/upload', headers, '{}');
    const res = sandbox.spy(new ServerResponse(req));

    await uploadRoute(req, res);

    sinon.assert.notCalled(tusSpy.handle);
    sinon.assert.calledOnce(uploaderStub);
  });

  it('calls TUS.handle() to initialize a resumable upload', async function () {
    const headers = {
      'Upload-Length': 750,
      'Upload-Metadata': 'filename cGFydGlhbC10eHQtdGVzdGZpbGUtYQ==',
    };
    const req = requestWithBody('POST', '/api/upload', headers);
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(0).calledWithExactly(req, res);

    assert.notEqual(res.getHeader('Location'), undefined);
    assert.equal(
      res.getHeader('Location').slice(0, -32),
      'http://localhost/v1/api/upload/'
    );
    uploadId = res.getHeader('Location').slice(-32);
  });

  it('calls TUS.handle() to initialize a resumable upload with zero Content-Length', async function () {
    const headers = {
      'Upload-Length': '750',
      'Upload-Metadata': 'filename cGFydGlhbC10eHQtdGVzdGZpbGUtYQ==',
      'Content-Length': '0',
    };
    const req = requestWithBody('POST', '/api/upload', headers);
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(1).calledWithExactly(req, res);

    assert.notEqual(res.getHeader('Location'), undefined);
    assert.equal(
      res.getHeader('Location').slice(0, -32),
      'http://localhost/v1/api/upload/'
    );
    uploadId = res.getHeader('Location').slice(-32);
  });

  it('calls TUS.handle() to upload a first part of the file', async function () {
    const headers = {
      'Upload-Offset': 0,
      'Content-Type': 'application/offset+octet-stream',
    };
    const fileBuffer = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'partial-txt-testfile-a')
    );
    const req = requestWithBody(
      'PATCH',
      `/api/upload/${uploadId}`,
      headers,
      fileBuffer,
      { resumeId: uploadId }
    );
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(1).calledWithExactly(req, res);
  });

  it('calls TUS.handle() to upload a second (last) part of the file', async function () {
    const headers = {
      'Upload-Offset': 750,
      'Content-Type': 'application/offset+octet-stream',
    };
    const fileBuffer = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'partial-txt-testfile-b')
    );
    const req = requestWithBody(
      'PATCH',
      `/api/upload/${uploadId}`,
      headers,
      fileBuffer,
      { resumeId: uploadId }
    );
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(2).calledWithExactly(req, res);
  });
});
