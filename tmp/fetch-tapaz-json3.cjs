const fs = require('fs');

function searchJson() {
    try {
        const html = fs.readFileSync('C:\\Users\\user\\texnosat-ai-marketplace\\tmp\\tapaz-dump.html', 'utf8');
        
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!jsonMatch) {
            console.log('No JSON found'); return;
        }
        
        const json = jsonMatch[1];
        
        // Let's find index of "iPhone" or "Samsung"
        const index = json.toLowerCase().indexOf('iphone');
        if (index !== -1) {
            console.log('Found "iphone" at index:', index);
            console.log('Context:', json.substring(index - 100, index + 200));
        } else {
            console.log('No "iphone" found');
        }
        
        const index2 = json.toLowerCase().indexOf('samsung');
        if (index2 !== -1) {
            console.log('\nFound "samsung" at index:', index2);
            console.log('Context:', json.substring(index2 - 100, index2 + 200));
        } else {
            console.log('No "samsung" found');
        }
    } catch (e) { console.error(e); }
}
searchJson();
