const fs = require('fs');

async function inspectAdsQuery() {
    try {
        const query = `
        query {
            __schema {
                queryType {
                    fields {
                        name
                        args {
                            name
                            type { name kind ofType { name kind } }
                        }
                        type { name kind ofType { name kind } }
                    }
                }
                types {
                    name
                    fields {
                        name
                        type { name kind ofType { name kind } }
                    }
                }
            }
        }`;
        
        const resp = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        const data = await resp.json();
        
        const adsField = data.data.__schema.queryType.fields.find(f => f.name === 'ads');
        console.log('--- "ads" Query Arguments ---');
        console.log(JSON.stringify(adsField.args, null, 2));
        
        const adType = data.data.__schema.types.find(t => t.name === 'Ad');
        console.log('\n--- "Ad" Type Fields ---');
        adType.fields.forEach(f => {
            const typeStr = f.type.name || f.type.ofType?.name || 'Unknown';
            console.log(` - ${f.name}: ${typeStr}`);
        });

    } catch (e) {
        console.error(e);
    }
}
inspectAdsQuery();
