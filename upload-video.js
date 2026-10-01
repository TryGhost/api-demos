/**
 * Warning: This script uses an experimental alpha feature
 *
 * Upload a local media file
 *
 * To run me:
 *
 * 1. Set GHOST_API_URL and GHOST_ADMIN_API_KEY in your environment (or edit the inline examples)
 * 2. Run the example command below; paths are relative to this script directory
 *
 * Example command:
 * node upload-video.js "fixtures/sample_640x360.mp4" "fixtures/ghost-logo.png"
 */

// The admin API client is the easiest way to use the API
const GhostAdminAPI = require('@tryghost/admin-api');
const path = require('path');

// Configure the client
const api = new GhostAdminAPI({
    url: process.env.GHOST_API_URL || 'http://localhost:2368',
    // @TODO: edit your key here
    key: process.env.GHOST_ADMIN_API_KEY || 'YOUR_ADMIN_API_KEY',
    version: 'canary',
});

const file = process.argv[2];
const thumbnail = process.argv[3];

api.media
    .upload({
        file: path.join(__dirname, file),
        thumbnail: path.join(__dirname, thumbnail),
    })
    .then((response) => console.log(response))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
