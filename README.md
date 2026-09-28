<a href="https://ghost.org/docs/api/v3/">API Reference</a> |
<a href="https://ghost.org/docs/api/v3/content/">Content API</a> |
<a href="https://ghost.org/docs/api/v3/admin/">Admin API</a> |
<a href="https://ghost.org/docs/api/v2/javascript/">JavaScript Client Libraries</a> |
<a href="https://ghost.org/docs/api/v3/javascript/sdk/">JavaScript SDK</a>

# API Demos

At its heart, Ghost is a RESTful JSON API — designed to create, manage and retrieve publication content with ease.

Ghost's API is split by function into two parts: Content and Admin. Each has its own authentication methods, structure and extensive tooling so that common publication usecases are solved with minimal effort. Learn more about the Core API [in our docs](https://ghost.org/docs/concepts/core/).

This GitHub repository contains an ever-growing collections of demos, showing how you can achieve common tasks easily using the APIs, Client Libraries and JavaScript SDK.

Each individual file is a demo, with it's own instructions for how to use it at the top of the file. The .js files are node scripts that will work out of the box when called with your API url and key. The .html files are client-side demos that will run against demo.ghost.io when opened in your browser of choice.

## Install

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` (or `npm install`) to install top-level dependencies.

## Usage

See individual scripts for usage

## Development and validation

The demos are tested on Node 20, 22 and 24. Use the latest patch of one of
those majors (the test tooling requires at least Node 20.19 or 22.13).
`.nvmrc` selects the lowest supported major. Keep Yarn Classic for this
repository; install reproducibly with `yarn install --frozen-lockfile`.

```sh
yarn test                       # CLI acceptance tests
yarn test:coverage              # CLI tests plus enforced V8 coverage
yarn playwright install chromium
yarn test:browser               # Browser behaviour and visual regression tests
```

On Linux, use `yarn playwright install --with-deps chromium` to install the
browser's system dependencies too. PR CI runs CLI coverage on all three Node
majors and browser tests once on Node 24. This includes Renovate PRs; main
pushes use the same validation workflow.

The CLI tests launch the actual scripts as Node subprocesses and exercise the
installed SDKs against a loopback HTTP fixture server. They use synthetic
credentials, never a real Ghost site. c8 collects native V8 coverage from those
subprocesses; Vitest's in-process coverage provider would not measure the
scripts launched this way. Every root JavaScript demo is included, including
unexecuted files. Coverage fails the command if line, function or branch
coverage drops below the thresholds in `.c8rc.json`.

The browser tests execute both HTML demos with the installed Content API and
helpers bundles. They intercept all network requests and compare screenshots
with independent, handwritten reference pages rendered in the same browser.
This checks the visible output without platform-specific screenshot baselines.
The HTML CDN URLs are pinned to the tested package versions; update them and
the browser version assertions together when upgrading those packages. The
suite does not test unpkg availability or a live Ghost server.

### Tested boundaries

| Demos | Acceptance coverage |
| --- | --- |
| Read posts, content settings, legacy subscribers | Request options, response handling and errors; subscribers remain a v2 API example |
| Add random posts, add tags, find/replace | Generated payloads, preserved fields and failure status |
| Rerender all/single posts, bulk member deletion | Default dry runs, explicit confirmation, selected resources and collision timestamps |
| Request post images | Image-card filtering, deduplication, all three sizes, dry run and HTTP failures |
| Write HTML/email-card posts, upload files/video | Real SDK JSON/multipart requests and rejected writes |
| JWKS lookup | Real client import, matching public key, missing keys and endpoint errors |
| Read-post and reading-time HTML | Real browser SDK/helper, query options, output, error paths, literal titles and visual comparisons |

These are standalone examples, not an API server or an npm library. There are
no inbound API endpoints or published build artifacts to validate. Fixture
responses test the client-side contracts; they do not prove compatibility with
every historical Ghost server version. Commented-out alternative examples are
not executable paths covered by the suite.

The four editable-key demos (`write-posts.js`, `write-email-card-posts.js`,
`upload-file.js`, `upload-video.js`) also accept `GHOST_API_URL` and
`GHOST_ADMIN_API_KEY` environment variables. These override the inline examples,
so they can be run without editing source. Existing inline configuration still
works. Upload file arguments remain relative to the script directory.

### Remaining maintenance

`yarn lint` is separate from the test commands. Its existing ESLint 10 dependency
and legacy `.eslintrc.js` configuration are incompatible; lint migration is a
separate task and is not presented as a passing CI check. The new test suite
replaces the placeholder Mocha suite and removes its broken `posttest` hook.

Required-check enforcement is configured separately in GitHub settings. A green
workflow alone does not prevent merging without checks. Before relying on
Renovate automerge, require all Node coverage jobs and the browser job (or a
required aggregator), and protect test-tool compatibility with Node 20: Vitest
5 drops that runtime, so upgrades beyond Vitest 4 need a support-policy decision.
No Renovate configuration or repository settings are changed by this CI pass.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
