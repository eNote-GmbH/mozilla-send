const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

class GCSStorage {
  constructor(config, log) {
    log.info('gcs', {
      msg: 'Initializing Google Cloud Storage storage backend',
      gcs_bucket: config.gcs_bucket,
    });
    this.bucket = storage.bucket(config.gcs_bucket);
    this.log = log;
  }

  async length(id) {
    const data = await this.bucket.file(id).getMetadata();
    return data[0].size;
  }

  async getStream(id, range) {
    const options = {
      validation: false,
    };
    if (range) {
      options.start = range.start;
      options.end = range.end;
    }
    return this.bucket.file(id).createReadStream(options);
  }

  set(id, file) {
    return new Promise((resolve, reject) => {
      file
        .pipe(
          this.bucket.file(id).createWriteStream({
            validation: false,
            resumable: true,
          })
        )
        .on('error', reject)
        .on('finish', resolve);
    });
  }

  del(id) {
    return this.bucket.file(id).delete();
  }

  ping() {
    return this.bucket.exists();
  }
}

module.exports = GCSStorage;
