const fs = require('fs');

async function testSourceEnum() {
    try {
        const query1 = `
        query {
            __type(name: "SourceEnum") {
                enumValues { name }
            }
        }`;
        
        const resp1 = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query1 })
        });
        
        const data1 = await resp1.json();
        console.log('SourceEnum values:');
        console.log(data1.data.__type.enumValues.map(e => e.name));
        
        const validSource = data1.data.__type.enumValues[0].name;

        // Try query with validSource and NO sourceLink (since sourceLink caused issues)
        const query2 = `
        query {
            ads(first: 3, source: ${validSource}) {
                edges {
                    node { id title price photo { url } }
                }
            }
        }`;
        
        const resp2 = await fetch('https://tap.az/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query2 })
        });
        
        const data2 = await resp2.json();
        console.log('\nAds Result with basic query:');
        console.log(JSON.stringify(data2).substring(0, 500));
        
        if (!data2.errors) {
            // Try query with sourceLink
            const query3 = `
            query($link: String!) {
                ads(first: 3, source: ${validSource}, sourceLink: $link) {
                    edges {
                        node { id title price photo { url } }
                    }
                }
            }`;
            const resp3 = await fetch('https://tap.az/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: query3,
                    variables: { link: "/elanlar/elektronika/telefonlar" }
                })
            });
            const data3 = await resp3.json();
            console.log('\nAds Result with sourceLink:');
            console.log(JSON.stringify(data3).substring(0, 500));
        }

    } catch (e) {
        console.error(e);
    }
}
testSourceEnum();
