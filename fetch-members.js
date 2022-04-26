/**
 * Fetch all members
 *
 *
 * Usage:
 *
 * node fetch-members.js https://blah.ghost.io ADMIN_API_KEY
 */

if (process.argv.length < 4) {
    console.error('Missing an argument');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];

const GhostAdminAPI = require('@tryghost/admin-api');

const api = new GhostAdminAPI({
    url,
    key,
    version: 'v4.0'
});

(async function main() {
    try {
        // Default members query
        const members = await api.members.browse();
        console.log('members', members);
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
}());
