const fs = require('fs');

function findAds() {
    try {
        const html = fs.readFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump.html', 'utf8');
        
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!jsonMatch) {
            console.log('No __NEXT_DATA__ found');
            return;
        }

        const rawJsonStr = jsonMatch[1];
        console.log('Total JSON length:', rawJsonStr.length);
        
        // Let's do a simple regex over the JSON string to find price objects
        // It's likely something like "priceStr":"450 AZN" or "price":"450"
        
        const priceStrMatches = rawJsonStr.match(/"priceStr":"[^"]+"/g);
        console.log('priceStr matches:', priceStrMatches ? priceStrMatches.length : 0);
        
        if (priceStrMatches && priceStrMatches.length > 0) {
            console.log('Samples:', priceStrMatches.slice(0, 5));
        }

        // Search for title matches
        const titleMatches = rawJsonStr.match(/"title":"[^"]+"/g);
        console.log('title matches:', titleMatches ? titleMatches.length : 0);
        
        // Search for name matches (sometimes it's "name" instead of "title")
        const nameMatches = rawJsonStr.match(/"name":"[^"]+"/g);
        console.log('name matches:', nameMatches ? nameMatches.length : 0);
        
        // Search for url/slug matches
        const slugMatches = rawJsonStr.match(/"slug":"[^"]+"/g);
        console.log('slug/url matches:', slugMatches ? slugMatches.length : 0);

        // Let's try to extract one full object that has a price or priceStr
        const adObjectRegex = /{[^{]*?"price(?:Str)?":"[^"]*"[^}]*?}/g;
        const objects = rawJsonStr.match(adObjectRegex);
        console.log('Potential Ad Objects Found:', objects ? objects.length : 0);
        
        if (objects && objects.length > 0) {
            console.log('\n--- First Ad Object Sample ---');
            console.log(objects[0]);
        }
        
    } catch (e) {
        console.error(e);
    }
}
findAds();
