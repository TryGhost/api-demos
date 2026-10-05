# API Demos

Demo scripts showing how to use Ghost's Admin and Content APIs to accomplish
common tasks. These standalone Node scripts and browser examples are for
people building integrations or learning the APIs; this repository is not an
API server or an npm library.

## Choose an API

| Folder | Examples | Credentials |
| --- | --- | --- |
| [Admin API](admin-api/README.md) | Manage posts, tags, members and uploads | Private Admin API key |
| [Content API](content-api/README.md) | Read public settings and display posts in a browser | Public Content API key |

Each folder has a demo index and running instructions. Install dependencies
once at the repository root; the examples share the same tooling.

## Install

Use the Node version selected by [`.nvmrc`](.nvmrc) and the pnpm version pinned in `package.json`.

```sh
git clone https://github.com/TryGhost/api-demos.git
cd api-demos
nvm install
nvm use
corepack enable
pnpm install
```

If you do not use nvm, install the version in `.nvmrc` with your preferred
Node version manager. Renovate keeps it aligned with Ghost’s development runtime.

## Running a demo

Run commands from the repository root, using the folder in the script path:

```sh
node content-api/content-read-settings.js "$GHOST_API_URL" "$GHOST_CONTENT_API_KEY"
```

The file header and folder README describe any additional arguments or setup.
Admin write examples can change site data; use a test site when trying them.

## Development and validation

```sh
pnpm lint                       # JavaScript lint and formatting checks
pnpm test                       # CLI acceptance tests
pnpm test:coverage              # CLI tests plus enforced V8 coverage
pnpm playwright install chromium
pnpm test:browser               # Browser behaviour tests
```

On Linux, use `pnpm playwright install --with-deps chromium` to install browser
system dependencies too. Tests use local fixtures and synthetic credentials.
See [Testing the demos](docs/testing.md) for the tested boundaries, coverage
thresholds, browser assertions, CI gate and lint/format commands.

## Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
