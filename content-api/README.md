# Content API demos

Examples for reading public Ghost content with the
[Content API](https://ghost.org/docs/content-api/), from Node or a browser.
Content API keys provide read-only access to public data and can be used in
browser code. They are different from private Admin API keys.

## Getting started

Follow the [root installation instructions](../README.md#install). Run Node
commands from the repository root. For your own site, create a custom
integration in Ghost Admin and use its API URL and **Content API key**.

## Choose a demo

| Demo | What it does | Run it |
| --- | --- | --- |
| [Read settings](content-read-settings.js) | Prints public site settings | Node command below |
| [Read a post](read-post.html) | Fetches a post by slug and displays its JSON | Open the HTML file in a browser |
| [Custom reading time](custom-reading-time.html) | Calculates reading times after trimming post content | Open the HTML file in a browser |

With your site URL and Content key set in your shell environment:

```sh
node content-api/content-read-settings.js "$GHOST_API_URL" "$GHOST_CONTENT_API_KEY"
```

## Browser examples

Both HTML files are standalone pages configured for the public demo site.
Open them directly in your browser; no local server or build is required.
They load the SDK and helpers from unpkg, so they need an internet connection.

To use your own site, edit the URL and Content key in the file. The single-post
examples also need a slug that exists on that site. Keep an Admin key out of
browser code.

The CDN versions are pinned and updated by Renovate alongside the installed
packages. [Browser tests](../docs/testing.md) use local bundles and fixture
responses to check requests, output and error handling without a live site.

To create or change content, use the [Admin API demos](../admin-api/README.md).
