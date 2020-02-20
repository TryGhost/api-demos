/**
 * Add a tag to every post
 *
 * Note: Assumes you already have the tag created
 *
 * Usage:
 *
 * node add-tag-to-all-posts.js https://blah.ghost.io ADMIN_API_KEY slug-of-tag-to-add
 */

if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const api = new GhostAdminAPI({
    url,
    key,
    version: 'v2'
});

(async function main() {
    try {
        // Admin API automatically includes tags and authors
        // WARNING: If the site is really big (1000s of posts) maybe do this paginated
        const allPosts = await api.posts.browse({limit: 'all'});

        // convert our list of posts, to a list of promises for requests to the api
        const result = await Promise.mapSeries(allPosts, async (post) => {
            // Edit mobiledoc
            // @NOTE: if you're editing a string that might appear in mobiledoc structure, edit the HTML instead!
            // E.g. "sections" or "markups"
            // See Edit the HTML below
            post.mobiledoc = post.mobiledoc.replace(/github/gmi, 'GitHub');

            console.log('Updating', post.slug);
            // Call the API
            let result = await api.posts.edit(post);

            // Edit the HTML
            // post.html = post.html.replace(/github/gmi, 'GitHub');

            // console.log('Updating', post.slug);
            // // Call the API
            // // @NOTE: source HTML forces the mobiledoc to get overridden here!
            // let result = await api.posts.edit(post, {source: 'html'});

            // Add a delay but return the original result
            return Promise.delay(50).return(result);
        });

        console.log(`Updated ${result.length} posts`);
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
