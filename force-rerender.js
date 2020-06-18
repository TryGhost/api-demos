/**
 * Re-renders all posts and pages
 *
 * Usage:
 *
 * node force-rerender.js https://blah.ghost.io ADMIN_API_KEY - dry run
 * node force-rerender.js https://blah.ghost.io ADMIN_API_KEY true - live run
 */

if (process.argv.length < 4) {
    console.log('not enough arguments, provide an API url and admin key');
    process.exit(1);
}

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');

const url = process.argv[2];
const key = process.argv[3];

(async function main() {
    const doRerender = process.argv[4] === 'true';

    if (doRerender) {
        console.log('REAL Run');
    } else {
        console.log('Dry Run - nothing will be re-rendered');
    }

    // Give the user time to read...
    await Promise.delay(1000);

    const api = new GhostAdminAPI({
        url,
        key,
        version: 'canary'
    });

    try {
        const allPosts = await api.posts.browse({fields: 'id,slug,updated_at', limit: 'all'});
        const allPages = await api.pages.browse({fields: 'id,slug,updated_at', limit: 'all'});

        console.log(`${allPosts.length} Posts and ${allPages.length} Pages will be re-rendered`);

        if (doRerender) {
            const postsResult = await Promise.mapSeries(allPosts, async (post) => {
                console.log(`Re-rendering post ${post.slug} (${post.id})`);

                // missing data attributes won't be changed
                // updated_at is required to pass collision detection
                const postData = {id: post.id, updated_at: post.updated_at};
                await api.posts.edit(postData, {force_rerender: true});

                // return `true` rather than the api response to avoid putting all post contents into memory
                return Promise.delay(50).return(true);
            });

            console.log(`\nRe-rendered ${postsResult.length} posts\n`);
            await Promise.delay(1000);

            const pagesResult = await Promise.mapSeries(allPages, async (page) => {
                console.log(`Re-rendering page ${page.slug} (${page.id})`);

                const pageData = {id: page.id, updated_at: page.updated_at};
                await api.pages.edit(pageData, {force_rerender: true});

                return Promise.delay(50).return(true);
            });

            console.log(`\nRe-rendered ${pagesResult.length} pages`);
        }
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
})();
