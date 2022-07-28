import assert from 'assert';
import Archive from '../../../app/archive';
import FileSender from '../../../app/fileSender';
import FileReceiver from '../../../app/fileReceiver';
import storage from '../../../app/storage';

const correctToken = 'correct_token.correct_token.correct_token';

const headless = /Headless/.test(navigator.userAgent);
// TODO: save on headless doesn't work as it used to since it now
// follows a link instead of fetch. Maybe there's a way to make it
// work? For now always set noSave.
const options = { noSave: true || !headless, stream: true, storage }; // only run the saveFile code if headless

// FileSender uses a File in real life but a Blob works for testing
const blob = new Blob([new ArrayBuffer(1024 * 128)], { type: 'text/plain' });
blob.name = 'test.txt';
const archive = new Archive([blob]);
navigator.serviceWorker.register('/serviceWorker.js');

describe('Upload / Download flow', function() {
  this.timeout(0);
  it('can download', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    await fr.download(options);
  });

  it('downloads with the correct password', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    await file.setPassword('magic');
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        url: file.url,
        nonce: file.keychain.nonce,
        requiresPassword: true,
        password: 'magic'
      },
      correctToken
    );
    await fr.getMetadata();
    await fr.download(options);
    assert.equal(fr.state, 'complete');
  });

  it('retries a bad nonce', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: null, // oops
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    assert.equal(fr.fileInfo.name, archive.name);
  });

  it('can cancel the upload', async function() {
    const fs = new FileSender();
    const up = fs.upload(archive, correctToken);
    fs.cancel(); // before encrypting
    try {
      await up;
      assert.fail('not cancelled 1');
    } catch (e) {
      assert.equal(e.message, '0');
    }
    fs.reset();
    fs.once('encrypting', () => fs.cancel());
    try {
      await fs.upload(archive, correctToken);
      assert.fail('not cancelled 2');
    } catch (e) {
      assert.equal(e.message, '0');
    }
    fs.reset();
    fs.once('progress', () => fs.cancel());
    try {
      await fs.upload(archive, correctToken);
      assert.fail('not cancelled 3');
    } catch (e) {
      assert.equal(e.message, '0');
    }
  });

  it('can cancel the download', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    fr.once('progress', () => fr.cancel());
    try {
      await fr.download(options);
      assert.fail('not cancelled');
    } catch (e) {
      assert.equal(e.message, '0');
    }
  });

  it('can increase download count on download', async function() {
    this.timeout(0);
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    await fr.download(options);
    await file.updateDownloadCount();
    assert.equal(file.dtotal, 1);
  });

  it('does not increase download count when download cancelled', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    fr.once('progress', () => fr.cancel());

    try {
      await fr.download(options);
      assert.fail('not cancelled');
    } catch (e) {
      await file.updateDownloadCount();
      assert.equal(file.dtotal, 0);
    }
  });

  it('can allow multiple downloads', async function() {
    const fs = new FileSender();
    const a = new Archive([blob]);
    a.dlimit = 2;
    const file = await fs.upload(a, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await fr.getMetadata();
    await fr.download(options);
    await file.updateDownloadCount();
    assert.equal(file.dtotal, 1);

    await fr.download(options);
    await file.updateDownloadCount();
    assert.equal(file.dtotal, 2);
    try {
      await fr.download(options);
      assert.fail('downloaded too many times');
    } catch (e) {
      assert.equal(e.message, '404');
    }
  });

  it('can delete the file before download', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive, correctToken);
    const fr = new FileReceiver(
      {
        secretKey: file.toJSON().secretKey,
        id: file.id,
        nonce: file.keychain.nonce,
        requiresPassword: false
      },
      correctToken
    );
    await file.del();
    try {
      await fr.getMetadata();
      assert.fail('file still exists');
    } catch (e) {
      assert.equal(e.message, '404');
    }
  });
});
