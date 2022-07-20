const storage = require('../storage');

module.exports = async function(req, res) {
  try {
    // TO CONFIRM relationship between uid and owner
    const meta = await storage.allOwnerMetadata(req.user.owner);

    res.status(200).json({
      files: meta.map(f => ({
        id: f.id,
        created: f.created,
        last_modified: f.last_modified,
        metadata: f.metadata
      })),
      count: meta.length,
      last_modified: meta[0].last_modified // TO DO - calculate properly
    });
  } catch (e) {
    res.sendStatus(404);
  }
};
