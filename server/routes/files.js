const storage = require('../storage');

module.exports = async function(req, res) {
  try {
    const files = await storage.allOwnerMetadata(req.user);

    res.status(200).json({
      files,
      count: files.length,
      last_modified: files[0].last_modified // TO DO - calculate properly
    });
  } catch (e) {
    res.sendStatus(404);
  }
};
