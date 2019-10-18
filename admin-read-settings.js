/**
 * Admin API Cannot Read Settings.
 *
 * THIS DOES NOT WORK!
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
    version: 'v2'
});

(async function main() {
    let settings = await api.settings.browse();

    console.log(settings);
}());
