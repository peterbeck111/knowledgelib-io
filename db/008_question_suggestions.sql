-- knowledgelib.io — Agent Question Suggestions
-- Migration: 008_question_suggestions
-- Created: 2026-02-17
--
-- Enables agents to suggest questions via API / auto-capture from failed queries.
-- Leverages existing discovered_questions table from 001_initial_schema.
-- Adds source tracking, status workflow, RLS, atomic upsert RPC, and analytics view.

-- ============================================================
-- 1. Add source tracking columns to discovered_questions
-- ============================================================

-- Where this suggestion originated
ALTER TABLE discovered_questions
  ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'auto_capture'
    CHECK (source_channel IN ('auto_capture', 'api_suggest', 'mcp', 'n8n', 'langchain', 'manual'));

-- Which type of agent submitted it
ALTER TABLE discovered_questions
  ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Optional context about why the agent needs this
ALTER TABLE discovered_questions
  ADD COLUMN IF NOT EXISTS context TEXT;

-- Optional domain hint (e.g., "home", "consumer_electronics > audio")
ALTER TABLE discovered_questions
  ADD COLUMN IF NOT EXISTS domain_hint TEXT;

-- Workflow status for the suggestion pipeline
ALTER TABLE discovered_questions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'created'));

-- ============================================================
-- 2. Fix NULL uniqueness gap
--
-- The existing UNIQUE(card_id, normalized_text) doesn't enforce
-- uniqueness when card_id IS NULL (SQL standard: NULL != NULL).
-- This partial index ensures each unique question text appears
-- at most once in the unmatched (card_id IS NULL) set.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_unique_unmatched
  ON discovered_questions (normalized_text)
  WHERE card_id IS NULL;

-- ============================================================
-- 3. Enable RLS on discovered_questions
-- ============================================================

ALTER TABLE discovered_questions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (fire-and-forget from Cloudflare Functions)
CREATE POLICY "anon_insert_suggestions"
  ON discovered_questions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous reads (for GET /api/v1/suggestions and catalog matching)
CREATE POLICY "anon_read_suggestions"
  ON discovered_questions
  FOR SELECT
  TO anon
  USING (true);

-- Service role full access (for reconcile, admin, pipeline)
CREATE POLICY "service_role_full_suggestions"
  ON discovered_questions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. Index for top unanswered questions query
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_discovered_pending_popular
  ON discovered_questions (occurrence_count DESC, last_seen_at DESC)
  WHERE card_id IS NULL AND status = 'pending';

-- ============================================================
-- 5. Atomic upsert function (SECURITY DEFINER)
--
-- Called via Supabase RPC from Cloudflare Functions.
-- Handles dedup, increments occurrence_count, upgrades
-- source_channel from auto_capture to api_suggest on
-- explicit submission.
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_question_suggestion(
  p_question TEXT,
  p_normalized TEXT,
  p_source_channel TEXT DEFAULT 'api_suggest',
  p_agent_type TEXT DEFAULT NULL,
  p_context TEXT DEFAULT NULL,
  p_domain_hint TEXT DEFAULT NULL
) RETURNS TABLE(
  suggestion_id BIGINT,
  is_duplicate BOOLEAN,
  total_count INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id BIGINT;
  v_count INTEGER;
  v_is_dup BOOLEAN;
BEGIN
  -- Try to find existing unmatched question
  SELECT dq.id, dq.occurrence_count INTO v_id, v_count
  FROM discovered_questions dq
  WHERE dq.normalized_text = p_normalized
    AND dq.card_id IS NULL
  FOR UPDATE;

  IF FOUND THEN
    -- Update existing: increment count, refresh timestamp
    UPDATE discovered_questions
    SET occurrence_count = discovered_questions.occurrence_count + 1,
        last_seen_at = NOW(),
        -- Upgrade from auto_capture to explicit suggest
        source_channel = CASE
          WHEN discovered_questions.source_channel = 'auto_capture'
               AND p_source_channel != 'auto_capture'
          THEN p_source_channel
          ELSE discovered_questions.source_channel
        END,
        -- Update context/domain if provided and not already set
        context = COALESCE(discovered_questions.context, p_context),
        domain_hint = COALESCE(discovered_questions.domain_hint, p_domain_hint),
        is_new_card_candidate = TRUE
    WHERE discovered_questions.id = v_id;

    v_is_dup := TRUE;
    v_count := v_count + 1;
  ELSE
    -- Insert new suggestion
    INSERT INTO discovered_questions (
      question_text, normalized_text, source_channel, agent_type,
      context, domain_hint, is_new_card_candidate, status
    ) VALUES (
      p_question, p_normalized, p_source_channel, p_agent_type,
      p_context, p_domain_hint, TRUE, 'pending'
    )
    RETURNING id INTO v_id;

    v_is_dup := FALSE;
    v_count := 1;
  END IF;

  RETURN QUERY SELECT v_id, v_is_dup, v_count;
END;
$$;

-- Grant execute to anon (Cloudflare Functions use anon key)
GRANT EXECUTE ON FUNCTION upsert_question_suggestion TO anon;

-- ============================================================
-- 6. View: top unanswered questions (ranked by demand)
-- ============================================================

CREATE OR REPLACE VIEW top_unanswered_questions AS
SELECT
  id,
  question_text,
  normalized_text,
  occurrence_count,
  first_seen_at,
  last_seen_at,
  source_channel,
  agent_type,
  domain_hint,
  context,
  (last_seen_at - first_seen_at) AS demand_duration
FROM discovered_questions
WHERE card_id IS NULL
  AND status = 'pending'
  AND is_new_card_candidate = TRUE
ORDER BY occurrence_count DESC, last_seen_at DESC;
