const config = require('../config');
const storage = require('../storage');

module.exports = async function (req, res) {
  const max = req.meta.fxa ? config.max_downloads : config.anon_max_downloads;
  const dlimit = req.body.dlimit;
  if (dlimit) {
    if (max > 0 && dlimit > max) {
      return res.sendStatus(400);
    }

    try {
      await storage.setField(req.params.id, 'dlimit', dlimit);
    } catch (e) {
      res.sendStatus(404);
    }
  } else if (max > 0) {
    // limit must be set
    return res.sendStatus(400);
  }
  res.sendStatus(200);
};
