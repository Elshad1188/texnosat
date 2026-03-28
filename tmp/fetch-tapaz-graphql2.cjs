const fs = require('fs');

async function testAdsQuery() {
    try {
        const query1 = `
        query($link: String!) {
            ads(first: 3, source: WEB, sourceLink: $link) {
                edges {
                    node {
                        id title price path photo { url }
                    }
                }
            }
        }`;
        
        const resp1 = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: query1,
                variables: { link: "/elanlar/elektronika/telefonlar" }
            })
        });
        
        let data1 = await resp1.json();
        console.log('Result with sourceLink:');
        console.log(JSON.stringify(data1).substring(0, 300));
        
        if (data1.errors) {
            // Let's inspect AdFilterInput
            const query2 = `
            query {
                __type(name: "AdFilterInput") {
                    inputFields { name type { name kind ofType { name kind } } }
                }
            }`;
            const resp2 = await fetch('https://tap.az/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query2 })
            });
            console.log('\nAdFilterInput fields:');
            const data2 = await resp2.json();
            console.log(JSON.stringify(data2.data.__type.inputFields, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}
testAdsQuery();
