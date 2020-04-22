/**
 * Members Bulk Delete
 *
 * Usage:
 *
 * node members-bulk-delete.js https://blah.ghost.io ADMIN_API_KEY [true]
 *
 * If you run this script with just a URL and key, it will do a dry run
 * If you run this script with an extra argument (e.g. true) the deletions will be executed
 */

if (process.argv.length < 4) {
    console.error('Missing an argument. Requires API_URL API_KEY [confirm]');
    process.exit(1);
}

const url = process.argv[2];
const key = process.argv[3];
const doDelete = process.argv[4] === 'true';

if (!doDelete) {
    console.log('Dry run...');
} else {
    console.log('Will do deletions!');
}

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');
const api = new GhostAdminAPI({
    url,
    key,
    version: 'canary'
});

(async function main() {
    if (doDelete) {
        console.log('REAL Run');
    } else {
        console.log('Dry Run - nothing will be deleted');
    }

    console.log('API URL', url);
    console.log('API KEY', key);
    // Give the user time to read...
    await Promise.delay(1000);

    try {
        const allMembers = await api.members.browse({limit: 'all'});
        const keep = [];
        const freeMembers = allMembers.filter((member) => {
            // Comped members should have a subscription, but just in case
            if (!member.comped && member.stripe.subscriptions.length === 0) {
                return true;
            }

            keep.push(member.email);

            return false;
        });

        console.log(freeMembers.length, 'Members will be deleted out of', allMembers.length, 'total members. This will leave', keep.length, 'members');

        console.log('Keeping:');
        console.log(keep);

        if (doDelete) {
            const result = await Promise.mapSeries(freeMembers, async (member) => {
                console.log('Deleting', member.email);

                // Call the API
                const result = await api.members.delete({id: member.id});
                // Add a delay but return the original result
                return Promise.delay(50).return(result);
            });

            console.log('Deleted', result.length, 'members');
        }
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        if (err.type === 'NotFoundError') {
            console.log('Resource not found - is members actually enabled?');
        }
        process.exit(1);
    }
}());
