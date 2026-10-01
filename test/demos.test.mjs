import { afterEach, describe, expect, test } from 'vitest';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { adminKey, apiFailure, fixtureApi, root, runDemo } from './helpers/api.mjs';

const servers = [];
async function serve(handler) {
    const api = await fixtureApi(handler);
    servers.push(api);
    return api;
}
afterEach(async () => {
    for (const api of servers.splice(0)) {
        await api.close();
        expect(api.errors).toEqual([]);
    }
});
const post = {
    id: 'post-1',
    slug: 'first-post',
    title: 'Fixture post',
    updated_at: '2026-01-01T00:00:00.000Z',
    tags: [{ id: 'existing-tag' }],
    uuid: 'uuid-1',
    comment_id: 'comment-1',
    mobiledoc: JSON.stringify({ cards: [['html', { html: '<p>github GITHUB GitHub</p>' }]] }),
};
const cliDemos = [
    'add-random-posts.js',
    'add-tag-to-all-posts.js',
    'all-posts-find-and-replace.js',
    'content-read-settings.js',
    'force-rerender-single.js',
    'force-rerender.js',
    'members-bulk-delete.js',
    'read-legacy-admin-api-endpoint.js',
    'read-posts.js',
    'request-all-post-images.js',
];
const configuredDemos = [
    'write-posts.js',
    'write-email-card-posts.js',
    'upload-file.js',
    'upload-video.js',
];
const options = (file) =>
    file === 'upload-file.js'
        ? ['fixtures/ghost-logo.png', 'fixture-ref']
        : file === 'upload-video.js'
          ? ['fixtures/sample_640x360.mp4', 'fixtures/ghost-logo.png']
          : [];

// Keep newly added demos visible rather than silently omitting them from the suite.
test('the acceptance inventory covers every standalone Node demo', () => {
    expect(
        readdirSync(root)
            .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
            .sort(),
    ).toEqual([...cliDemos, ...configuredDemos, 'verify-through-jwks.js'].sort());
});

test.each(cliDemos)('%s rejects missing required arguments', async (file) => {
    const result = await runDemo(file);
    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/argument/i);
});

