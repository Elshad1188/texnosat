const fs = require('fs');

async function fetchTemu() {
    try {
        const url = 'https://www.temu.com/goods.html?goods_id=605805285873694';
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        };
        const response = await fetch(url, { headers });
        const html = await response.text();
        fs.writeFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\temu-dump.html', html);
        console.log('HTML length:', html.length);
        
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || 
                           html.match(/<title>([^<]+)<\/title>/);
        
        const priceMatch = html.match(/[\$€₼]\s*([\d.,\s]+)/) || 
                           html.match(/([\d.,\s]+)\s*[\$€₼₼]/) ||
                           html.match(/([\d.,\s]+)\s*AZN/) ||
                           html.match(/property="og:price:amount"\s+content="([^"]+)"/i) ||
                           html.match(/name="twitter:data1"\s+content="([^"]+)"/i) ||
                           html.match(/"price":"([\d.]+)"/i) ||
                           html.match(/"salePrice":"([\d.]+)"/i);
        
        const imgMatches = [...html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)];
        const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/i);
        
        console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
        console.log('Price:', priceMatch ? priceMatch[1] : 'NOT FOUND');
        if (ogImageMatch) {
            console.log('OG Image found:', ogImageMatch[1]);
        } else {
            console.log('Images found:', imgMatches.length > 0 ? imgMatches[0][1] : 'NOT FOUND');
        }
        
        // Print all meta tags to see what's available
        const metaTags = [...html.matchAll(/<meta[^>]+>/gi)];
        console.log('\nMeta tags found:', metaTags.length);
        metaTags.forEach(m => console.log(m[0]));
        
    } catch (e) {
        console.error(e);
    }
}
fetchTemu();
