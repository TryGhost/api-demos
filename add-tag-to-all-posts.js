/**
 * Add a tag to every post
 *
 * Note: Assumes you already have the tag created
 *
 * Usage:
 *
 * node add-tag-to-all-posts.js https://blah.ghost.io ADMIN_API_KEY slug-of-tag-to-add
 */

if (process.argv.length < 5) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];
const tag = process.argv[4];

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const api = new GhostAdminAPI({
    url,
    key,
    version: 'v2'
  });

(async function main() {
    try {
        console.log(`Adding tag ${tag} to ${url}`);

        const tagToAdd = await api.tags.read({ slug: tag });

        console.log('Found tag', tagToAdd);

        // Admin API automatically includes tags and authors
        // WARNING: If the site is really big (1000s of posts) maybe do this paginated
        const allPosts = await api.posts.browse({ limit: 'all' });

        // convert our list of posts, to a list of promises for requests to the api
        const result = await Promise.mapSeries(allPosts, async (post) => {

            // Add the tag to the post
            post.tags.push(tagToAdd);

            // Weird.. we shouldn't need to do this:
            delete post.uuid;
            delete post.comment_id;

            console.log('Updating', post.slug);
            // Call the API
            let result = await api.posts.edit(post);

            // Add a delay but return the original result
            return Promise.delay(50).return(result);
        });

        console.log(`Updated ${result.length} posts`);

    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
