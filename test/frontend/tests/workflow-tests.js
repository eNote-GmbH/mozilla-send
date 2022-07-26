//import assert from 'assert';
//import Archive from '../../../app/archive';
//import FileSender from '../../../app/fileSender';
//import FileReceiver from '../../../app/fileReceiver';
//import storage from '../../../app/storage';

//const headless = /Headless/.test(navigator.userAgent);
// TODO: save on headless doesn't work as it used to since it now
// follows a link instead of fetch. Maybe there's a way to make it
// work? For now always set noSave.
//const options = { noSave: true || !headless, stream: true, storage }; // only run the saveFile code if headless

// FileSender uses a File in real life but a Blob works for testing
const blob = new Blob([new ArrayBuffer(1024 * 128)], { type: 'text/plain' });
blob.name = 'test.txt';
//const archive = new Archive([blob]);
navigator.serviceWorker.register('/serviceWorker.js');

describe('Upload / Download flow', function() {
  this.timeout(0);
  /*
  it('can only download once by default', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
    await fr.getMetadata();
    await fr.download(options);

    try {
      await fr.download(options);
      assert.fail('downloaded again');
    } catch (e) {
      assert.equal(e.message, '404');
    }
  });
   */

  /*
  it('downloads with the correct password', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    await file.setPassword('magic');
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      url: file.url,
      nonce: file.keychain.nonce,
      requiresPassword: true,
      password: 'magic'
    });
    await fr.getMetadata();
    await fr.download(options);
    assert.equal(fr.state, 'complete');
  });
   */

  /*
  it('blocks invalid passwords from downloading', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    await file.setPassword('magic');
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      url: file.url,
      nonce: file.keychain.nonce,
      requiresPassword: true,
      password: 'password'
    });
    try {
      await fr.getMetadata();
      assert.fail('got metadata with bad password');
    } catch (e) {
      assert.equal(e.message, '401');
    }
    try {
      // We can't decrypt without IV from metadata
      // but let's try to download anyway
      await fr.download(options);
      assert.fail('downloaded file with bad password');
    } catch (e) {
      assert.equal(e.message, '401');
    }
  });
   */

  /*
  it('retries a bad nonce', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: null, // oops
      requiresPassword: false
    });
    await fr.getMetadata();
    assert.equal(fr.fileInfo.name, archive.name);
  });
   */

  /*
  it('can cancel the upload', async function() {
    const fs = new FileSender();
    const up = fs.upload(archive);
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
      await fs.upload(archive);
      assert.fail('not cancelled 2');
    } catch (e) {
      assert.equal(e.message, '0');
    }
    fs.reset();
    fs.once('progress', () => fs.cancel());
    try {
      await fs.upload(archive);
      assert.fail('not cancelled 3');
    } catch (e) {
      assert.equal(e.message, '0');
    }
  });
   */

  /*
  it('can cancel the download', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
    await fr.getMetadata();
    fr.once('progress', () => fr.cancel());
    try {
      await fr.download(options);
      assert.fail('not cancelled');
    } catch (e) {
      assert.equal(e.message, '0');
    }
  });
   */

  /*
  it('can increase download count on download', async function() {
    this.timeout(0);
    const fs = new FileSender();
    const file = await fs.upload(archive);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
    await fr.getMetadata();
    await fr.download(options);
    await file.updateDownloadCount();
    assert.equal(file.dtotal, 1);
  });
   */

  /*
  it('does not increase download count when download cancelled', async function() {
    const fs = new FileSender();
    const file = await fs.upload(archive);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
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
   */

  /*
  it('can allow multiple downloads', async function() {
    const fs = new FileSender();
    const a = new Archive([blob]);
    a.dlimit = 2;
    const file = await fs.upload(a);
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
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
   */

  /*
  it('can delete the file before download', async function() {
    const fs = new FileSender();
    const file = await fs.upload(
      archive,
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjEwMTI4LTE1NzkwYWVmIiwidHlwIjoiYXQrSldUIn0.eyJhdWQiOiJodHRwczovL3N5bmMuZGV2LmVub3RlLmNvbSIsImNsaWVudF9pZCI6IjY3MzcyNDI0ZTViOWJkZDciLCJleHAiOjE2NTg0ODMzMTEsImZ4YS1wcm9maWxlQ2hhbmdlZEF0IjoxNjUwNjk1Mzc5MDIwLCJpYXQiOjE2NTg0Nzk3MTEsImlzcyI6Imh0dHBzOi8vYXBpLWFjY291bnRzLmRldi5lbm90ZS5jb20iLCJqdGkiOiI1YWFkMWQ0MTllODE0YmExNmEzYzIxMGQ3ZWEzM2ViNzIwNzEwODJhN2NjOGYxMTQwZDZlYjYyMGFhYmY5MjBmIiwic2NvcGUiOiJwcm9maWxlOndyaXRlIGVtYWlsIGh0dHBzOi8vaWRlbnRpdHkubW96aWxsYS5jb20vYXBwcy9vbGRzeW5jIGVzY29yZSBzZWFyY2ggbWV0YWRhdGEgcXVvdGEgc291cmNlcyBzdWJzY3JpcHRpb25zIiwic3ViIjoiN2FhYTc1NGI2NGQ3NDI1ZWIyNmZjNzE1OTRiZmI5OGUifQ.CpeUNlK79fwgfFU7ZXEWlIrXeyf6Hk0DbrivmQxInKPZpNk89gK-SZQVR9AlfHb7ingnpC6IOOsm9u2XlE2pFPlpveFOLsp4Yu0AvYbVJdWCxrRSShFfUvJI1NKzv1ptkhH8N37t-Xq9VcFKObRS95wDD0ISy1Y_UZOtbNCx-kyvrrlVFgjw-Cpnfu38LKp7LTZpa27jtwPBbeQUVapXWRrPW3_KML84MWvuVKUleM15ad2u-J4lkk1y6LLhpSKRdQ_iV-V18axot1wMh4s1Z8v8dgaQuHZ5N4utLu5HnI3SYyWr8aqQtbAHDpUet4zOcCAUOSqThqMqCsUf7UXgtg'
    );
    const fr = new FileReceiver({
      secretKey: file.toJSON().secretKey,
      id: file.id,
      nonce: file.keychain.nonce,
      requiresPassword: false
    });
    await file.del();
    try {
      await fr.getMetadata();
      assert.fail('file still exists');
    } catch (e) {
      assert.equal(e.message, '404');
    }
  });
   */
});
