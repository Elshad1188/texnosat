const fs = require('fs');

async function testMobileTapAz() {
    const url = 'https://m.tap.az/elanlar/elektronika/telefonlar';
    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            }
        });

        const html = await response.text();
        console.log(`Status: ${response.status}`);
        
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump-m.html', html);

        const productBlocks = html.split(/class="products-i\b/).slice(1);
        console.log(`Old Pattern Blocks: ${productBlocks.length}`);

        if (productBlocks.length === 0) {
            console.log('Old pattern failed on mobile too. They likely redirected or updated the mobile site as well.');
            const priceMatches = html.match(/AZN|₼|manat/gi);
            console.log(`Price words found: ${priceMatches ? priceMatches.length : 0}`);
        } else {
            console.log('Mobile site works! Old pattern found.');
        }

    } catch (e) {
        console.error(e);
    }
}
testMobileTapAz();
