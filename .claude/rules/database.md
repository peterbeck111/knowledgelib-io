---
paths:
  - "db/**"
  - "functions/**"
---

# Database Rules

## Schema
- PostgreSQL on Supabase
- Tables: `knowledge_cards`, `affiliate_links`, `card_access_log`, `affiliate_click_log`, `pipeline_log`, `discovered_questions`, `content_feedback`
- `content_feedback`: agent/user reports on incorrect, outdated, or broken content. Fields: `card_id`, `feedback_type` (outdated/incorrect/broken_link/missing_info/other), `severity` (low/medium/high/critical), `description`, `reported_section`, `source_channel`, `agent_type`, `status` (open/acknowledged/fixed/dismissed). RLS: anon insert + read, service_role full. View: `content_feedback_summary` (open + critical counts per card)
- Migration: `db/010_content_feedback.sql`

## Insert Operations
- Insert via: `node db/insert_card.js knowledge_pipeline/card_data_{topic}.json`
- **Zod validation**: Both insert scripts validate card JSON against `db/card_schema.js` before any DB operations. Malformed data (bad confidence, missing fields, invalid ASIN format) is rejected with per-field error messages. Schema includes: `TemporalValiditySchema`, `RelatedKoSchema`, `InputNeededSchema`, `RuleScopeSchema`, `SkipConditionSchema`. Entity types: `product_comparison`, `software_reference`, `fact`, `concept`, `rule`. Relationship types: `depends_on`, `related_to`, `solves`, `alternative_to`, `often_confused_with`. New optional fields: `constraints` (string array), `skip_this_unit_if` (SkipCondition array with condition + use_instead).
- ON CONFLICT updates existing cards (increments content_version)
- Priority maps to pop_index: high → 100, medium → 70, low → 0

## Observability
- `pipeline_log` table records every pipeline run (reconcile, insert_card, indexnow, deploy) with status, duration, card count, and error details
- Query failures: `SELECT * FROM pipeline_log WHERE status = 'failed' ORDER BY started_at DESC;`
- `PipelineLogger` class in `db/pipeline_logger.js` (start/complete/fail) used by insert + reconcile
- Access logging: All API queries logged to `card_access_log` via `context.waitUntil()` (fire-and-forget). Includes: access_channel, agent_type (detected from User-Agent), query text.
- Error logging: API and redirect errors persisted to `pipeline_log` via Supabase REST (fire-and-forget). Uses `SUPABASE_SERVICE_ROLE_KEY` (falls back to anon key).
