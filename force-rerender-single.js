/**
 * Re-renders all posts and pages
 *
 * Usage:
 *
 * node force-rerender-single.js https://blah.ghost.io ADMIN_API_KEY slug - dry run
 * node force-rerender-single.js https://blah.ghost.io ADMIN_API_KEY slug true - live run
 */

if (process.argv.length < 4) {
    console.log('not enough arguments, provide an API url and admin key');
    process.exit(1);
}

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');

const url = process.argv[2];
const key = process.argv[3];
const slug = process.argv[4];

(async function main() {
    const doRerender = process.argv[5] === 'true';

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
        const post = await api.posts.read({slug}, {fields: 'id,slug,updated_at'});

        console.log(`${post.slug} will be re-rendered`);

        if (doRerender) {
            console.log(`Re-rendering post ${post.slug} (${post.id})`);

            // missing data attributes won't be changed
            // updated_at is required to pass collision detection
            const postData = {id: post.id, updated_at: post.updated_at};
            await api.posts.edit(postData, {force_rerender: true});

            console.log(`\nRe-rendered ${post.slug} \n`);
        }
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
})();
