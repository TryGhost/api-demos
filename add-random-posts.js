/**
 * Adds N number of posts (10 by default)
 *
 * Usage:
 *
 * node add-random-posts.js https://blah.ghost.io ADMIN_API_KEY number_of_posts
 */
if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];
const count = process.argv[4] || 10;

const Promise = require('bluebird');
const loremIpsum = require('lorem-ipsum').loremIpsum;
const _ = require('lodash');
const GhostAdminAPI = require('@tryghost/admin-api');

console.log(url);

const api = new GhostAdminAPI({
    url,
    key,
    version: 'v2'
  });

(async function main() {
    try {
       const posts = [];

        _.times(count, () => {
            let post = {
                status: 'published',
                title: loremIpsum({
                    count: 2,
                    units: 'words',
                }),
                excerpt: loremIpsum({
                    count: 2,
                    units: 'sentences'
                }),
                html: loremIpsum({
                    count: 400,                // Number of "words", "sentences", or "paragraphs"
                    format: 'html',         // "plain" or "html"
                    paragraphLowerBound: 3,  // Min. number of sentences per paragraph.
                    paragraphUpperBound: 7,  // Max. number of sentences per paragarph.
                    random: Math.random,     // A PRNG function
                    sentenceLowerBound: 3,   // Min. number of words per sentence.
                    sentenceUpperBound: 15,  // Max. number of words per sentence.
                    suffix: '\n',            // Line ending, defaults to "\n" or "\r\n" (win32)
                    units: 'paragraphs',      // paragraph(s), "sentence(s)", or "word(s)"
                    words: undefined            // Array of words to draw from
                }),

            };

            posts.push(post);
        });

        console.log(`Adding ${posts.length} posts to ${url}`);

        // convert our list of posts, to a list of promises for requests to the api
        const result = await Promise.mapSeries(posts, async (post) => {

            console.log('Adding', post.title);
            // Call the API
            let result = await api.posts.add(post, {source: 'html'});

            // Add a delay but return the original result
            return Promise.delay(5).return(result);
        });

        console.log(`Added ${result.length} posts`);

    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
