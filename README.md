# [![Send](./assets/icon-64x64.png)](https://gitlab.com/timvisee/send/) Send

[![Build status on GitLab CI][gitlab-ci-master-badge]][gitlab-ci-link]
[![Latest release][release-badge]][release-link]
[![Docker image][docker-image-badge]][docker-image-link]
[![Project license][repo-license-badge]](LICENSE)

A fork of Mozilla's [Firefox Send][mozilla-send] fork by [send.vis.ee](https://github.com/timvisee/send).
Mozilla discontinued Send, this fork is intended to be used as an internal service for user uploads.

Major changes to the original work:

* FxA authorization is active by default, to deactivate it, please set env variable `FXA_REQUIRED` to `false` (please
notice the behavior in that case wasn't properly tested as we are not going to provide the access to anybody except
our users)
* the `/api/download/token`, `/api/metadata/` endpoints are protected with FxA authorization
* the `DEFAULT_EXPIRE_SECONDS` env variable is set to `0` by default (so the service would keep the uploaded files
forever by default)
* the partial/resumable uploads/downloads are implemented

- Forked [at][fork-commit] Mozilla's last publicly hosted version
- _Mozilla_ & _Firefox_ branding [is][remove-branding-pr] removed so we can legally self-host

The original project by Mozilla can be found [here][mozilla-send].
The [`mozilla-master`][branch-mozilla-master] branch holds the `master` branch
as left by Mozilla.
The [`send-v3`][branch-send-v3] branch holds the commit tree of Mozilla's last
publicly hosted version, which this fork is based on.
The [`send-v4`][branch-send-v4] branch holds the commit tree of Mozilla's last
experimental version which was still a work in progress (featuring file
reporting, download tokens, trust warnings and FxA changes), this has
selectively been merged into this fork.
Please consider to [donate][donate] to allow me to keep working on this.

Thanks [Mozilla][mozilla] for building this amazing tool!

[branch-mozilla-master]: https://gitlab.com/timvisee/send/-/tree/mozilla-master
[branch-send-v3]: https://gitlab.com/timvisee/send/-/tree/send-v3
[branch-send-v4]: https://gitlab.com/timvisee/send/-/tree/send-v4
[donate]: https://timvisee.com/donate
[ffsend]: https://github.com/timvisee/ffsend
[fork-commit]: https://gitlab.com/timvisee/send/-/commit/3e9be676413a6e1baaf6a354c180e91899d10bec
[mozilla-patches-pr]: https://gitlab.com/timvisee/send/-/merge_requests/3
[mozilla-patches]: https://gitlab.com/timvisee/send/-/compare/3e9be676413a6e1baaf6a354c180e91899d10bec...mozilla-master
[mozilla-send]: https://github.com/mozilla/send
[mozilla]: https://mozilla.org/
[remove-branding-pr]: https://gitlab.com/timvisee/send/-/merge_requests/2

---

**Docs:** [FAQ](docs/faq.md), [Encryption](docs/encryption.md), [Build](docs/build.md), [Docker](docs/docker.md), [More](docs/)

---

## Table of Contents

