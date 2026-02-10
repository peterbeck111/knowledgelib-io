const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Insert a knowledge card + affiliate links into Supabase.
 *
 * Usage: node insert_card.js <card_data.json>
 *
 * Expected JSON shape:
 * {
 *   "id": "consumer-electronics/audio/wireless-earbuds-under-150/2026",
 *   "category": "consumer-electronics",
 *   "subcategory": "audio",
 *   "topic": "wireless-earbuds-under-150",
 *   "version_tag": "2026",
 *   "canonical_question": "What are the best wireless earbuds under $150 in 2026?",
 *   "aliases": ["best budget earbuds 2026", ...],
 *   "entity_type": "product_comparison",
 *   "region": "global",
 *   "confidence": 0.88,
 *   "token_estimate": 1800,
 *   "source_count": 8,
 *   "md_path": "/consumer-electronics/audio/wireless-earbuds-under-150/2026.md",
 *   "html_path": "/consumer-electronics/audio/wireless-earbuds-under-150/2026.html",
 *   "buy_links": [
 *     { "slug": "sony-wf-c710n", "product_name": "Sony WF-C710N", "retailer": "amazon_us", "destination_url": "https://www.amazon.com/dp/..." }
 *   ]
 * }
 */

async function run() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node insert_card.js <card_data.json> [card_data2.json] ...');
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
      const filePath = path.resolve(file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      console.log(`Inserting card: ${data.id}`);

      // Wrap each card in a transaction for atomicity
      await client.query('BEGIN');

      try {
        // Insert into knowledge_cards
        await client.query(`
          INSERT INTO knowledge_cards (
            id, category, subcategory, topic, version_tag,
            canonical_question, aliases, entity_type, region,
            confidence, token_estimate, source_count,
            md_path, html_path,
            status, published_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',NOW())
          ON CONFLICT (id) DO UPDATE SET
            canonical_question = EXCLUDED.canonical_question,
            aliases = EXCLUDED.aliases,
            confidence = EXCLUDED.confidence,
            token_estimate = EXCLUDED.token_estimate,
            source_count = EXCLUDED.source_count,
            updated_at = NOW(),
            content_version = knowledge_cards.content_version + 1
        `, [
          data.id,
          data.category,
          data.subcategory,
          data.topic,
          data.version_tag,
          data.canonical_question,
          data.aliases || [],
          data.entity_type || 'product_comparison',
          data.region || 'global',
          data.confidence,
          data.token_estimate,
          data.source_count,
          data.md_path,
          data.html_path
        ]);
        console.log('  knowledge_cards: inserted.');

        // Insert affiliate links (if any)
        const buyLinks = data.buy_links || [];
        if (buyLinks.length > 0) {
          for (const link of buyLinks) {
            await client.query(`
              INSERT INTO affiliate_links (slug, card_id, product_name, retailer, destination_url, destination_url_clean)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (slug) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                retailer = EXCLUDED.retailer,
                destination_url = EXCLUDED.destination_url,
                updated_at = NOW()
            `, [
              link.slug,
              data.id,
              link.product_name,
              link.retailer || 'amazon_us',
              link.destination_url,
              link.destination_url_clean || link.destination_url.split('?')[0]
            ]);
          }
          console.log(`  affiliate_links: ${buyLinks.length} links inserted.`);
        }

        await client.query('COMMIT');
        console.log(`  Done.\n`);
      } catch (txErr) {
        await client.query('ROLLBACK');
        console.error(`  ROLLBACK for ${data.id}: ${txErr.message}`);
        throw txErr;
      }
    }

    console.log('All cards inserted successfully.');
  } catch (err) {
    console.error('Insert failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
