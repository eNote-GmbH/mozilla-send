const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const tus = require('tus-node-server');

const tusServer = sinon.createStubInstance(tus.Server, {
  handle: sinon.stub().returnsThis()
});

function request(headers) {
  return {
    headers
  };
}

function response() {
  const status = sinon.stub();
  const json = sinon.spy();
  const res = { json, status };
  status.returns(res);
  return {
    sendStatus: sinon.stub(),
    json,
    status
  };
}

const uploadRoute = proxyquire('../../server/routes/upload', {
  'tus-node-server': tusServer
});

describe('/api/upload', function() {
  it('calls TUS.handle for a resumable upload', async function() {
    const headers = {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': 1495
    };
    const req = request(headers);
    const res = response();
    await uploadRoute(req, res);

    sinon.assert.calledWith(tusServer.handle, req);
  });

  it('Does not call TUS.handle for a standard upload', async function() {
    const headers = {
      'X-File-Metadata': 'test',
      Authorization: 'correct_token.correct_token.correct_token'
    };
    const req = request(headers);
    const res = response();
    await uploadRoute(req, res);

    sinon.assert.notCalled(tusServer.handle);
  });
});
