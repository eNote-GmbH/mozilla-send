const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

class S3Storage {
  constructor(config, log) {
    log.info('s3', {
      msg: 'Initializing AWS S3 storage backend',
      s3_bucket: config.s3_bucket,
    });
    this.bucket = config.s3_bucket;
    this.log = log;
    const cfg = {};
    if (config.s3_endpoint != '') {
      cfg['endpoint'] = config.s3_endpoint;
    }
    if (config.s3_logging_enabled) {
      cfg['logger'] = process.stdout;
    }
    cfg['forcePathStyle'] = config.s3_use_path_style_endpoint;
    this.s3 = new S3(cfg);
  }

  async length(id) {
    const result = await this.s3.headObject({ Bucket: this.bucket, Key: id });
    return Number(result.ContentLength);
  }

  async getStream(id, range) {
    const options = { Bucket: this.bucket, Key: id };
    if (range) {
      options.Range = `bytes=${range.start}-${range.end}`;
    }
    const result = await this.s3.getObject(options);
    return result.Body;
  }

  set(id, file) {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: id,
        Body: file,
      },
    });
    file.on('error', () => upload.abort());
    return upload.done();
  }

  del(id) {
    return this.s3.deleteObject({ Bucket: this.bucket, Key: id });
  }

  ping() {
    return this.s3.headBucket({ Bucket: this.bucket });
  }
}

module.exports = S3Storage;
