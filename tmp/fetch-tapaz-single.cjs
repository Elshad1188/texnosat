const fs = require('fs');

async function testSingleAd() {
    const url = 'https://tap.az/elanlar/elektronika/telefonlar/43085890';
    console.log(`Fetching single ad: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            }
        });

        const html = await response.text();
        console.log(`Status: ${response.status}`);
        
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-single-dump.html', html);

        // Check if data is in __NEXT_DATA__
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            let hasData = false;
            
            if (data.props?.pageProps?.adDetails) {
                console.log('Success! AdDetails found in pageProps:');
                console.log('Title:', data.props.pageProps.adDetails.title);
                console.log('Price:', data.props.pageProps.adDetails.price);
                hasData = true;
            } else if (data.props?.pageProps?.apolloState) {
                const keys = Object.keys(data.props.pageProps.apolloState);
                const adKeys = keys.filter(k => k.startsWith('Ad:'));
                if (adKeys.length > 0) {
                    console.log('Success! Ad details found in apolloState:', adKeys.length);
                    console.log('Title:', data.props.pageProps.apolloState[adKeys[0]].title);
                    hasData = true;
                }
            }
            
            if (!hasData) {
                console.log('No ad data found in __NEXT_DATA__ JSON keys:', Object.keys(data.props?.pageProps || {}));
            }
        } else {
            console.log('No __NEXT_DATA__ block found.');
        }

        // Also check if data is in pure HTML
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        console.log('HTML H1 Title:', titleMatch ? titleMatch[1] : 'Not found');
        
        const priceMatch = html.match(/>([\d\s.,]+)(?:<span>)?\s*AZN/i);
        console.log('HTML Price AZN:', priceMatch ? priceMatch[1].trim() : 'Not found');

    } catch (e) {
        console.error(e);
    }
}
testSingleAd();
