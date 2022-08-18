const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const storage = {
  setField: sinon.stub(),
};

function request(id, body) {
  return {
    params: { id },
    body,
  };
}

function response() {
  return {
    sendStatus: sinon.stub(),
  };
}

const passwordRoute = proxyquire('../../server/routes/password', {
  '../storage': storage,
});

describe('/api/password', function () {
  afterEach(function () {
    storage.setField.reset();
  });

  it('calls storage.setField with the correct parameter', async function () {
    const req = request('x', { auth: 'z' });
    const res = response();
    await passwordRoute(req, res);
    sinon.assert.calledWith(storage.setField, 'x', 'auth', 'z');
    sinon.assert.calledWith(storage.setField, 'x', 'pwd', 1);
    sinon.assert.calledWith(res.sendStatus, 200);
  });

  it('sends a 400 if auth is missing', async function () {
    const req = request('x', {});
    const res = response();
    await passwordRoute(req, res);
    sinon.assert.calledWith(res.sendStatus, 400);
  });

  it('sends a 404 on failure', async function () {
    storage.setField.throws(new Error());
    const req = request('x', { auth: 'z' });
    const res = response();
    await passwordRoute(req, res);
    sinon.assert.calledWith(res.sendStatus, 404);
  });
});
