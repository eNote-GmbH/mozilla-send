const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const storage = {
  allOwnerMetadata: sinon.stub()
};

function request(name) {
  return {
    user: {
      name
    }
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

const filesRoute = proxyquire('../../server/routes/files', {
  '../storage': storage
});

describe('/api/files', function() {
  afterEach(function() {
    storage.allOwnerMetadata.reset();
  });

  it('calls storage.allOwnerMetadata with the req.user parameter', async function() {
    const req = request('Tom');
    const res = response();
    await filesRoute(req, res);

    sinon.assert.calledWith(storage.allOwnerMetadata, { name: 'Tom' });
  });

  it('sends a 404 on failure', async function() {
    storage.allOwnerMetadata.returns(Promise.reject(new Error()));
    const req = request('Tom invalid');
    const res = response();
    await filesRoute(req, res);
    sinon.assert.calledWith(res.sendStatus, 404);
  });

  it('returns a json object', async function() {
    storage.allOwnerMetadata.returns(
      Promise.resolve({
        files: [
          { id: 'x', created: 1658841882548, last_modified: 1658841882548 },
          { id: 'y', created: 1658841882548, last_modified: 1658841882548 }
        ],
        lastModified: 1658841882548
      })
    );
    const req = request('Tom');
    const res = response();
    await filesRoute(req, res);
    sinon.assert.calledWithMatch(res.json, {
      files: [
        { id: 'x', created: 1658841882548, last_modified: 1658841882548 },
        { id: 'y', created: 1658841882548, last_modified: 1658841882548 }
      ],
      count: 2,
      last_modified: 1658841882548
    });
  });
});
