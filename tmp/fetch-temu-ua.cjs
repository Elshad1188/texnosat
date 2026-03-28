const fs = require('fs');

async function testFetchAndRegex() {
    const url = 'https://www.temu.com/goods.html?goods_id=605805285873694';
    
    // Test different User Agents
    const agents = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'curl/7.68.0'
    ];
    
    for (const ua of agents) {
        console.log(`\nTesting UA: ${ua}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            });
            const html = await response.text();
            console.log(`Length: ${html.length}`);
            
            if (html.includes('_0x24b9')) {
                console.log('Result: JS Challenge Blocked');
                continue;
            }
            
            // If not blocked, let's test our extraction
            const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                               html.match(/<title>([^<]+)<\/title>/) ||
                               html.match(/class="[^"]*(?:_2Tl9qLr1|_1ak1dai3)[^"]*"[^>]*>([^<]+)/);
                               
            const priceMatch = html.match(/[\$€₼]\s*([\d.,\s]+)/) || 
                               html.match(/([\d.,\s]+)\s*[\$€₼₼]/) ||
                               html.match(/([\d.,\s]+)\s*AZN/);
                               
            const imgMatches = [...html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)];
            
            console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
            console.log('Price:', priceMatch ? priceMatch[1] : 'NOT FOUND');
            console.log('Images found:', imgMatches.length);
            if (imgMatches.length > 0) {
                console.log('First image:', imgMatches[0][1]);
            }
            
            // Write success dump
            fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\temu-success.html', html);
            break; // Stop on first successful fetch
            
        } catch (e) {
            console.error(e.message);
        }
    }
}
testFetchAndRegex();
