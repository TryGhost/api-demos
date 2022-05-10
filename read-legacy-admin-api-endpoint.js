/**
 * Add a tag to every post
 *
 * Note: Assumes you already have the tag created
 *
 * Usage:
 *
 * node read-legacy-admin-api-endpoint.js https://blah.ghost.io ADMIN_API_KEY VERSION_NUMBER_TO_SEND_IN_ACCEPT_VERSION_HEADER
 */

if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];
const version = process.argv[4] || 'v2.0';

const GhostAdminAPI = require('@tryghost/admin-api');
const api = new GhostAdminAPI({
    url,
    key,
    version
});

(async function main() {
    try {
        console.log(`Reading subscribers from ${url}`);

        const subscribers = await api.subscribers.browse();

        console.log('Found subscribers', subscribers);
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
