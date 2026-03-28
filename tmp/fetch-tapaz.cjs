const fs = require('fs');
const https = require('https');

async function testTapAz() {
    const url = 'https://tap.az/elanlar/elektronika/telefonlar';
    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const html = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Length: ${html.length}`);
        
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump.html', html);

        const productBlocks = html.split(/class="products-i\b/).slice(1);
        console.log(`Old Pattern Blocks: ${productBlocks.length}`);

        if (productBlocks.length === 0) {
            console.log('Old pattern failed. Checking for signs of Cloudflare or bot challenge...');
            if (html.includes('Cloudflare') || html.includes('cf-browser-verification') || html.includes('Just a moment...')) {
                console.log('Result: CF Challenge or Blocked');
            } else {
                console.log('Result: Layout has changed. Need to analyze new HTML structure.');
                // Let's try some new common patterns loosely
                const newTitleMatches = html.match(/class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]+)/g);
                console.log(`Found ${newTitleMatches ? newTitleMatches.length : 0} loose title matches.`);
            }
        } else {
            console.log('Old pattern still matches HTML structure. Checking sub-patterns...');
            let titles = 0, prices = 0;
            for (const block of productBlocks) {
                const chunk = block.substring(0, 3000);
                if (chunk.match(/class="products-name[^"]*"[^>]*>([^<]+)/)) titles++;
                if (chunk.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/) || chunk.match(/([\d\s.,]+)\s*(?:₼|AZN|man)/)) prices++;
            }
            console.log(`Titles found: ${titles}`);
            console.log(`Prices found: ${prices}`);
        }
    } catch (e) {
        console.error(e);
    }
}
testTapAz();
