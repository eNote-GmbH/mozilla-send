const crypto = require('crypto');
const config = require('./config');

function makeToken(secret, counter) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(String(counter));
  return hmac.digest('hex');
}

class Metadata {
  constructor(obj, storage) {
    this.id = obj.id;
    this.contentType = obj.contentType;
    this.dl = +obj.dl || 0;
    this.dlToken = +obj.dlToken || 0;
    this.dlimit = +obj.dlimit || config.default_downloads;
    this.pwd = !!+obj.pwd;
    this.owner = obj.owner;
    this.metadata = obj.metadata;
    this.auth = obj.auth;
    this.user = obj.user;
    this.nonce = obj.nonce;
    this.flagged = !!obj.flagged;
    this.dead = !!obj.dead;
    this.fxa = !!+obj.fxa;
    this.storage = storage;
  }

  async getDownloadToken() {
    if (this.dlimit > 0 && this.dlToken >= this.dlimit) {
      throw new Error('limit');
    }
    this.dlToken = await this.storage.incrementField(this.id, 'dlToken');
    // another request could have also incremented
    if (this.dlimit > 0 && this.dlToken > this.dlimit) {
      throw new Error('limit');
    }
    return makeToken(this.owner, this.dlToken);
  }

  async verifyDownloadToken(token) {
    const validTokens = Array.from({ length: this.dlToken }, (_, i) =>
      makeToken(this.owner, i + 1)
    );
    return validTokens.includes(token);
  }
}

module.exports = Metadata;
