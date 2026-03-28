const fs = require('fs');

async function testNextApi() {
    try {
        const html = fs.readFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump.html', 'utf8');
        
        let buildId = '2N6sk0bTbnPz4UVaRVSRn'; // Hardcoded fallback just in case
        const buildMatch = html.match(/\/_next\/static\/([^\/]+)\/_buildManifest\.js/);
        if (buildMatch) {
            buildId = buildMatch[1];
            console.log('Extracted Next.js build ID:', buildId);
        } else {
            console.log('Could not extract build ID, using fallback:', buildId);
        }

        const jsonUrl = `https://tap.az/v1/_next/data/${buildId}/elanlar/elektronika/telefonlar.json`;
        console.log('Fetching Next.js Data API:', jsonUrl);
        
        const response = await fetch(jsonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                // Important to pretend we are a Next router
                'x-nextjs-data': '1',
                'Accept': '*/*'
            }
        });

        console.log('Status:', response.status);
        
        const text = await response.text();
        console.log('Length:', text.length);
        
        // Write to tmp for inspection
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-data.json', text);
        
        if (response.ok) {
            const data = JSON.parse(text);
            const apolloState = data.pageProps.apolloState;
            if (apolloState) {
                const keys = Object.keys(apolloState);
                const adKeys = keys.filter(k => k.startsWith('Ad:'));
                console.log('Found ' + adKeys.length + ' ads in apolloState!');
                
                if (adKeys.length > 0) {
                    for (let i = 0; i < Math.min(3, adKeys.length); i++) {
                        const ad = apolloState[adKeys[i]];
                        console.log(`\n--- Ad ${i+1} ---`);
                        console.log('Title:', ad.title);
                        console.log('Price:', ad.priceStr || ad.price);
                        console.log('Slug:', ad.slug);
                        console.log('ID:', ad.id);
                        
                        let imgUrl = null;
                        if (ad.photos && ad.photos.length > 0) {
                            const firstPhotoRef = ad.photos[0];
                            if (firstPhotoRef && firstPhotoRef.__ref) {
                                const photoObj = apolloState[firstPhotoRef.__ref];
                                if (photoObj) {
                                    imgUrl = photoObj.url || photoObj.thumbUrl || photoObj.largeUrl;
                                }
                            }
                        } else if (ad.posterUrl) {
                            imgUrl = ad.posterUrl;
                        }
                        
                        console.log('Image:', imgUrl);
                    }
                }
            } else {
                console.log('No apolloState found in pageProps.');
            }
        }
        
    } catch (e) {
        console.error(e);
    }
}
testNextApi();
