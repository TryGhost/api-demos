/**
 * Read Settings
 *
 *
 * Usage:
 *
 * node content-read-settings.js https://blah.ghost.io CONTENT_API_KEY
 */

if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];

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
