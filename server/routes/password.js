const storage = require('../storage');

module.exports = async function (req, res) {
  const id = req.params.id;
  const auth = req.body.auth;
  if (!auth) {
    return res.sendStatus(400);
  }

  try {
    await Promise.all([
      storage.setField(id, 'auth', auth),
      storage.setField(id, 'pwd', 1),
    ]);
    res.sendStatus(200);
  } catch (e) {
    return res.sendStatus(404);
  }
};
