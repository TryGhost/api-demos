const { test, expect } = require('@playwright/test');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
test('browser CDN versions match the installed packages under test', () => {
    expect(require('@tryghost/content-api/package.json').version).toBe('1.12.12');
    expect(require('@tryghost/helpers/package.json').version).toBe('1.1.27');
});

const post = {
    id: 'fixture-post',
    slug: 'publishing-options',
    title: 'Publishing options',
    html: '<p>A deterministic example.</p>',
};
// The trailing 1,000 characters must be removed by the demo before calculating.
const readingHtml = `<p>${'word '.repeat(550)}</p>${'extra '.repeat(166)}xxxx`;
const readingPosts = ['Welcome', 'Publishing options', 'Admin settings'].map((title) => ({
    title,
    html: readingHtml,
    feature_image: null,
}));

async function openDemo(page, filename, { fail = false, posts = readingPosts } = {}) {
    const requests = [];
    const unexpected = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === 'demos.test' && url.pathname === `/${filename}`) {
            return route.fulfill({ path: path.join(root, filename), contentType: 'text/html' });
        }
        if (url.hostname === 'unpkg.com') {
            const bundles = {
                '/@tryghost/content-api@1.12.12/umd/content-api.min.js':
                    'node_modules/@tryghost/content-api/umd/content-api.min.js',
                '/@tryghost/helpers@1.1.27/umd/helpers.min.js':
                    'node_modules/@tryghost/helpers/umd/helpers.min.js',
            };
            if (bundles[url.pathname]) {
                return route.fulfill({
                    path: path.join(root, bundles[url.pathname]),
                    contentType: 'text/javascript; charset=utf-8',
                });
            }
        }
        if (
            url.hostname === 'demo.ghost.io' &&
            url.pathname.startsWith('/ghost/api/v3/content/posts/')
        ) {
            requests.push({ method: route.request().method(), url });
            const result =
                filename === 'read-post.html'
                    ? [post]
                    : url.pathname.includes('/slug/')
                      ? [posts[1]]
                      : posts;
            return route.fulfill({
                status: fail ? 500 : 200,
                contentType: 'application/json',
                headers: { 'access-control-allow-origin': '*' },
                body: JSON.stringify(
                    fail
                        ? {
                              errors: [
                                  {
                                      message: 'Fixture API unavailable',
                                      type: 'InternalServerError',
                                  },
                              ],
                          }
                        : { posts: result },
                ),
            });
        }
        unexpected.push(url.href);
        return route.abort();
    });
    await page.goto(`http://demos.test/${filename}`);
    return { requests, unexpected, errors };
}

test('single post is fetched through the SDK and rendered as JSON', async ({ page }) => {
    const state = await openDemo(page, 'read-post.html');
    await expect(page.locator('#result')).toHaveText(JSON.stringify(post));
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0].method).toBe('GET');
    expect(state.requests[0].url.pathname).toBe(
        '/ghost/api/v3/content/posts/slug/publishing-options/',
    );
    expect(state.requests[0].url.searchParams.get('key')).toBe('22444f78447824223cefc48062');
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
});

test('custom reading times trim the content and render every result', async ({ page }) => {
    const state = await openDemo(page, 'custom-reading-time.html');
    await expect(page.locator('#single-result')).toHaveText('2 min read');
    await expect(page.locator('#multi-result')).toHaveText(
        'Welcome - 2 min read Publishing options - 2 min read Admin settings - 2 min read',
    );
    expect(state.requests).toHaveLength(2);
    const single = state.requests.find((request) => request.url.pathname.includes('/slug/')).url;
    const multiple = state.requests.find((request) => !request.url.pathname.includes('/slug/')).url;
    expect(single.searchParams.get('fields')).toBe('html,feature_image');
    expect(multiple.searchParams.get('fields')).toBe('title,html,feature_image');
    expect(multiple.searchParams.get('filter')).toBe(
        'slug:[welcome,publishing-options,admin-settings]',
    );
    expect(state.unexpected).toEqual([]);
    expect(state.errors).toEqual([]);
});

for (const filename of ['read-post.html', 'custom-reading-time.html']) {
    test(`${filename} reports API errors without rendering a successful result`, async ({
        page,
    }) => {
        const loggedErrors = [];
        page.on('console', (message) => {
            if (message.type() === 'error' && message.text().includes('Fixture API unavailable')) {
                loggedErrors.push(message.text());
            }
        });
        const state = await openDemo(page, filename, { fail: true });
        await expect.poll(() => loggedErrors.length).toBe(filename === 'read-post.html' ? 1 : 2);
        for (const selector of filename === 'read-post.html'
            ? ['#result']
            : ['#single-result', '#multi-result']) {
            await expect(page.locator(selector)).toBeEmpty();
        }
        expect(state.unexpected).toEqual([]);
        expect(state.errors).toEqual([]);
    });
}

test('post titles are displayed literally without interpreting markup', async ({ page }) => {
    const title = '<img src=x onerror="window.titleExecuted = true">';
    const posts = readingPosts.map((readingPost) => ({ ...readingPost, title }));
    const state = await openDemo(page, 'custom-reading-time.html', { posts });
    await expect(page.locator('#multi-result')).toContainText(title);
    await expect(page.locator('#multi-result img')).toHaveCount(0);
    expect(await page.evaluate(() => window.titleExecuted)).toBeUndefined();
    expect(state.unexpected).toEqual([]);
});
