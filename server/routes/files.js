const storage = require('../storage');

module.exports = async function(req, res) {
  try {
    const { files, lastModified } = await storage.allOwnerMetadata(req.user);

    res.status(200).json({
      files,
      count: files.length,
      last_modified: lastModified
    });
  } catch (e) {
    res.sendStatus(404);
  }
};
