const fs = require('fs');

async function testSingleAdGraphql() {
    try {
        const query1 = `
        query {
            __schema {
                queryType {
                    fields {
                        name
                        args { name type { name kind ofType { name kind } } }
                    }
                }
            }
        }`;
        
        const resp1 = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query1 })
        });
        
        const data1 = await resp1.json();
        const adField = data1.data.__schema.queryType.fields.find(f => f.name === 'ad');
        const adDetailsField = data1.data.__schema.queryType.fields.find(f => f.name === 'adDetails');
        
        console.log('ad query args:', JSON.stringify(adField?.args));
        console.log('adDetails query args:', JSON.stringify(adDetailsField?.args));
        
        // Let's test fetch
        const query2 = `
        query($id: ID!) {
            ad(id: $id) {
                body
                contact { name phones { number } }
                photos { url }
                properties { name value }
            }
        }`;
        
        const resp2 = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query2, variables: { id: "43085890" } })
        });
        
        console.log('\nResult:');
        console.log(JSON.stringify(await resp2.json()).substring(0, 500));

    } catch (e) {
        console.error(e);
    }
}
testSingleAdGraphql();
