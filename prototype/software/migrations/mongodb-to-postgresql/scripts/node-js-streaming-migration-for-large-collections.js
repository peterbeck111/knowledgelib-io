// Input:  MongoDB collection with millions of documents
// Output: Data streamed into PostgreSQL using COPY protocol for maximum throughput

const { MongoClient } = require('mongodb');     // mongodb@6.12.0
const { Pool } = require('pg');                  // pg@8.13.0
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const copyFrom = require('pg-copy-streams').from; // pg-copy-streams@6.0.6

const MONGO_URI = 'mongodb://localhost:27017';
const PG_DSN = 'postgresql://postgres:secret@localhost/myapp';

async function streamMigrate(dbName, collectionName, pgTable, transformDoc) {
    const mongo = new MongoClient(MONGO_URI);
    const pg = new Pool({ connectionString: PG_DSN });

    await mongo.connect();
    const collection = mongo.db(dbName).collection(collectionName);
    const total = await collection.estimatedDocumentCount();
    let count = 0;

    const pgClient = await pg.connect();
    const copyStream = pgClient.query(
        copyFrom(`COPY ${pgTable} FROM STDIN WITH (FORMAT csv, HEADER false, NULL '\\N')`)
    );

    const mongoStream = collection.find().stream();

    const transformer = new Transform({
        objectMode: true,
        transform(doc, _encoding, callback) {
            count++;
            try {
                const row = transformDoc(doc);
                // Escape CSV: quote fields containing commas/newlines/quotes
                const csv = row.map(field => {
                    if (field === null || field === undefined) return '\\N';
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(',') + '\n';
                callback(null, csv);
            } catch (err) {
                callback(err);
            }
            if (count % 50000 === 0) {
                console.log(`  ${count}/${total} (${((count/total)*100).toFixed(1)}%)`);
            }
        }
    });

    await pipeline(mongoStream, transformer, copyStream);

    console.log(`Migration complete: ${count} rows loaded into ${pgTable}`);
    pgClient.release();
    await pg.end();
    await mongo.close();
}

// Usage
streamMigrate('myapp', 'orders', 'orders', (doc) => [
    doc._id.toString(),           // mongo_id
    doc.userId?.toString(),       // user_mongo_id (resolve FK later)
    doc.total || 0,               // amount
    doc.status || 'pending',      // status
    doc.createdAt?.toISOString(), // created_at
    JSON.stringify(doc.items),    // line_items as JSONB
]);
