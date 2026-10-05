# Admin API demos

Standalone Node examples for reading and changing Ghost posts, tags, members
and files with the [Admin API](https://ghost.org/docs/admin-api/).

## Getting started

Follow the [root installation instructions](../README.md#install), then run
commands from the repository root. Create a custom integration in Ghost Admin
to get your site’s API URL and **Admin API key**.

Most demos take the URL and key as arguments. With those values in your shell
environment, this command previews a rerender without changing any posts:

```sh
node admin-api/force-rerender.js "$GHOST_API_URL" "$GHOST_ADMIN_API_KEY"
```

Admin keys are private. Passing one as an argument makes it visible in process
arguments, even when supplied through a shell variable. Use these examples on
a trusted machine and do not commit real keys.

## Choose a demo

| Demo | What it does |
| --- | --- |
| [Read posts](read-posts.js) | Lists posts with footer code injection but no header injection |
| [Add random posts](add-random-posts.js) | Creates sample posts; defaults to ten |
| [Add a tag](add-tag-to-all-posts.js) | Adds an existing tag to every post |
| [Find and replace](all-posts-find-and-replace.js) | Replaces text in post mobiledoc using the expressions in the script |
| [Write HTML posts](write-posts.js) | Demonstrates creating posts from HTML |
| [Write email cards](write-email-card-posts.js) | Creates a post with content for different member segments |
| [Rerender all](force-rerender.js) | Rerenders all posts and pages |
| [Rerender one](force-rerender-single.js) | Rerenders a post selected by slug |
| [Request post images](request-all-post-images.js) | Requests image sizes used in post content |
| [Delete members](members-bulk-delete.js) | Deletes members in bulk |
| [Upload a file](upload-file.js) | Uploads a local file with an optional reference |
| [Upload a video](upload-video.js) | Uploads a local video and thumbnail |
| [Legacy subscribers](read-legacy-admin-api-endpoint.js) | Reads the older subscribers endpoint through the Admin client |

Read each file’s header and configuration before running it. Some examples use
older API versions or experimental endpoints; they are not a compatibility
reference for every Ghost release.

## Running changes

Rerendering, image requests and member deletion default to a dry run. Add a
literal `true` as the final argument to execute, for example:

```sh
node admin-api/force-rerender-single.js "$GHOST_API_URL" "$GHOST_ADMIN_API_KEY" post-slug true
```

Other write and upload demos act immediately. Use a test site.

`write-posts.js`, `write-email-card-posts.js`, `upload-file.js` and
`upload-video.js` read `GHOST_API_URL` and `GHOST_ADMIN_API_KEY` from the
environment. Set those variables before running them; there is no key argument.

Upload file paths are relative to **this folder**, regardless of your shell’s
working directory. The included fixtures can be used with:

```sh
node admin-api/upload-video.js fixtures/sample_640x360.mp4 fixtures/ghost-logo.png
```

## Related authentication example

[JWKS lookup](verify-through-jwks.js) prints a public signing key from
`/ghost/.well-known/jwks.json`. It needs a site URL and key ID, not an Admin API
key. It is an authentication utility rather than an Admin API request:

```sh
node admin-api/verify-through-jwks.js "$GHOST_API_URL" "$GHOST_KEY_ID"
```

See [testing instructions](../docs/testing.md) to validate changes without a
real site, or browse the [Content API demos](../content-api/README.md).
