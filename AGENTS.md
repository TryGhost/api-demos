# API demos

Standalone Ghost API examples; see [README.md](README.md) for usage and
[docs/testing.md](docs/testing.md) for validation details.

- Use the fixture-based test commands for validation. Do not run write, upload,
  rerender or deletion demos against a real site to test code changes.
- Keep credentials synthetic in tests and examples. Never commit real API keys.
- CLI acceptance tests launch the actual scripts in subprocesses. Preserve c8
  coverage collection: in-process Vitest coverage does not measure those scripts.
- Browser tests intercept network requests and assert API calls, rendered text,
  error handling and safe title rendering. Do not replace fixture requests with
  live Ghost/CDN requests. These unstyled API examples do not need pixel snapshots.
- When updating browser SDK/helper dependencies, keep package.json and the HTML
  CDN URLs in sync. Renovate groups these updates; browser tests derive their expected
  versions from the installed packages. Run CLI coverage and browser tests.
  See the README for browser installation commands.
- Preserve explicit `true` confirmation and default dry-run behavior in the
  demos that have them. Other write demos execute immediately.
- Upload arguments resolve relative to the script directory, not the caller's
  working directory.
- Keep the demos usable as standalone examples; do not consolidate them into a
  shared application framework just to simplify tests.
