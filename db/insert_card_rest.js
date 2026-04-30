const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { CardDataSchema } = require('./card_schema');
const { PipelineLoggerRest } = require('./pipeline_logger_rest');

/**
 * Insert a knowledge card + affiliate links into Supabase via REST API.
 * Fallback for when direct PostgreSQL connection is unavailable (IPv6-only hosts).
 *
 * Usage: node insert_card_rest.js <card_data.json>
 */

const PRIORITY_TO_POP_INDEX = { high: 100, medium: 70, low: 0 };

function supabaseRequest(urlPath, method, body, headersExtra) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.SUPABASE_URL + urlPath);
    const postData = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: Object.assign({
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(postData)
      }, headersExtra || {})
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node insert_card_rest.js <card_data.json>');
    process.exit(1);
  }

  const logger = new PipelineLoggerRest(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let runId;
  const startMs = Date.now();
  let insertedCount = 0;

  try {
    runId = await logger.start('insert_card', { variant: 'rest', files });

    for (const file of files) {
      const filePath = path.resolve(file);

      let rawData;
      try {
        rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (parseErr) {
        console.error(`  Failed to parse ${file}: ${parseErr.message}`);
        if (runId) await logger.fail(runId, parseErr, { duration_ms: Date.now() - startMs, detail: { failed_file: file } });
        process.exit(1);
      }

      const result = CardDataSchema.safeParse(rawData);
      if (!result.success) {
        console.error(`  Validation failed for ${file}:`);
        for (const issue of result.error.issues) {
          console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
        }
        const valErr = new Error(`Validation failed for ${file}`);
        if (runId) await logger.fail(runId, valErr, { duration_ms: Date.now() - startMs, detail: { failed_file: file, issues: result.error.issues.length } });
        process.exit(1);
      }
      const data = result.data;

      console.log('Inserting card:', data.id);

      const popIndex = PRIORITY_TO_POP_INDEX[data.priority];
      const cardPayload = {
        id: data.id,
        category: data.category,
        subcategory: data.subcategory,
        topic: data.topic,
        version_tag: data.version_tag,
        canonical_question: data.canonical_question,
        aliases: data.aliases,
        entity_type: data.entity_type || 'product_comparison',
        region: data.region || 'global',
        confidence: data.confidence,
        token_estimate: data.token_estimate,
        source_count: data.source_count,
        md_path: data.md_path,
        html_path: data.html_path,
        status: 'active',
        published_at: new Date().toISOString(),
        pop_index: popIndex !== undefined ? popIndex : 0
      };

      const cardRes = await supabaseRequest('/rest/v1/knowledge_cards', 'POST', cardPayload);
      if (cardRes.status >= 200 && cardRes.status < 300) {
        console.log('  knowledge_cards: inserted.');
      } else {
        throw new Error(`knowledge_cards FAILED: ${cardRes.status} ${cardRes.body}`);
      }

      // Upsert affiliate links: insert one-by-one, skip duplicates gracefully
      const links = data.buy_links || [];
      if (links.length > 0) {
        let linkOk = 0, linkSkip = 0;
        for (const l of links) {
          const payload = {
            slug: l.slug,
            card_id: data.id,
            product_name: l.product_name,
            product_asin: l.asin || null,
            retailer: l.retailer || 'amazon_us',
            affiliate_tag: 'knowledgelib-20',
            destination_url: l.destination_url,
            destination_url_clean: l.destination_url.split('?')[0]
          };
          const linkRes = await supabaseRequest('/rest/v1/affiliate_links', 'POST', payload);
          if (linkRes.status >= 200 && linkRes.status < 300) {
            linkOk++;
          } else if (linkRes.status === 409) {
            linkSkip++; // duplicate slug, skip
          } else {
            console.warn(`  affiliate_link ${l.slug}: unexpected ${linkRes.status}`);
          }
        }
        console.log(`  affiliate_links: ${linkOk} new, ${linkSkip} existing (skipped).`);
      }

      insertedCount++;
      console.log('  Done.\n');
    }

    console.log('All cards inserted successfully.');
    await logger.complete(runId, {
      cards_affected: insertedCount,
      duration_ms: Date.now() - startMs,
      detail: { variant: 'rest', files_processed: files.length },
    });
  } catch (err) {
    console.error('Insert failed:', err.message);
    if (runId) await logger.fail(runId, err, { cards_affected: insertedCount, duration_ms: Date.now() - startMs });
    process.exit(1);
  }
}

run();
