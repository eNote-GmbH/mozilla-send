const storage = require('../storage');

module.exports = async function(req, res) {
  console.log('done');
  try {
    const id = req.params.id;
    const meta = req.meta;
    await storage.incrementField(id, 'dl');
    if (meta.dl + 1 >= meta.dlimit) {
      // Only dlimit number of tokens will be issued
      // after which /download/token will return 403
      // however the protocol doesn't prevent one token
      // from making all the downloads and assumes
      // clients are well behaved. If this becomes
      // a problem we can keep track of used tokens.
      await storage.kill(id);
      console.log('done complete');
    }
    res.sendStatus(200);
  } catch (e) {
    console.log('done 404');
    res.sendStatus(404);
  }
};
