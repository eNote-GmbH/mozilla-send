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

- [Node.js 16.x](https://nodejs.org/)
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

## Partial upload

The tests are not (yet?) properly implemented, so here's the example for the partial file upload.

Please, note that the example is supposed to be run inside the [send-docker-compose](https://github.com/eNote-GmbH/send-docker-compose) folder while service is running.

Let's imagine we are going to upload the `docker-compose.yaml` file.

First, let's split the file into two parts (the size of a part would be 750 bytes):

```
split -b 750 docker-compose.yaml partial_file
```
The next step is to create the endpoint for the file upload:

```bash
curl -X POST -i 'http://localhost:1234/files/' -H 'Tus-Resumable: 1.0.0' -H 'Upload-Length: 1495' -H 'Authorization: Bearer correct_token.correct_token.correct_token'
```

The result would be

```
HTTP/1.1 201 Created
...
Tus-Resumable: 1.0.0
Access-Control-Expose-Headers: Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With
Location: //localhost:1234/files/49fa07eb359a76416c6825f91c3c7c26
Content-Length: 0
...
```

Please, note the `Location` header, we will use this endpoint for further operations

Let's upload the first part of the file (please note the endpoint and the name of the file)

```bash
curl -X PATCH -H 'Tus-Resumable: 1.0.0' -H 'Upload-Offset: 0' -H 'Content-Type: application/offset+octet-stream' -H 'Authorization: Bearer correct_token.correct_token.correct_token' -T partial_fileaa -i 'http://localhost:1234/files/49fa07eb359a76416c6825f91c3c7c26'
```

The response

```
HTTP/1.1 100 Continue

HTTP/1.1 204 No Content
...
Tus-Resumable: 1.0.0
Access-Control-Expose-Headers: Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With
Upload-Offset: 750
...
```

We can check the current state of the file

```bash
curl -X HEAD -H 'Tus-Resumable: 1.0.0' -H 'Authorization: Bearer correct_token.correct_token.correct_token' -I 'http://localhost:1234/files/49fa07eb359a76416c6825f91c3c7c26'
```

The response

```
HTTP/1.1 200 OK
...
Upload-Offset: 750
Upload-Length: 1495
...
```

Let's upload the second part:

```bash
curl -X PATCH -H 'Tus-Resumable: 1.0.0' -H 'Upload-Offset: 750' -H 'Content-Type: application/offset+octet-stream' -H 'Authorization: Bearer correct_token.correct_token.correct_token' -T partial_fileab -i 'http://localhost:1234/files/49fa07eb359a76416c6825f91c3c7c26'
```

The response

```
HTTP/1.1 100 Continue

HTTP/1.1 204 No Content
...
Tus-Resumable: 1.0.0
Access-Control-Expose-Headers: Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With
Upload-Offset: 1495
...
```

And finally put the file to the storage:

```bash
curl -X POST -H 'X-File-Metadata: mwSjvpb1OdHVAFwJGnorKpxaAghiWKAJIOETO4vqUa2lCpR0oPpj3d9XqctrYBZf_0lgUguRdYjvpgpcOyE8gw' -H 'Authorization: Bearer correct_token.correct_token.correct_token' -H 'Content-Type: application/octet-stream' -i 'http://localhost:1234/api/upload/done/49fa07eb359a76416c6825f91c3c7c26'
```

The response

```
HTTP/1.1 200 OK
...
WWW-Authenticate: send-v1 ZkDjEJDWP2FDLTszl+BGEA==
Content-Type: application/json; charset=utf-8
Content-Length: 113
ETag: W/"71-VlrXKB07UXkePjLjcoa+P8ecgro"
...
{"url":"http://localhost:1234/download/f52169e2a822287d/","owner":"cb7cd6130108ab70b596","id":"f52169e2a822287d"}
```

If the file is small enough, it can be uploaded in one part

```
curl -X POST -i 'http://localhost:1234/files/' -H 'Tus-Resumable: 1.0.0' -H 'Upload-Length: 12345678' -H 'Authorization: Bearer correct_token.correct_token.correct_token'

curl -X PATCH -H 'Tus-Resumable: 1.0.0' -H 'Upload-Offset: 0' -H 'Content-Type: application/offset+octet-stream' -H 'Authorization: Bearer correct_token.correct_token.correct_token' --upload-file ./docker-compose.yaml -i 'http://localhost:1234/files/b5fd3212cefdef45a716ac5c14e4efe2'

curl -X POST -H 'X-File-Metadata: mwSjvpb1OdHVAFwJGnorKpxaAghiWKAJIOETO4vqUa2lCpR0oPpj3d9XqctrYBZf_0lgUguRdYjvpgpcOyE8gw' -H 'Authorization: Bearer correct_token.correct_token.correct_token' -H 'Content-Type: application/octet-stream' -i 'http://localhost:1234/api/upload/done/b5fd3212cefdef45a716ac5c14e4efe2'
```

---
