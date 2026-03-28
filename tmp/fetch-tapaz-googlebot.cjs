const fs = require('fs');

async function testTapAzGooglebot() {
    const url = 'https://tap.az/elanlar/elektronika/telefonlar';
    console.log(`Fetching ${url} as Googlebot...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            }
        });

        const html = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Length: ${html.length}`);
        
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump-googlebot.html', html);

        // Does it contain product elements?
        const productBlocks = html.match(/class="[^"]*AdCard[^"]*"[^>]*>/g);
        console.log(`AdCard Matches: ${productBlocks ? productBlocks.length : 0}`);

        if (!productBlocks) {
            console.log('No AdCards found. Searching for ₼ or AZN...');
            const priceMatches = html.match(/AZN|₼|manat/gi);
            console.log(`Price words found: ${priceMatches ? priceMatches.length : 0}`);
        } else {
            console.log('Success! AdCards are visible.');
        }

        // Check for NEXT_DATA apolloState again
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            const strings = jsonMatch[1].match(/"Ad:[^"]+"/g);
            console.log('Ads in JSON:', strings ? strings.length : 0);
        }

    } catch (e) {
        console.error(e);
    }
}
testTapAzGooglebot();
