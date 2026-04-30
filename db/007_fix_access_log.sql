-- knowledgelib.io — Fix Card Access Log for Complete Query Tracking
-- Migration: 007_fix_access_log
-- Created: 2026-02-16
--
-- Problem: card_access_log.card_id is NOT NULL, which silently rejects
-- all search-level queries (no specific card). Every API search was lost.
-- Also: access_channel CHECK constraint too narrow for new integration channels.

-- ============================================================
-- 1. Make card_id nullable (search queries have no specific card)
-- ============================================================
ALTER TABLE card_access_log ALTER COLUMN card_id DROP NOT NULL;

-- ============================================================
-- 2. Widen access_channel CHECK to include integration channels
-- ============================================================
ALTER TABLE card_access_log DROP CONSTRAINT IF EXISTS card_access_log_access_channel_check;
ALTER TABLE card_access_log ADD CONSTRAINT card_access_log_access_channel_check
  CHECK (access_channel IN ('web', 'api', 'mcp', 'raw_md', 'n8n', 'langchain'));

-- ============================================================
-- 3. Add RLS policy for anon inserts (table had no RLS at all)
-- ============================================================
ALTER TABLE card_access_log ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (fire-and-forget logging from Cloudflare Functions)
CREATE POLICY "anon_insert_access_log"
  ON card_access_log
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow service_role full access (for analytics queries)
CREATE POLICY "service_role_full_access_log"
  ON card_access_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. Index for agent_type analysis (new integration channels)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_access_agent_type
  ON card_access_log (agent_type, accessed_at DESC)
  WHERE agent_type IS NOT NULL;
