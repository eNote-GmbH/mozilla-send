const storage = require('../storage');

module.exports = async function(req, res) {
  console.log('delete');
  try {
    const id = req.params.id;
    await storage.del(id);
    res.sendStatus(200);
    console.log('delete complete');
  } catch (e) {
    console.log('delete 404');
    res.sendStatus(404);
  }
};
