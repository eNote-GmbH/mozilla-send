module.exports = async function(req, res) {
  console.log('token');
  const meta = req.meta;
  try {
    if (meta.dead || meta.flagged) {
      return res.sendStatus(404);
    }
    const token = await meta.getDownloadToken();
    res.send({
      token
    });
    console.log('token 404');
  } catch (e) {
    if (e.message === 'limit') {
      console.log('token 403');
      return res.sendStatus(403);
    }
    console.log('token 404');
    res.sendStatus(404);
  }
};