* [What it does](#what-it-does)
* [Requirements](#requirements)
* [Development](#development)
* [Commands](#commands)
* [Configuration](#configuration)
* [Localization](#localization)
* [Contributing](#contributing)
* [Instances](#instances)
* [Deployment](#deployment)
* [Clients](#clients)
* [License](#license)
* [Partial upload](#partial_upload)

---

## What it does

A file sharing experiment which allows you to send encrypted files to other users.

---

## Requirements

- [Node.js 18.x](https://nodejs.org/)
- [Redis server](https://redis.io/) (optional for development)
- [AWS S3](https://aws.amazon.com/s3/) or compatible service (optional)

---

## Development

To start an ephemeral development server, run:

```sh
npm install
npm start
```

Then, browse to http://localhost:8080

---

## Commands

| Command          | Description |
|------------------|-------------|
| `npm run format` | Formats the frontend and server code using **prettier**.
| `npm run lint`   | Lints the CSS and JavaScript code.
| `npm test`       | Runs the suite of mocha tests.
| `npm start`      | Runs the server in development configuration.
| `npm run build`  | Builds the production assets.
| `npm run prod`   | Runs the server in production configuration.
| `npm run docker` | Builds the Docker image

---

## Configuration

The server is configured with environment variables. See [server/config.js](server/config.js) for all options and [docs/docker.md](docs/docker.md) for examples.

---

## Localization

See: [docs/localization.md](docs/localization.md)

---

## Contributing

Pull requests are always welcome! Feel free to check out the list of "good first issues" (to be implemented).

---

## Instances

Find a list of public instances here: https://github.com/timvisee/send-instances/

---

## Deployment

See: [docs/deployment.md](docs/deployment.md)

Docker quickstart: [docs/docker.md](docs/docker.md)

AWS example using Ubuntu Server `20.04`: [docs/AWS.md](docs/AWS.md)

---

## Clients

- Web: _this repository_
- Command-line: [`ffsend`](https://github.com/timvisee/ffsend)
- Android: _see [Android](#android) section_
- Thunderbird: [FileLink provider for Send](https://addons.thunderbird.net/en-US/thunderbird/addon/filelink-provider-for-send/)

#### Android

The android implementation is contained in the `android` directory,
and can be viewed locally for easy testing and editing by running `ANDROID=1 npm
start` and then visiting <http://localhost:8080>. CSS and image files are
located in the `android/app/src/main/assets` directory.

---

## License

[Mozilla Public License Version 2.0](LICENSE)

[qrcode.js](https://github.com/kazuhikoarase/qrcode-generator) licensed under MIT

---

## Resumable upload (plain HTTP)

> Please note that using the plain HTTP API does not mandate encryption, for
> which the client is responsible of. As such, also completely unprotected
> data can be uploaded, but they will not be shareable via the web interface.

The server-side implementation ([Tus protocol](https://tus.io/protocols/resumable-upload.html))
stores incomplete files into a local directory, by default under the temporary
directory, but can be explicitly configured by specifying an absolute local
directory path (best using environment variable `RESUMABLE_FILE_DIR`).

The API to use this is protected with FxA OAuth authentication to avoid
exploitation of this functionality by anonymous clients.

The API flow can be summarized as follows:

1. initiate a resumable upload: `POST /api/upload`
2. upload chunks of data: `PATCH /api/upload/<id>`
3. complete the file upload: `POST /api/upload/<id>/done`

While you also can simply upload a complete file in one request to the
`/api/upload` endpoint, the following criteria must be met to detect a
resumable upload:

* HTTP request header `Upload-Length` must be specified (total file size in
  bytes)
* HTTP request must not have a body payload (HTTP header `Content-Length`
  should be absent as well)

The responses for resumable uploads will have no payload and all required
infromation will be delivered to the client via response status code and
headers.

### Example

Let's upload our `package-lock.json` in multiple chunks or 512 KiB each using
`curl` on the command line.

In order to copy the file into desired chunks, we can use a command like this:

```bash
split -b 512K --additional-suffix=.chunk package-lock.json data.
```

...which will give us the following files (overall size and number of chunks
may differ for you):

```bash
$ ls -1sk data.*.chunk
512 data.aa.chunk
512 data.ab.chunk
508 data.ac.chunk
```

> If your system does not have the `split` command, you should have a similar
> command available or install the [GNU core utilities](https://www.gnu.org/software/coreutils/).

**Initiate resumable upload**:

```bash
curl -v 'http://localhost:1234/api/upload' \
    --header "Authorization: Bearer ${OAUTH_TOKEN}" \
    -X POST \
    --header 'Upload-Length: 1564869'
```

...which will respond with HTTP status `201` (created), a bunch of useful
headers, most noteably `Location`, which contains the actual URL to continue
with uploading the chunks, e.g.:

```
Location: http://localhost:1234/api/upload/d77b41ebfc81e100c2c8f33cd68702b8
```

**Upload data chunks**:

Now that we have our specific endpoint, we can upload our chunks, which will
be done using commands as follows:

```bash
curl -v 'http://localhost:1234/api/upload/d77b41ebfc81e100c2c8f33cd68702b8' \
    --header "Authorization: Bearer ${OAUTH_TOKEN}" \
    -X PATCH \
    --header 'Content-Type: application/offset+octet-stream' \
    --header 'Upload-Offset: 0' \
    --data-binary @data.aa.chunk
```

Please note here, that we need to specify the byte-offset of the chunk we are
uploading, since there is no information in the data chunk itself where it is
located within the complete file.

Also note that if you try to re-upload an already-completed data chunk or
upload a chunk out-of-order (e.g. leaving a chunk out), the service will
respond with a HTTP `409` (conflict). This also means that concurrently
uploading data chunks is not allowed.

A successful chunk upload will respond with a HTTP `204` (no content) and
return the next offset re-using the header `Upload-Offset` in the response,
which would be `524288` for our first chunk, but `1048576` for the second.

When the last chunk has been uploaded, the value of the `Upload-Offset`
response  header will be equal to the file size in bytes and signal a
data-completion of the upload.

**Finalize upload**:

The last remaining step is to finalize the upload, for which we can also
specify additional metadata as for single-request uploads (just append `/done`
to the resumable chunk upload URL):

```bash
curl -v 'http://localhost:1234/api/upload/d77b41ebfc81e100c2c8f33cd68702b8/done' \
    --header "Authorization: Bearer ${OAUTH_TOKEN}" \
    -X POST \
    --header 'Content-Type: application/octet-stream' \
    --header 'X-File-Metadata: eyJmaWxlbmFtZSI6InBhY2thZ2UtbG9jay5qc29uIn0K'
```

...which will respond with a HTTP `200` (OK) and a JSON response as follows:

```json
{
  "url": "http://localhost:1234/api/download/eae1d3af22abfa0b",
  "owner": "e114ec6ec5bf228bf046",
  "id": "eae1d3af22abfa0b"
}
```

## Chunked download (plain HTTP)

In order to support parallel and/or resumable downloads of large files,
the download API endpoint (at `/api/download/...`) also supports the standard
HTTP [`Range`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range)
header.

