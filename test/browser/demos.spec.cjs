const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
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

async function attachDiagnostic(testInfo, name, { body, contentType }) {
    const extension = contentType === 'image/png' ? 'png' : 'json';
    const outputPath = testInfo.outputPath(`${name}.${extension}`);
    await fs.writeFile(outputPath, body);
    await testInfo.attach(name, { path: outputPath, contentType });
}

async function expectReference(page, context, filename, testInfo) {
    const reference = await context.newPage();
    await reference.setContent(
        await fs.readFile(path.join(__dirname, 'references', filename), 'utf8'),
    );
    const actual = await page.screenshot({ animations: 'disabled' });
    const expected = await reference.screenshot({ animations: 'disabled' });
    await attachDiagnostic(testInfo, 'actual', { body: actual, contentType: 'image/png' });
    await attachDiagnostic(testInfo, 'reference', { body: expected, contentType: 'image/png' });
    // Independent, handwritten HTML reference: rendered on the same platform so
    // OS font differences do not require regenerating application snapshots.
    const difference = await reference.evaluate(
        async ({ actualPng, expectedPng }) => {
            // This helper must stay inside the callback serialized into the browser.
            // oxlint-disable-next-line unicorn/consistent-function-scoping
            async function pixels(base64) {
                const image = new Image();
                image.src = `data:image/png;base64,${base64}`;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const canvasContext = canvas.getContext('2d');
                canvasContext.drawImage(image, 0, 0);
                return {
                    width: image.width,
                    height: image.height,
                    data: canvasContext.getImageData(0, 0, image.width, image.height).data,
                };
            }
            const actualPixels = await pixels(actualPng);
            const expectedPixels = await pixels(expectedPng);
            if (
                actualPixels.width !== expectedPixels.width ||
                actualPixels.height !== expectedPixels.height
            ) {
                return 'Screenshot dimensions differ';
            }
            let differingPixels = 0;
            const samples = [];
            for (let index = 0; index < actualPixels.data.length; index += 4) {
                // Chromium can rasterize a near-white glyph edge as 253 or 255.
                // Every larger pixel difference fails; there is no pixel-count allowance.
                if (
                    [0, 1, 2, 3].some(
                        (channel) =>
                            Math.abs(
                                actualPixels.data[index + channel] -
                                    expectedPixels.data[index + channel],
                            ) > 2,
                    )
                ) {
                    differingPixels += 1;
                    if (samples.length < 20) {
                        samples.push({
                            x: (index / 4) % actualPixels.width,
                            y: Math.floor(index / 4 / actualPixels.width),
                            actual: Array.from(actualPixels.data.slice(index, index + 4)),
                            reference: Array.from(expectedPixels.data.slice(index, index + 4)),
                        });
                    }
                }
            }
            return { differingPixels, samples };
        },
        { actualPng: actual.toString('base64'), expectedPng: expected.toString('base64') },
    );
    if (typeof difference === 'string' || difference.differingPixels > 0) {
        await attachDiagnostic(testInfo, 'pixel-differences', {
            body: JSON.stringify(difference, null, 2),
            contentType: 'application/json',
        });
        await attachDiagnostic(testInfo, 'actual-repeat', {
            body: await page.screenshot({ animations: 'disabled' }),
            contentType: 'image/png',
        });
        await attachDiagnostic(testInfo, 'reference-repeat', {
            body: await reference.screenshot({ animations: 'disabled' }),
            contentType: 'image/png',
        });
    }
    expect(
        difference.differingPixels,
        'Demo screenshot differs from its reviewed reference HTML',
    ).toBe(0);
    await reference.close();
}

test('single post is fetched through the SDK and rendered as JSON', async ({
    page,
    context,
}, testInfo) => {
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
    await expectReference(page, context, 'read-post.html', testInfo);
});

test('custom reading times trim the content and render every result', async ({
    page,
    context,
}, testInfo) => {
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
    await expectReference(page, context, 'custom-reading-time.html', testInfo);
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
