const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node run_migration.js <file1.sql> [file2.sql] ...');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL.\n');

    for (const file of files) {
      const filePath = path.resolve(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running ${file}...`);
      await client.query(sql);
      console.log(`  Done.\n`);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
