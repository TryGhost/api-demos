/**
 * Finds and fixes any mangled
 *
 * Usage:
 *
 * node fix-markdown-linked-images.js https://blah.ghost.io ADMIN_API_KEY - dry run
 * node fix-markdown-linked-images.js https://blah.ghost.io ADMIN_API_KEY true - live run
 */

if (process.argv.length < 4) {
    console.log('not enough arguments, provide an API url and admin key');
    process.exit(1);
}

const Promise = require('bluebird');
const GhostAdminAPI = require('@tryghost/admin-api');

const url = process.argv[2];
const key = process.argv[3];

// updates passed in mobiledoc object by reference
// returns true/false for whether any changes were made
function fixMobiledoc(mobiledoc, post) {
    let edited = false;

    const markdownCards = mobiledoc.cards.filter(c => c[0] === 'markdown');

    // loop over cards replacing the markdown payload by reference
    markdownCards.forEach((card) => {
        let markdown = card[1].markdown;

        markdown = markdown.replace(/\[!\[(.*?)\]\((.*?)\)\]\((.*?)\)/gm, (match, p1, p2, p3) => {
            // p1 = img alt, often contains repetition
            // p2 = img src + "title", often contains repetition
            // p3 = link target, rarely contains repetition

            // p1 can have repition, last occurrence is always full contents
            if (p1.match(/!\[/)) {
                const lastAltMatch = p1.match(/!\[((.(?!!\[))+)$/);
                if (lastAltMatch) {
                    p1 = lastAltMatch[1];
                }
            }

            // p2 mangled content typically has garbage repitition at the beginning
            // but ends with a valid url - grab that url and replace
            if (p2.match(/https?:\/\//)) {
                // p2 is absolute
                const lastUrlMatch = p2.match(/https?:\/\/((.(?!http))+)$/);
                if (lastUrlMatch) {
                    p2 = lastUrlMatch[0];
                }
            }

            // very occasionally p3 can contain repetition
            if (p3.match(/!\[/)) {
                const lastUrlMatch = p3.match(/https?:\/\/((.(?!http))+)$/);
                if (lastUrlMatch) {
                    p3 = lastUrlMatch[0];
                }
            }

            const replacement = `[![${p1}](${p2})](${p3})`;

            if (match !== replacement) {
                edited = true;

                // console.log({match, replacement, imgAlt: p1, imgSrc: p2, href: p3});

                return replacement;
            }

            return match;
        });

        markdown = markdown.replace(/\[!\[(.*?)\]\((?:[^)]*?)\]\((.*?)\)([^\s]+?)\)/gm, (match, p1, p2, p3) => {
            if (p3.match(/tent\/images\//)) {
                p3 = p3.replace(/.*tent\/images\/(.*)$/, '/content/images/$1');

                const replacement = `[![${p1}](${p2})](${p3})`;

                if (match !== replacement) {
                    edited = true;

                    // console.log({match, replacement, p1, p2, p3});

                    return replacement;
                }
            }

            console.log('Unfixable post', {slug: post.slug, id: post.id});
            // console.log({match, replacement, p1, p2, p3});

            return match;
        });

        card[1].markdown = markdown;
    });

    return edited;
}

(async function main() {
    const doEdit = process.argv[4] === 'true';

    if (doEdit) {
        console.log('REAL Run');
    } else {
        console.log('Dry Run - nothing will be edited');
    }

    // Give the user time to read...
    await Promise.delay(1000);

    const api = new GhostAdminAPI({
        url,
        key,
        version: 'canary'
    });

    try {
        const allPosts = await api.posts.browse({fields: 'id,slug,mobiledoc,updated_at', limit: 'all'});
        const allPages = await api.pages.browse({fields: 'id,slug,mobiledoc,updated_at', limit: 'all'});

        console.log(`${allPosts.length} Posts and ${allPages.length} Pages will be checked for mangled markdown and edited if needed\n`);

        // give time to cancel if needed
        await Promise.delay(2000);

        const postsResult = await Promise.mapSeries(allPosts, async (post) => {
            const mobiledoc = JSON.parse(post.mobiledoc);
            const edited = fixMobiledoc(mobiledoc, post);

            if (edited) {
                console.log(`Fixing post ${post.slug} (${post.id})`);
            }

            if (doEdit && edited) {
                // missing data attributes won't be changed
                // updated_at is required to pass collision detection
                const postData = {id: post.id, updated_at: post.updated_at, mobiledoc: JSON.stringify(mobiledoc)};
                await api.posts.edit(postData);
            }

            return Promise.delay(50).return(edited);
        });

        console.log(`\nChecked ${postsResult.length} posts and fixed ${postsResult.filter(edited => edited).length}\n`);

        await Promise.delay(1000);

        const pagesResult = await Promise.mapSeries(allPages, async (page) => {
            const mobiledoc = JSON.parse(page.mobiledoc);
            const edited = fixMobiledoc(mobiledoc);

            if (edited) {
                console.log(`Fixing page ${page.slug} (${page.id})`);
            }

            if (doEdit && edited) {
                // missing data attributes won't be changed
                // updated_at is required to pass collision detection
                const pageData = {id: page.id, updated_at: page.updated_at, mobiledoc: JSON.stringify(mobiledoc)};
                await api.pages.edit(pageData);
            }

            return Promise.delay(50).return(edited);
        });

        console.log(`\nChecked ${pagesResult.length} pages and fixed ${pagesResult.filter(edited => edited).length}\n`);
    } catch (err) {
        console.error('There was an error', require('util').inspect(err, false, null));
        process.exit(1);
    }
})();
