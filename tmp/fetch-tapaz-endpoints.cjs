const fs = require('fs');

async function testEndpoints() {
    try {
        console.log('Testing /sitemap.xml...');
        const sitemapResp = await fetch('https://tap.az/sitemap.xml');
        console.log('Sitemap status:', sitemapResp.status);
        if (sitemapResp.ok) {
            const xml = await sitemapResp.text();
            console.log('Sitemap length:', xml.length);
            console.log('Sample:', xml.substring(0, 300));
        }

        console.log('\nTesting /graphql...');
        const gqlResp = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "{ __schema { types { name } } }" })
        });
        console.log('GraphQL status:', gqlResp.status);
        if (gqlResp.ok) {
            const gqlText = await gqlResp.text();
            console.log('GraphQL response:', gqlText.substring(0, 300));
        } else {
            console.log('GraphQL failed:', await gqlResp.text().catch(()=>''));
        }

    } catch (e) {
        console.error(e);
    }
}
testEndpoints();
