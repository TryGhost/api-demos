/**
 * Warning: This script uses an experimental alpha feature
 *
 * Upload a local media file
 *
 * To run me:
 *
 * 1. Replace "YOUR_ADMIN_API_KEY" below with your admin key (and edit the URL if you're not using localhost)
 * 2. Make sure the example you want to test is uncommented
 * 3. Run `node upload-file.js ./sample_document.pdf some-ID-123`
 *              ^ script name   ^ path to file     ^ reference
 */

// The admin API client is the easiest way to use the API
const GhostAdminAPI = require('@tryghost/admin-api');
const path = require('path');

// Configure the client
const api = new GhostAdminAPI({
    url: 'http://localhost:2368',
    // @TODO: edit your key here
    key: 'YOUR_ADMIN_API_KEY_HERE',
    version: 'canary'
});

const file = process.argv[2];
const ref = process.argv[3];

api.files.upload({
    file: path.join(__dirname, file),
    ref
})
    .then(response => console.log(response))
    .catch(error => console.error(error));
