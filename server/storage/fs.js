const fss = require('fs');
const fs = fss.promises;
const path = require('path');

class FSStorage {
  constructor(config, log) {
    log.info('fs', {
      msg: 'Initializing local file storage backend',
      file_dir: config.file_dir,
    });
    this.log = log;
    this.dir = config.file_dir;
    fss.mkdirSync(this.dir, {
      recursive: true,
    });
  }

  async length(id) {
    const result = await fs.stat(path.join(this.dir, id));
    return result.size;
  }

  async getStream(id, range) {
    const options = {};
    if (range) {
      options.start = range.start;
      options.end = range.end;
    }
    return fss.createReadStream(path.join(this.dir, id), options);
  }

  set(id, file) {
    return new Promise((resolve, reject) => {
      const filepath = path.join(this.dir, id);
      const fstream = fss.createWriteStream(filepath);
      file.pipe(fstream);
      file.on('error', (err) => {
        fstream.destroy(err);
      });
      fstream.on('error', (err) => {
        this.del(id);
        reject(err);
      });
      fstream.on('finish', resolve);
    });
  }

  async del(id) {
    try {
      await fs.unlink(path.join(this.dir, id));
    } catch (e) {
      // ignore local fs issues
    }
  }

  ping() {
    return Promise.resolve();
  }
}

module.exports = FSStorage;
