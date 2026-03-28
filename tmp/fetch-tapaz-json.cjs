const fs = require('fs');

function testJsonParse() {
    try {
        const html = fs.readFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump.html', 'utf8');
        
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!jsonMatch) {
            console.log('No __NEXT_DATA__ found');
            return;
        }

        const data = JSON.parse(jsonMatch[1]);
        const apolloState = data?.props?.pageProps?.apolloState;
        
        if (apolloState) {
            const keys = Object.keys(apolloState);
            const adKeys = keys.filter(k => k.startsWith('Ad:'));
            console.log('Found ' + adKeys.length + ' ads in apolloState');
            
            if (adKeys.length > 0) {
                // Let's print the first 3 ads
                for (let i = 0; i < Math.min(3, adKeys.length); i++) {
                    const ad = apolloState[adKeys[i]];
                    console.log(`\n--- Ad ${i+1} ---`);
                    console.log('ID:', ad.id);
                    console.log('Title:', ad.title);
                    console.log('Price:', ad.price);
                    console.log('PriceStr:', ad.priceStr);
                    console.log('URL (/elanlar/id):', ad.slug ? `/elanlar/${ad.slug}` : `/elanlar/${ad.id}`);
                    
                    // Look for image. Sometimes it's a reference to another object.
                    let imgUrl = null;
                    if (ad.photos && ad.photos.length > 0) {
                        const firstPhotoRef = ad.photos[0];
                         // "photos":[{"__ref":"Photo:gid://tap/Photo/487313837"}]
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
            } else {
                console.log('No Ad: keys found. Here are apolloState root keys (first 10):', keys.slice(0, 10));
                
                // Maybe it's not apolloState, maybe there's another state object
                const stringified = JSON.stringify(apolloState);
                const titleMatches = stringified.match(/"title":"([^"]+)"/gi);
                console.log('Titles found via regex inside apolloState:', titleMatches ? titleMatches.length : 0);
            }
        } else {
            console.log('No apolloState found in pageProps.');
        }
        
    } catch (e) {
        console.error(e);
    }
}
testJsonParse();
