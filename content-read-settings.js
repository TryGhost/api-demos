/**
 * Read Settings
 *
 *
 * Usage:
 *
 * GHOST_CONTENT_API_KEY=your_key node content-read-settings.js https://blah.ghost.io
 */

if (process.argv.length !== 3) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.env.GHOST_CONTENT_API_KEY;

if (!key) {
    console.error('Missing GHOST_CONTENT_API_KEY environment variable');
    process.exit(1);
}

const GhostContentAPI = require('@tryghost/content-api');

const api = new GhostContentAPI({
    url,
    key,
    version: 'v2'
});

(async function main() {
    let settings = await api.settings.browse();

    console.log(settings);
}());
