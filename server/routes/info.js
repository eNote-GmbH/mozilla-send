const storage = require('../storage');

module.exports = async function(req, res) {
  console.log('info');
  try {
    const ttl = await storage.ttl(req.params.id);
    return res.send({
      dlimit: +req.meta.dlimit,
      dtotal: +req.meta.dl,
      ttl
    });
  } catch (e) {
    console.log('info 404');
    res.sendStatus(404);
  }
};
