const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const fs = require('fs');
const tus = require('tus-node-server');

const tusServer = sinon.createStubInstance(tus.Server, {
  handle: sinon.stub().returnsThis()
});

function request(headers) {
  return {
    headers
  };
}

function requestWithBody(headers, body) {
  return {
    headers,
    body
  };
}

const uploadRoute = proxyquire('../../server/routes/upload', {
  'tus-node-server': tusServer
});

describe('/api/upload', function() {
  it('calls TUS.handle() to initialize a resumable upload', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'X-Request-ID': '7692a8fc-4006-465b-a549-4332970f5f9c',
      'Upload-Length': 750,
      'Upload-Metadata': 'filename cGFydGlhbC10eHQtdGVzdGZpbGUtYQ==,filetype'
    };
    const req = request(headers);
    const res = {};
    await uploadRoute(req, res);

    sinon.assert.calledWith(tusServer.handle, req);
    sinon.assert.match(res, {
      Location:
        'https://localhost/api/upload/aed5db4a763c6e87d4a6e260b2b7bc5c+LdgXmjpvvR7NCr3nndJNaAyVm4Pm9O3f2QVOWBXtcOT8cc7_tljrCikos7jfY0vaum6lBUEtAfI49arApgI33Ac9kU9XC2hWxPbPEC59T0dzf_h5rhJvzNUJksrmTaw5',
      'Tus-Resumable': '1.0.0'
    });
  });

  it('calls TUS.handle() to upload a first part of the file', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'X-Request-ID': '7c9fee68-17df-4c28-a3ad-99484023996e',
      'Upload-Offset': 0,
      'Content-Type': 'application/offset+octet-stream'
    };
    const fileBuffer = fs.readFileSync('/fixtures/partial-txt-testfile_a');
    const req = requestWithBody(headers, fileBuffer);
    const res = {};
    await uploadRoute(req, res);

    sinon.assert.calledWith(tusServer.handle, req);
    sinon.assert.match(res, {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': 750
    });
  });

  it('calls TUS.handle() to upload a second (last) part of the file', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'X-Request-ID': '7c9fee68-17df-4c28-a3ad-99484023996t',
      'Upload-Offset': 750,
      'Content-Type': 'application/offset+octet-stream'
    };
    const fileBuffer = fs.readFileSync('/fixtures/partial-txt-testfile_b');
    const req = requestWithBody(headers, fileBuffer);
    const res = {};
    await uploadRoute(req, res);

    sinon.assert.calledWith(tusServer.handle, req);
    sinon.assert.match(res, {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': 1246
    });
  });

  it('Does not call TUS.handle for a standard upload', async function() {
    const headers = {
      'X-File-Metadata': 'test',
      Authorization: 'correct_token.correct_token.correct_token'
    };
    const req = request(headers);
    const res = {};
    await uploadRoute(req, res);

    sinon.assert.notCalled(tusServer.handle);
  });
});
