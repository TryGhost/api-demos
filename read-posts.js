/**
 * Add a tag to every post
 *
 * Note: Assumes you already have the tag created
 *
 * Usage:
 *
 * node read-posts.js https://blah.ghost.io ADMIN_API_KEY
 */

if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];

const GhostAdminAPI = require('@tryghost/admin-api');
const apiv2 = new GhostAdminAPI({
    url,
    key,
    version: 'v2'
});

const apiv3 = new GhostAdminAPI({
    url,
    key,
    version: 'v3'
});

(async function main() {
    try {
        // Admin API automatically includes tags and authors
        // WARNING: If the site is really big (1000s of posts) maybe do this paginated
        const allPosts = await apiv3.posts.browse({limit: 'all'});

        allPosts.map((post) => {
            if (post.codeinjection_head === null && post.codeinjection_foot !== null) {
                console.log(post.id, post.title,post.codeinjection_head, post.codeinjection_foot);
            }
        });
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
