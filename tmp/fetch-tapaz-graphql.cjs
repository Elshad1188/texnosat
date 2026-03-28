const fs = require('fs');

async function exploreGraphQL() {
    try {
        console.log('Sending Introspection Query...');
        const introspectionQuery = `
        query {
            __schema {
                queryType { name }
                mutationType { name }
                types {
                    ...FullType
                }
            }
        }
        fragment FullType on __Type {
            kind
            name
            fields(includeDeprecated: true) {
                name
                args {
                    name
                    type { name kind }
                }
            }
        }`;
        
        const resp = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: introspectionQuery })
        });
        
        const data = await resp.json();
        const types = data.data.__schema.types;
        
        // Find Query root type usually "Query" or "RootQueryType"
        const queryTypeName = data.data.__schema.queryType.name;
        const queryType = types.find(t => t.name === queryTypeName);
        
        console.log('Available Query Fields:');
        const adQueries = queryType.fields.filter(f => 
            f.name.toLowerCase().includes('ad') || 
            f.name.toLowerCase().includes('search') ||
            f.name.toLowerCase().includes('feed')
        );
        adQueries.forEach(q => console.log(' - ' + q.name));

        // Let's test a generic ads query if it exists
        const testQuery = `
        query {
            ads(first: 5, q: { categoryId: 619 }) {
                edges {
                    node {
                        id
                        title
                        priceStr
                        slug
                        posterUrl
                    }
                }
            }
        }`;

        console.log('\nTesting direct ads query...');
        const adsResp = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: testQuery })
        });
        
        if (adsResp.ok) {
            const adsData = await adsResp.json();
            console.log('Ads Response:', JSON.stringify(adsData).substring(0, 500));
        } else {
            console.log('Ads Query Failed:', await adsResp.text());
        }
        
    } catch (e) {
        console.error(e);
    }
}
exploreGraphQL();
