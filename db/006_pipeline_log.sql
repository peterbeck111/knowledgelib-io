-- knowledgelib.io — Pipeline Observability
-- Migration: 006_pipeline_log
-- Created: 2026-02-16
--
-- Persistent log for all pipeline operations (reconcile, insert, indexnow).
-- Replaces console-only logging with a queryable audit trail.

-- ============================================================
-- TABLE: pipeline_log
-- One row per pipeline run (reconcile, insert_card, indexnow, deploy).
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id        UUID DEFAULT gen_random_uuid(),
  operation     TEXT NOT NULL,           -- 'reconcile' | 'insert_card' | 'indexnow' | 'deploy'
  status        TEXT NOT NULL DEFAULT 'started',  -- 'started' | 'completed' | 'failed'
  cards_affected INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  detail        JSONB DEFAULT '{}',      -- operation-specific metadata
  error_message TEXT,
  error_stack   TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Index for querying recent failures
CREATE INDEX IF NOT EXISTS idx_pipeline_log_status
  ON pipeline_log (status) WHERE status = 'failed';

-- Index for querying by operation type
CREATE INDEX IF NOT EXISTS idx_pipeline_log_operation
  ON pipeline_log (operation, started_at DESC);

-- RLS: pipeline_log is internal-only — no anon access
ALTER TABLE pipeline_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write (no anon policy = blocked by default)
CREATE POLICY "service_role_full_access"
  ON pipeline_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
