const storage = require('../storage');

module.exports = function(req, res) {
  console.log('password');
  const id = req.params.id;
  const auth = req.body.auth;
  console.log('id', id, 'auth', auth);
  if (!auth) {
    return res.sendStatus(400);
  }

  try {
    storage.setField(id, 'auth', auth);
    console.log('password storage.setField auth');
    storage.setField(id, 'pwd', 1);
    console.log('password storage.setField pwd');
    res.sendStatus(200);
    console.log('password complete');
  } catch (e) {
    console.log('password 404');
    return res.sendStatus(404);
  }
};
