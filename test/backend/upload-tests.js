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
  path: 'dummy'
});

const sandbox = sinon.createSandbox();

const tusSpy = sinon.spy(tusServer);

sandbox.stub(tus, 'Server').returns(tusSpy);
sandbox.stub(tus, 'FileStore').returns(datastore);

const uploaderStub = sandbox.stub();

const baseRequest = {
  baseUrl: 'http://localhost/v1'
};

function requestWithBody(method, path, headers, body) {
  const realHeaders = {};
  for (const key in headers) {
    realHeaders[key.toLowerCase()] = headers[key];
  }

  return {
    ...baseRequest,
    method,
    url: baseRequest.baseUrl + path,
    header: function(key) {
      return realHeaders[key.toLowerCase()];
    },
    headers: realHeaders,
    body
  };
}

const uploadRoute = proxyquire('../../server/routes/upload', {
  'tus-node-server': tus,
  '../utils': uploaderStub
});

describe('/api/upload', function() {
  afterEach(function() {
    sandbox.restore();
  });

  after(function() {
    fs.rmSync(config.file_dir, { recursive: true, force: true });
  });

  it('Does not call TUS.handle for a standard upload', async function() {
    const headers = {
      'X-File-Metadata': 'test',
      Authorization: 'correct_token.correct_token.correct_token'
    };
    const req = requestWithBody('POST', '/api/files', headers);
    const res = sandbox.spy(new ServerResponse(req));

    await uploadRoute(req, res);

    sinon.assert.notCalled(tusSpy.handle);
    sinon.assert.calledOnce(uploaderStub);
  });

  it('calls TUS.handle() to initialize a resumable upload', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': 750,
      'Upload-Metadata': 'filename cGFydGlhbC10eHQtdGVzdGZpbGUtYQ=='
    };
    const req = requestWithBody('POST', '/api/files', headers, '{}');
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(0).calledWithExactly(req, res);

    assert.equal(res.getHeader('Tus-Resumable'), '1.0.0');
  });

  it('calls TUS.handle() to upload a first part of the file', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': 0,
      'Content-Type': 'application/offset+octet-stream'
    };
    const fileBuffer = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'partial-txt-testfile-a')
    );
    const req = requestWithBody('PATCH', '/api/files', headers, fileBuffer);
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(1).calledWithExactly(req, res);

    assert.equal(res.getHeader('Tus-Resumable'), '1.0.0');
  });

  it('calls TUS.handle() to upload a second (last) part of the file', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': 750,
      'Content-Type': 'application/offset+octet-stream'
    };
    const fileBuffer = fs.readFileSync(
      path.join(__dirname, 'fixtures', 'partial-txt-testfile-b')
    );
    const req = requestWithBody('PATCH', '/api/files', headers, fileBuffer);
    const res = sandbox.spy(new ServerResponse(req));
    await uploadRoute(req, res);

    sinon.assert.called(tusSpy.handle);
    tusSpy.handle.getCall(2).calledWithExactly(req, res);

    assert.equal(res.getHeader('Tus-Resumable'), '1.0.0');
  });
});
