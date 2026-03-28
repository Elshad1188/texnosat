const fs = require('fs');

function testAdContent() {
    try {
        const html = fs.readFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump-googlebot.html', 'utf8');
        
        const priceMatches = html.match(/>[\d\s.,]+(?:<span>)?\s*AZN/g);
        console.log('Prices found in HTML text:', priceMatches ? priceMatches.length : 0);
        if (priceMatches) {
            console.log(priceMatches.slice(0, 5));
        }
        
    } catch (e) {
        console.error(e);
    }
}
testAdContent();
