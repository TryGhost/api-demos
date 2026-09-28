<a href="https://ghost.org/docs/api/v3/">API Reference</a> |
<a href="https://ghost.org/docs/api/v3/content/">Content API</a> |
<a href="https://ghost.org/docs/api/v3/admin/">Admin API</a> |
<a href="https://ghost.org/docs/api/v2/javascript/">JavaScript Client Libraries</a> |
<a href="https://ghost.org/docs/api/v3/javascript/sdk/">JavaScript SDK</a>

# API Demos

Demo scripts showing how to use Ghost's Admin and Content APIs to accomplish
common tasks. These standalone Node scripts and browser examples are for
people building integrations or learning the APIs; this repository is not an
API server or an npm library.

Ghost's API is split into Content and Admin, each with its own authentication
and tooling. Learn more about the Core API [in our docs](https://ghost.org/docs/concepts/core/).

## Install

Use the Node version selected by [`.nvmrc`](.nvmrc) and Yarn Classic.

```sh
git clone https://github.com/TryGhost/api-demos.git
cd api-demos
nvm install
nvm use
yarn install --frozen-lockfile
```

If you do not use nvm, install the latest patch of the major in `.nvmrc` with
your preferred Node version manager. The [CI workflow](.github/workflows/test.yml)
lists the other tested runtimes.

## Usage

Each demo has usage instructions at the top of its file. Choose the task and
read those instructions before running it:

| Task | Demos |
| --- | --- |
| Read posts and settings | [Read posts](read-posts.js), [Content settings](content-read-settings.js), [Legacy subscribers](read-legacy-admin-api-endpoint.js) |
| Create and update posts | [Random posts](add-random-posts.js), [Add a tag](add-tag-to-all-posts.js), [Find and replace](all-posts-find-and-replace.js), [Write HTML](write-posts.js), [Email cards](write-email-card-posts.js) |
| Rerender content | [All posts](force-rerender.js), [One post](force-rerender-single.js), [Request images](request-all-post-images.js) |
| Manage members and files | [Bulk member deletion](members-bulk-delete.js), [Upload a file](upload-file.js), [Upload video](upload-video.js) |
| Look up a signing key | [JWKS lookup](verify-through-jwks.js) |
| Display content in a browser | [Read a post](read-post.html), [Custom reading time](custom-reading-time.html) |

Most Node demos take the site URL and an API key as positional arguments; the
header specifies whether a Content or Admin key is required. Rerendering,
image requests and bulk member deletion default to a dry run. For example,
with your own environment variables set:

```sh
node force-rerender.js "$GHOST_API_URL" "$GHOST_ADMIN_API_KEY"
```

Those demos require an extra literal `true` argument to execute. Other write
and upload demos act immediately; inspect their configuration and use a test
site when trying them.

`write-posts.js`, `write-email-card-posts.js`, `upload-file.js` and
`upload-video.js` accept `GHOST_API_URL` and `GHOST_ADMIN_API_KEY` from the
environment, overriding their inline examples. Upload paths are relative to
the script directory. Do not commit real keys into example code.

Open either HTML demo in a browser to use its configured public demo site.
The legacy subscribers example explicitly targets an older API; local tests do
not establish compatibility with every Ghost server version.

## Development and validation

```sh
yarn test                       # CLI acceptance tests
yarn test:coverage              # CLI tests plus enforced V8 coverage
yarn playwright install chromium
yarn test:browser               # Browser behaviour and visual regression tests
```

On Linux, use `yarn playwright install --with-deps chromium` to install browser
system dependencies too. Tests use local fixtures and synthetic credentials.
See [Testing the demos](docs/testing.md) for the tested boundaries, coverage
thresholds, browser reference pages, CI gate and remaining lint limitation.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
