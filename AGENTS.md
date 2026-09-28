# API demos

Standalone Ghost API examples; see [README.md](README.md) for usage and
[docs/testing.md](docs/testing.md) for validation details.

- Use the fixture-based test commands for validation. Do not run write, upload,
  rerender or deletion demos against a real site to test code changes.
- Keep credentials synthetic in tests and examples. Never commit real API keys.
- CLI acceptance tests launch the actual scripts in subprocesses. Preserve c8
  coverage collection: in-process Vitest coverage does not measure those scripts.
- Browser tests intercept network requests and compare the demos with independent
  reference pages. Do not derive those references from the implementation under
  test or replace fixture requests with live Ghost/CDN requests.
- When updating browser SDK/helper dependencies, update the HTML CDN URLs and
  browser version assertions together, then run both CLI coverage and browser
  tests. See the README for browser installation commands.
- Preserve explicit `true` confirmation and default dry-run behavior in the
  demos that have them. Other write demos execute immediately.
- Upload arguments resolve relative to the script directory, not the caller's
  working directory.
- Keep the demos usable as standalone examples; do not consolidate them into a
  shared application framework just to simplify tests.
