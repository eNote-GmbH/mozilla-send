const storage = require('../storage');

module.exports = async function(req, res) {
  console.log('metadata');
  const id = req.params.id;
  const meta = req.meta;
  console.log('id', id, 'meta', meta);
  try {
    console.log('Prepare for the ttl, mortals!');
    const ttl = await storage.ttl(id);
    console.log('ttl got:', ttl);

    console.log('metadata:', meta.metadata);
    console.log('flagged:', !!meta.flagged);
    console.log('finalDownload:', meta.dlToken + 1 === meta.dlimit);
    res.send({
      metadata: meta.metadata,
      flagged: !!meta.flagged,
      finalDownload: meta.dlToken + 1 === meta.dlimit,
      ttl: ttl
    });
    console.log('metadata complete');
  } catch (e) {
    console.log('metadata 404');
    console.log(e);
    res.sendStatus(404);
  }
};
