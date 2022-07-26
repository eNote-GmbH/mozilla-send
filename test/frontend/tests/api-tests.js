/* global DEFAULTS */
import assert from 'assert';
import Archive from '../../../app/archive';
import * as api from '../../../app/api';
import Keychain from '../../../app/keychain';

const encoder = new TextEncoder();
const plaintext = new Archive([new Blob([encoder.encode('hello world!')])]);
const metadata = {
  name: 'test.txt',
  type: 'text/plain'
};

describe('API', function() {
  describe('websocket upload', function() {
    it('returns file info on success', async function() {
      const keychain = new Keychain();
      const enc = await keychain.encryptStream(plaintext.stream);
      const meta = await keychain.encryptMetadata(metadata);
      const verifierB64 = await keychain.authKeyB64();
      const p = function() {};
      const up = api.uploadWs(
        enc,
        meta,
        verifierB64,
        DEFAULTS.EXPIRE_SECONDS,
        1,
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjEwMTI4LTE1NzkwYWVmIiwidHlwIjoiYXQrSldUIn0.eyJhdWQiOiJodHRwczovL3N5bmMuZGV2LmVub3RlLmNvbSIsImNsaWVudF9pZCI6IjY3MzcyNDI0ZTViOWJkZDciLCJleHAiOjE2NTg0ODMzMTEsImZ4YS1wcm9maWxlQ2hhbmdlZEF0IjoxNjUwNjk1Mzc5MDIwLCJpYXQiOjE2NTg0Nzk3MTEsImlzcyI6Imh0dHBzOi8vYXBpLWFjY291bnRzLmRldi5lbm90ZS5jb20iLCJqdGkiOiI1YWFkMWQ0MTllODE0YmExNmEzYzIxMGQ3ZWEzM2ViNzIwNzEwODJhN2NjOGYxMTQwZDZlYjYyMGFhYmY5MjBmIiwic2NvcGUiOiJwcm9maWxlOndyaXRlIGVtYWlsIGh0dHBzOi8vaWRlbnRpdHkubW96aWxsYS5jb20vYXBwcy9vbGRzeW5jIGVzY29yZSBzZWFyY2ggbWV0YWRhdGEgcXVvdGEgc291cmNlcyBzdWJzY3JpcHRpb25zIiwic3ViIjoiN2FhYTc1NGI2NGQ3NDI1ZWIyNmZjNzE1OTRiZmI5OGUifQ.CpeUNlK79fwgfFU7ZXEWlIrXeyf6Hk0DbrivmQxInKPZpNk89gK-SZQVR9AlfHb7ingnpC6IOOsm9u2XlE2pFPlpveFOLsp4Yu0AvYbVJdWCxrRSShFfUvJI1NKzv1ptkhH8N37t-Xq9VcFKObRS95wDD0ISy1Y_UZOtbNCx-kyvrrlVFgjw-Cpnfu38LKp7LTZpa27jtwPBbeQUVapXWRrPW3_KML84MWvuVKUleM15ad2u-J4lkk1y6LLhpSKRdQ_iV-V18axot1wMh4s1Z8v8dgaQuHZ5N4utLu5HnI3SYyWr8aqQtbAHDpUet4zOcCAUOSqThqMqCsUf7UXgtg',
        p
      );

      const result = await up.result;
      assert.ok(result.url);
      assert.ok(result.id);
      assert.ok(result.ownerToken);
    });

    it('can be cancelled', async function() {
      const keychain = new Keychain();
      const enc = await keychain.encryptStream(plaintext.stream);
      const meta = await keychain.encryptMetadata(metadata);
      const verifierB64 = await keychain.authKeyB64();
      const p = function() {};
      const up = api.uploadWs(
        enc,
        meta,
        verifierB64,
        DEFAULTS.EXPIRE_SECONDS,
        null,
        p
      );

      up.cancel();
      try {
        await up.result;
        assert.fail('not cancelled');
      } catch (e) {
        assert.equal(e.message, '0');
      }
    });
  });
});
