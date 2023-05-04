/**
 * Reads all posts and requests all images in the mobiledoc.
 *
 * Why?
 * - This is useful to force ghost to create all image versions for all images especially when the content is being consumed by a static(SSG) frontend and the frontend requires responsive images to exist.
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
const fetch = require('node-fetch');

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

    function getImagePaths(mobiledocStr) {
        const mobiledoc = JSON.parse(mobiledocStr);
        const srcs = mobiledoc.cards.map(card => {
            const [type, attributes] = card;
            return attributes.src;
        });
        return srcs
    }

    try {
        const allPosts = await api.posts.browse({ fields: 'id,slug,mobiledoc', limit: 'all' });

        console.log(`${allPosts.length} Posts will be accessed`);

        const allImages = [];

        await Promise.mapSeries(allPosts, async (post) => {
            console.log(`Reading post ${post.slug} (${post.id})`);

            const images = getImagePaths(post.mobiledoc);
            allImages.push(...images);

            return Promise.delay(50).return(true);
        });

        // remove duplicates
        const sanitizedImages = [...new Set(allImages)];

        // remove 'undefined' from the array
        sanitizedImages.splice(sanitizedImages.indexOf(undefined), 1);

        const sizes = [600, 1000, 1600];

        // image versions  sample         
        // Original http://localhost:2368/content/images/2023/05/image.png
        // 600w  = http://localhost:2368/content/images/size/w600/2023/05/image.png 
        // 1000w = http://localhost:2368/content/images/size/w1000/2023/05/image.png
        // 1600w = http://localhost:2368/content/images/size/w1600/2023/05/image.png

        // generate 600, 1000, 1600 versions of each original image
        const allImageVersions = [];
        sanitizedImages.forEach(image => {
            sizes.forEach(size => {
                const imageVersion = image.replace('/content/images/', `/content/images/size/w${size}/`);
                allImageVersions.push(imageVersion);
            })
        });

        console.log(`\nFound ${sanitizedImages.length} images that amount to ${allImageVersions.length} versions\n`);

        if (doRerender) {
            // do a fetch request for each image version and do nothing with the response
            await Promise.mapSeries(allImageVersions, async (image) => {
                console.log(`Fetching ${image}`);
                await fetch(image);
                return Promise.delay(50).return(true);
            });


            console.log(`\nRequested ${allImageVersions.length} images\n`);
        }
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
})();
