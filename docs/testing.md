# Testing the demos

Run the validation commands in the [README](../README.md). Tests use synthetic
credentials and local fixtures; no Ghost site or real API key is needed.

## CLI and browser coverage

The CLI tests launch the actual scripts as Node subprocesses and exercise the
installed SDKs against a loopback HTTP fixture server. They use synthetic
credentials, never a real Ghost site. c8 collects native V8 coverage from those
subprocesses; Vitest's in-process coverage provider would not measure the
scripts launched this way. Every root JavaScript demo is included, including
unexecuted files. Coverage fails the command if line, function or branch
coverage drops below the thresholds in [`.c8rc.json`](../.c8rc.json): 98% lines,
98% functions and 91% branches. That configuration is the source of truth.

The browser tests execute both HTML demos with the installed Content API and
helpers bundles. They intercept all network requests and assert request options,
rendered text, error handling and safe handling of post titles. These are unstyled
API examples, so pixel-level appearance is not a tested contract; screenshot
comparisons add no useful coverage beyond the behavioural assertions here.
The browser tests compare HTML CDN pins with installed package versions and
serve only matching local bundles. The suite does not test unpkg availability
or a live Ghost server.

### Tested boundaries

| Demos | Acceptance coverage |
| --- | --- |
| Read posts, content settings, legacy subscribers | Request options, response handling and errors; subscribers remain a v2 API example |
| Add random posts, add tags, find/replace | Generated payloads, preserved fields and failure status |
| Rerender all/single posts, bulk member deletion | Default dry runs, explicit confirmation, selected resources and collision timestamps |
| Request post images | Image-card filtering, deduplication, all three sizes, dry run and HTTP failures |
| Write HTML/email-card posts, upload files/video | Real SDK JSON/multipart requests and rejected writes |
| JWKS lookup | Real client import, matching public key, missing keys and endpoint errors |
| Read-post and reading-time HTML | Real browser SDK/helper, query options, output, error paths, literal titles |

These are standalone examples, not an API server or an npm library. There are
no inbound API endpoints or published build artifacts to validate. Fixture
responses test the client-side contracts; they do not prove compatibility with
every historical Ghost server version. Commented-out alternative examples are
not executable paths covered by the suite.

## CI and maintenance

The [test workflow](../.github/workflows/test.yml) runs lint, CLI coverage and browser
tests on the Node version selected by [`.nvmrc`](../.nvmrc), for every PR, including Renovate,
and for pushes to main. The **Required checks pass** job succeeds only when all
its prerequisite jobs succeed. The default-branch ruleset requires this check
and an up-to-date branch before merging, with the standard Ghost Foundation
team bypass.

[Renovate](../renovate.json) uses the shared TryGhost default preset, including
its automerge policy. A custom manager detects unpkg pins in HTML; the shared
preset groups them with the matching npm dependencies. A custom datasource reads
Ghost’s main-branch `.nvmrc` for Node updates instead of following Node releases
independently. CI tests each proposed version before merging.

When changing a demo, extend its acceptance tests at the observable boundary.
Keep the HTML demos' pinned CDN URLs and package.json versions in sync; tests
derive expected versions from installed packages. Assert observable browser
behaviour rather than pixel-level rendering.

`pnpm lint` runs oxlint correctness and suspicious checks plus oxfmt formatting
checks for JavaScript files, and is required by CI alongside both test suites.
Every enabled lint rule is an error; rules that do not apply are off.
`--deny-warnings` also rejects any accidentally introduced warning instead of
hiding it. Use
`pnpm lint:fix` for automatic lint fixes and formatting, or `pnpm format` for
formatting alone. Console output is allowed throughout this repository because
these scripts are examples for exploring the API. HTML demos are excluded from
formatting and remain covered by the browser tests. Test-tool updates must pass all required checks on the
runtime selected by `.nvmrc` before merging.
