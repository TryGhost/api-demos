/**
 * Write Posts with customized mobiledocs
 *
 * An example of how to use the admin API to write posts from mobiledoc focused on content gating
 * through segmentation within the post content - email cards with "segment" payload
 *
 * To run me:
 *
 * 1. Replace "YOUR_ADMIN_API_KEY" below with your admin key (and edit the URL if you're not using localhost)
 * 2. Make sure the example you want to test is uncommented
 * 3. Run `node ./write-email-card-posts.js`
 */

// The admin API client is the easiest way to use the API
const GhostAdminAPI = require('@tryghost/admin-api');

// Configure the client
const api = new GhostAdminAPI({
    url: 'http://localhost:2368',
    // @TODO: edit your key here
    key: 'YOUR_ADMIN_API_KEY',
    version: 'canary'
});

/**
 * Email card with 2 segments - free and paid members
 * produces following HTML:
 *
    <!-- POST CONTENT START -->
    <p style="margin: 0 0 1.5em 0; line-height: 1.6em;">paragraph text</p>
    <div data-gh-segment="member.status:paid"><p style="margin: 0 0 1.5em 0; line-height: 1.6em;">Hey there paid member</p></div>
    <div data-gh-segment="member.status:free"><p style="margin: 0 0 1.5em 0; line-height: 1.6em;">Hi there free member</p></div>
    <!-- POST CONTENT END -->
 */
const twoSegmentMobiledoc = {
    version: '0.3.1',
    atoms: [],
    cards: [[
        'email', {
            html: '<p>Hey {first_name, "there"} paid member</p>',
            segment: 'status:-free'
        }
    ],[
        'email', {
            html: '<p>Hi {first_name, "there"} free member</p>',
            segment: 'status:free'
        }
    ]],
    markups: [],
    sections: [[1,'p',[[0,[],0,'paragraph text']]],[10,0],[10,1],[1,'p',[]]],
    ghostVersion: '4.0'
};

/**
 * Option 1 - two segments one 𝖼̶𝗎̶𝗉̶ post
 * --------------------
 * Create a post with two member segments `free` and `-free`
 */

api.posts.add({
    title: 'Two segments one 𝖼̶𝗎̶𝗉̶ post',
    mobiledoc: JSON.stringify(twoSegmentMobiledoc)
})
    .then(response => console.log(response))
    .catch(error => console.error(error));

/**
 * Option 2 - one segment in the document
 * ---------------------
 * Create a post with "paid" member segment `-free`
 */
// const paidSegmentMobiledoc = {
//     version: '0.3.1',
//     atoms: [],
//     cards: [[
//         'email', {
//             html: '<p>Hey {first_name, "there"} paid member</p>',
//             segment: 'status:-free'
//         }
//     ]],
//     markups: [],
//     sections: [[1,'p',[[0,[],0,'paragraph text']]],[10,0],[1,'p',[]]],
//     ghostVersion: '4.0'
// };

// api.posts.add({
//     title: 'Post with paid members email segment',
//     mobiledoc: JSON.stringify(paidSegmentMobiledoc)
// })
//     .then(response => console.log(response))
//     .catch(error => console.error(error));
