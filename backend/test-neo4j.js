require('dotenv').config();
const neo4j = require('neo4j-driver');

async function test() {
    const driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(
            process.env.NEO4J_USER || 'neo4j',
            process.env.NEO4J_PASSWORD
        )
    );

    try {
        await driver.verifyConnectivity();
        console.log('SUCCESS: Neo4j authentication working!');
    } catch (error) {
        console.log('FAILED:', error.message);
    } finally {
        await driver.close();
    }
}

test();