const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { CardDataSchema } = require('./card_schema');
const { PipelineLogger } = require('./pipeline_logger');

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
 *   "priority": "high",
 *   "buy_links": [
 *     { "slug": "sony-wf-c710n", "product_name": "Sony WF-C710N", "asin": "B0D7XXXXX", "retailer": "amazon_us", "destination_url": "https://www.amazon.com/dp/B0D7XXXXX?tag=knowledgelib-20" }
 *   ]
 * }
 */

const PRIORITY_TO_POP_INDEX = { high: 100, medium: 70, low: 0 };

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

  let logger;
  let runId;
  const startMs = Date.now();
  let insertedCount = 0;

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL.\n');

    logger = new PipelineLogger(client);
    runId = await logger.start('insert_card', { files });

    for (const file of files) {
      const filePath = path.resolve(file);

      let rawData;
      try {
        rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (parseErr) {
        console.error(`  Failed to parse ${file}: ${parseErr.message}`);
        if (logger && runId) await logger.fail(runId, parseErr, { duration_ms: Date.now() - startMs, detail: { failed_file: file } });
        process.exit(1);
      }

      const result = CardDataSchema.safeParse(rawData);
      if (!result.success) {
        console.error(`  Validation failed for ${file}:`);
        for (const issue of result.error.issues) {
          console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
        }
        const valErr = new Error(`Validation failed for ${file}`);
        if (logger && runId) await logger.fail(runId, valErr, { duration_ms: Date.now() - startMs, detail: { failed_file: file, issues: result.error.issues.length } });
        process.exit(1);
      }
      const data = result.data;

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
            status, published_at, pop_index
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',NOW(),$15)
          ON CONFLICT (id) DO UPDATE SET
            canonical_question = EXCLUDED.canonical_question,
            aliases = EXCLUDED.aliases,
            confidence = EXCLUDED.confidence,
            token_estimate = EXCLUDED.token_estimate,
            source_count = EXCLUDED.source_count,
            pop_index = EXCLUDED.pop_index,
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
          data.html_path,
          PRIORITY_TO_POP_INDEX[data.priority] !== undefined ? PRIORITY_TO_POP_INDEX[data.priority] : 0
        ]);
        console.log('  knowledge_cards: inserted.');

        // Insert affiliate links (if any)
        const buyLinks = data.buy_links || [];
        if (buyLinks.length > 0) {
          for (const link of buyLinks) {
            await client.query(`
              INSERT INTO affiliate_links (slug, card_id, product_name, product_asin, retailer, affiliate_tag, destination_url, destination_url_clean)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (slug) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                product_asin = EXCLUDED.product_asin,
                retailer = EXCLUDED.retailer,
                affiliate_tag = EXCLUDED.affiliate_tag,
                destination_url = EXCLUDED.destination_url,
                destination_url_clean = EXCLUDED.destination_url_clean,
                updated_at = NOW()
            `, [
              link.slug,
              data.id,
              link.product_name,
              link.asin || null,
              link.retailer || 'amazon_us',
              link.affiliate_tag || 'knowledgelib-20',
              link.destination_url,
              link.destination_url_clean || link.destination_url.split('?')[0]
            ]);
          }
          console.log(`  affiliate_links: ${buyLinks.length} links inserted.`);
        }

        await client.query('COMMIT');
        insertedCount++;
        console.log(`  Done.\n`);
      } catch (txErr) {
        await client.query('ROLLBACK');
        console.error(`  ROLLBACK for ${data.id}: ${txErr.message}`);
        throw txErr;
      }
    }

    console.log('All cards inserted successfully.');
    await logger.complete(runId, {
      cards_affected: insertedCount,
      duration_ms: Date.now() - startMs,
      detail: { files_processed: files.length },
    });
  } catch (err) {
    console.error('Insert failed:', err.message);
    if (logger && runId) await logger.fail(runId, err, { cards_affected: insertedCount, duration_ms: Date.now() - startMs });
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