test('single rerender requires a slug', async () => {
    const result = await runDemo('force-rerender-single.js', ['http://127.0.0.1:1', adminKey]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('post slug');
});

test.each(cliDemos)('%s reports API failures as a failing command', async (file) => {
    const api = await serve(() => apiFailure);
    const args = [api.url, file === 'content-read-settings.js' ? 'c'.repeat(26) : adminKey];
    if (file === 'add-random-posts.js') args.push('1');
    if (file === 'add-tag-to-all-posts.js' || file === 'force-rerender-single.js')
        args.push('fixture-slug');
    const result = await runDemo(file, args);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Fixture resource missing');
    if (file === 'members-bulk-delete.js')
        expect(result.stdout).toContain('is members actually enabled?');
});

test('content settings uses the real Content SDK and prints the response', async () => {
    const api = await serve(() => ({ settings: { title: 'Fixture publication' } }));
    const result = await runDemo('content-read-settings.js', [api.url, 'c'.repeat(26)]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('Fixture publication');
    expect(api.requests).toHaveLength(1);
    expect(api.requests[0].url.pathname).toMatch(/\/content\/settings\/$/);
    expect(api.requests[0].url.searchParams.get('key')).toBe('c'.repeat(26));
});

test('read-posts selects only posts with foot injection and no head injection', async () => {
    const api = await serve(() => ({
        posts: [
            { ...post, id: 'match', codeinjection_head: null, codeinjection_foot: 'footer-code' },
            { ...post, id: 'no-footer', codeinjection_head: null, codeinjection_foot: null },
            { ...post, id: 'has-head', codeinjection_head: 'head', codeinjection_foot: 'foot' },
        ],
    }));
    const result = await runDemo('read-posts.js', [api.url, adminKey]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('match Fixture post null footer-code');
    expect(result.stdout).not.toContain('no-footer');
    expect(result.stdout).not.toContain('has-head');
    expect(api.requests[0].url.searchParams.get('limit')).toBe('all');
    expect(api.requests[0].headers.authorization).toMatch(/^Ghost [\w.-]+$/);
});

test.each([undefined, 'v2.1'])(
    'legacy subscriber read uses requested version %s',
    async (version) => {
        const api = await serve(() => ({ subscribers: [{ email: 'subscriber@example.test' }] }));
        const result = await runDemo('read-legacy-admin-api-endpoint.js', [
            api.url,
            adminKey,
            ...(version ? [version] : []),
        ]);
        expect(result.code, result.stderr).toBe(0);
        expect(result.stdout).toContain('subscriber@example.test');
        expect(api.requests[0].url.pathname).toMatch(/\/subscribers\/$/);
        expect(api.requests[0].headers['accept-version']).toBe(version || 'v2.0');
    },
);

test.each([
    ['2', 2],
    [undefined, 10],
])('adds %s posts, with a working default count', async (count, expected) => {
    const api = await serve((request) => ({
        posts: [{ id: 'created', ...request.body.posts[0] }],
    }));
    const result = await runDemo('add-random-posts.js', [
        api.url,
        adminKey,
        ...(count ? [count] : []),
    ]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(`Added ${expected} posts`);
    expect(api.requests).toHaveLength(expected);
    for (const req of api.requests) {
        expect(req.method).toBe('POST');
        expect(req.url.searchParams.get('source')).toBe('html');
        expect(req.body.posts[0]).toMatchObject({
            status: 'published',
            title: expect.any(String),
            html: expect.stringContaining('<p>'),
        });
        expect(req.body.posts[0].title.length).toBeGreaterThan(0);
    }
});

test('tagging preserves existing tags and collision timestamp, strips read-only fields', async () => {
    const api = await serve((req) => {
        if (req.url.pathname.includes('/tags/'))
            return { tags: [{ id: 'new-tag', slug: 'new-tag' }] };
        if (req.method === 'GET') return { posts: [post, { ...post, id: 'post-2' }] };
        return { posts: req.body.posts };
    });
    const result = await runDemo('add-tag-to-all-posts.js', [api.url, adminKey, 'new-tag']);
    expect(result.code, result.stderr).toBe(0);
    expect(api.requests[0].url.pathname).toMatch(/\/tags\/slug\/new-tag\/$/);
    const writes = api.requests.filter((req) => req.method === 'PUT');
    expect(writes).toHaveLength(2);
    for (const req of writes) {
        expect(req.body.posts[0]).toMatchObject({
            tags: [{ id: 'existing-tag' }, { id: 'new-tag', slug: 'new-tag' }],
            updated_at: post.updated_at,
        });
        expect(req.body.posts[0]).not.toHaveProperty('uuid');
        expect(req.body.posts[0]).not.toHaveProperty('comment_id');
    }
});

test('find-and-replace edits mobiledoc case-insensitively without losing other fields', async () => {
    const api = await serve((req) =>
        req.method === 'GET' ? { posts: [post] } : { posts: req.body.posts },
    );
    const result = await runDemo('all-posts-find-and-replace.js', [api.url, adminKey]);
    expect(result.code, result.stderr).toBe(0);
    const { id, ...data } = post;
    expect(api.requests[1].url.pathname).toContain(`/posts/${id}/`);
    expect(api.requests[1].body.posts[0]).toEqual({
        ...data,
        mobiledoc: post.mobiledoc.replace(/github/gi, 'GitHub'),
    });
});

describe('destructive demos require explicit confirmation', () => {
    test.each([undefined, 'false', 'true'])(
        'rerender all posts/pages confirmation=%s',
        async (confirm) => {
            const api = await serve((req) => {
                const resource = req.url.pathname.includes('/pages/') ? 'pages' : 'posts';
                return { [resource]: req.method === 'GET' ? [post] : req.body[resource] };
            });
            const result = await runDemo('force-rerender.js', [
                api.url,
                adminKey,
                ...(confirm ? [confirm] : []),
            ]);
            expect(result.code, result.stderr).toBe(0);
            const writes = api.requests.filter((req) => req.method === 'PUT');
            expect(writes).toHaveLength(confirm === 'true' ? 2 : 0);
            for (const req of writes) {
                expect(req.url.searchParams.get('force_rerender')).toBe('true');
                expect(Object.values(req.body)[0]).toEqual([{ updated_at: post.updated_at }]);
            }
        },
    );

    test.each([undefined, 'true'])('rerender one post confirmation=%s', async (confirm) => {
        const api = await serve((req) => ({
            posts: req.method === 'GET' ? [post] : req.body.posts,
        }));
        const result = await runDemo('force-rerender-single.js', [
            api.url,
            adminKey,
            post.slug,
            ...(confirm ? [confirm] : []),
        ]);
        expect(result.code, result.stderr).toBe(0);
        expect(api.requests[0].url.pathname).toContain(`/slug/${post.slug}/`);
        expect(api.requests.filter((req) => req.method === 'PUT')).toHaveLength(
            confirm === 'true' ? 1 : 0,
        );
        if (confirm) {
            expect(api.requests[1].body.posts).toEqual([{ updated_at: post.updated_at }]);
            expect(api.requests[1].url.searchParams.get('force_rerender')).toBe('true');
        }
    });

    test.each([undefined, 'false', 'true'])('member deletion confirmation=%s', async (confirm) => {
        const members = [
            {
                id: 'free',
                email: 'free@example.test',
                comped: false,
                stripe: { subscriptions: [] },
            },
            {
                id: 'paid',
                email: 'paid@example.test',
                comped: false,
                stripe: { subscriptions: [{ id: 'subscription' }] },
            },
            {
                id: 'comped',
                email: 'comped@example.test',
                comped: true,
                stripe: { subscriptions: [] },
            },
        ];
        const api = await serve((req) => (req.method === 'DELETE' ? { status: 204 } : { members }));
        const result = await runDemo('members-bulk-delete.js', [
            api.url,
            adminKey,
            ...(confirm ? [confirm] : []),
        ]);
        expect(result.code, result.stderr).toBe(0);
        expect(result.stdout).toContain('1 Members will be deleted out of 3');
        expect(result.stdout + result.stderr).not.toContain(adminKey);
        const deletes = api.requests.filter((req) => req.method === 'DELETE');
        expect(deletes).toHaveLength(confirm === 'true' ? 1 : 0);
        if (confirm === 'true') expect(deletes[0].url.pathname).toMatch(/\/members\/free\/$/);
    });
});

test.each(configuredDemos)('%s exercises its real client and payload', async (file) => {
    const api = await serve((req) => {
        if (file === 'upload-file.js')
            return { files: [{ url: 'https://example.test/file', ref: 'fixture-ref' }] };
        if (file === 'upload-video.js') return { media: [{ url: 'https://example.test/video' }] };
        return { posts: [{ id: 'created', ...req.body.posts[0] }] };
    });
    const result = await runDemo(file, options(file), {
        GHOST_API_URL: api.url,
        GHOST_ADMIN_API_KEY: adminKey,
    });
    expect(result.code, result.stderr).toBe(0);
    expect(api.requests).toHaveLength(1);
    const req = api.requests[0];
    expect(req.method).toBe('POST');
    expect(req.headers.authorization).toMatch(/^Ghost /);
    if (file === 'write-posts.js') {
        expect(req.url.searchParams.get('source')).toBe('html');
        expect(req.body.posts[0].html).toContain('<p>Migrations between platforms');
    } else if (file === 'write-email-card-posts.js') {
        const doc = JSON.parse(req.body.posts[0].mobiledoc);
        expect(doc.cards.map((card) => card[1].segment)).toEqual(['status:-free', 'status:free']);
        expect(doc.sections).toContainEqual([10, 1]);
    } else {
        expect(req.headers['content-type']).toContain('multipart/form-data');
        expect(req.raw).toContain('filename="ghost-logo.png"');
        if (file === 'upload-file.js') {
            expect(req.url.pathname).toMatch(/\/files\/upload\/$/);
            expect(req.raw).toContain('fixture-ref');
        } else {
            expect(req.url.pathname).toMatch(/\/media\/upload\/$/);
            expect(req.raw).toContain('filename="sample_640x360.mp4"');
        }
    }
});

test.each(configuredDemos)('%s fails on a rejected write or upload', async (file) => {
    const api = await serve(() => apiFailure);
    const result = await runDemo(file, options(file), {
        GHOST_API_URL: api.url,
        GHOST_ADMIN_API_KEY: adminKey,
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Fixture resource missing');
});

test.each([false, true])(
    'image versions preserve the final image and deduplicate (live=%s)',
    async (live) => {
        const api = await serve((req) => {
            if (!req.url.pathname.includes('/posts/')) return { status: 200, body: {} };
            const cards = [
                ['image', { src: `${api.url}/content/images/one.png` }],
                ['image', { src: `${api.url}/content/images/two.png` }],
                ['image', { src: `${api.url}/content/images/one.png` }],
            ];
            return { posts: [{ ...post, mobiledoc: JSON.stringify({ cards }) }] };
        });
        const result = await runDemo('request-all-post-images.js', [
            api.url,
            adminKey,
            ...(live ? ['true'] : []),
        ]);
        expect(result.code, result.stderr).toBe(0);
        expect(result.stdout).toContain('Found 2 images that amount to 6 versions');
        const images = api.requests.filter((req) => req.url.pathname.includes('/content/images/'));
        expect(images.map((req) => req.url.pathname).sort()).toEqual(
            live
                ? ['one', 'two']
                      .flatMap((name) =>
                          [600, 1000, 1600].map(
                              (size) => `/content/images/size/w${size}/${name}.png`,
                          ),
                      )
                      .sort()
                : [],
        );
    },
);

test('image requests ignore non-image and missing sources', async () => {
    const api = await serve(() => ({
        posts: [
            {
                ...post,
                mobiledoc: JSON.stringify({
                    cards: [
                        ['html', { html: 'text', src: 'not-an-image' }],
                        ['image', {}],
                        ['image', { src: '' }],
                    ],
                }),
            },
        ],
    }));
    const result = await runDemo('request-all-post-images.js', [api.url, adminKey, 'true']);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('Found 0 images');
    expect(api.requests).toHaveLength(1);
});

test('image HTTP failures produce a failed command', async () => {
    const api = await serve((req) =>
        req.url.pathname.includes('/posts/')
            ? {
                  posts: [
                      {
                          ...post,
                          mobiledoc: JSON.stringify({
                              cards: [['image', { src: `${api.url}/content/images/one.png` }]],
                          }),
                      },
                  ],
              }
            : { status: 500, body: {} },
    );
    const result = await runDemo('request-all-post-images.js', [api.url, adminKey, 'true']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Image request failed: 500');
});

test('invalid mobiledoc fails before requesting images', async () => {
    const api = await serve(() => ({ posts: [{ ...post, mobiledoc: 'invalid-json' }] }));
    const result = await runDemo('request-all-post-images.js', [api.url, adminKey, 'true']);
    expect(result.code).toBe(1);
    expect(api.requests).toHaveLength(1);
});

describe('JWKS lookup uses the real signing-key client', () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = {
        ...publicKey.export({ format: 'jwk' }),
        kid: 'fixture-key',
        use: 'sig',
        alg: 'RS256',
    };
    test('prints the matching public key', async () => {
        const api = await serve(() => ({ keys: [jwk] }));
        const result = await runDemo('verify-through-jwks.js', [api.url, jwk.kid]);
        expect(result.code, result.stderr).toBe(0);
        expect(result.stdout.trim()).toBe(publicKey.export({ format: 'pem', type: 'spki' }).trim());
        expect(api.requests[0].url.pathname).toBe('/ghost/.well-known/jwks.json');
    });
    test.each([undefined, 'missing-key'])('fails when key %s is absent', async (kid) => {
        const api = await serve(() => ({ keys: [jwk] }));
        const result = await runDemo('verify-through-jwks.js', [api.url, ...(kid ? [kid] : [])]);
        expect(result.code).toBe(1);
        expect(result.stderr).toMatch(/signing key/i);
    });
    test('fails when the JWKS endpoint fails', async () => {
        const api = await serve(() => ({
            status: 503,
            body: { message: 'Fixture JWKS unavailable' },
        }));
        const result = await runDemo('verify-through-jwks.js', [api.url, jwk.kid]);
        expect(result.code).toBe(1);
        expect(result.stderr).toContain('Fixture JWKS unavailable');
    });
});

test.each(['complete', 'interrupted', 'empty'])('image response stream: %s', async (mode) => {
    let imageRequests = 0;
    let completed = 0;
    const imageServer = createServer((req, res) => {
        imageRequests += 1;
        if (mode === 'empty') {
            res.writeHead(204);
            res.end();
            return;
        }
        res.writeHead(200, { 'content-type': 'image/png' });
        res.write(Buffer.alloc(64 * 1024));
        const timer = setTimeout(() => {
            if (mode === 'interrupted') {
                res.destroy();
            } else {
                res.end(Buffer.alloc(64 * 1024));
                completed += 1;
            }
        }, 50);
        res.on('close', () => clearTimeout(timer));
    });
    await new Promise((resolve) => imageServer.listen(0, '127.0.0.1', resolve));
    try {
        const imageUrl = `http://127.0.0.1:${imageServer.address().port}/content/images/stream.png`;
        const api = await serve(() => ({
            posts: [
                { ...post, mobiledoc: JSON.stringify({ cards: [['image', { src: imageUrl }]] }) },
            ],
        }));
        const result = await runDemo('request-all-post-images.js', [api.url, adminKey, 'true']);
        if (mode === 'interrupted') {
            expect(result.code).toBe(1);
            expect(result.stderr).toContain('There was an error');
            expect(result.stdout).not.toContain('Requested 3 images');
            expect(imageRequests).toBe(1);
        } else {
            expect(result.code, result.stderr).toBe(0);
            expect(result.stdout).toContain('Requested 3 images');
            expect(imageRequests).toBe(3);
            expect(completed).toBe(mode === 'complete' ? 3 : 0);
        }
    } finally {
        await new Promise((resolve) => {
            imageServer.close(resolve);
            imageServer.closeAllConnections();
        });
    }
});
