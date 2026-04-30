-- Migration 010: Content Feedback System
-- Enables agents and users to flag incorrect, outdated, or broken content.
-- Part of the feedback & self-improvement loop from the improvement plan.

-- ============================================================
-- 1. content_feedback table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id text NOT NULL REFERENCES knowledge_cards(id),
  feedback_type text NOT NULL CHECK (feedback_type IN (
    'outdated',       -- Information is no longer current
    'incorrect',      -- Factual error in the content
    'broken_link',    -- Source URL or affiliate link is dead
    'missing_info',   -- Important information is absent
    'other'           -- Catch-all for uncategorized feedback
  )),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low',            -- Minor issue, cosmetic or non-blocking
    'medium',         -- Incorrect detail that could mislead
    'high',           -- Significantly wrong recommendation
    'critical'        -- Dangerous or harmful advice
  )),
  description text NOT NULL CHECK (length(description) >= 10 AND length(description) <= 2000),
  reported_section text,        -- e.g., "Quick Reference", "Code Examples", "Decision Logic"
  source_channel text DEFAULT 'api' CHECK (source_channel IN (
    'api', 'mcp', 'n8n', 'langchain', 'manual'
  )),
  agent_type text,              -- Detected from User-Agent: chatgpt, claude, perplexity, etc.
  reporter_ip text,
  status text DEFAULT 'open' CHECK (status IN (
    'open',           -- Newly reported, not yet reviewed
    'acknowledged',   -- Reviewed, fix planned
    'fixed',          -- Content has been corrected
    'dismissed'       -- Reviewed and determined not actionable
  )),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ============================================================
-- 2. Row Level Security
-- ============================================================

ALTER TABLE content_feedback ENABLE ROW LEVEL SECURITY;

-- Anonymous users can submit feedback
CREATE POLICY "anon_insert_feedback"
  ON content_feedback FOR INSERT TO anon
  WITH CHECK (true);

-- Anonymous users can read all feedback (agents check for known issues)
CREATE POLICY "anon_read_feedback"
  ON content_feedback FOR SELECT TO anon
  USING (true);

-- Service role has full access for management
CREATE POLICY "service_full_feedback"
  ON content_feedback FOR ALL TO service_role
  USING (true);

-- ============================================================
-- 3. Indexes
-- ============================================================

-- Find open issues for a specific card (used by API and reconcile)
CREATE INDEX idx_feedback_card_open
  ON content_feedback (card_id, status)
  WHERE status IN ('open', 'acknowledged');

-- Count open issues per card efficiently (used by catalog generation)
CREATE INDEX idx_feedback_status
  ON content_feedback (status)
  WHERE status IN ('open', 'acknowledged');

-- Find critical issues quickly
CREATE INDEX idx_feedback_severity_critical
  ON content_feedback (severity, created_at DESC)
  WHERE severity = 'critical' AND status = 'open';

-- ============================================================
-- 4. View: open feedback summary per card
-- ============================================================

CREATE OR REPLACE VIEW content_feedback_summary
WITH (security_invoker = true) AS
SELECT
  card_id,
  count(*) FILTER (WHERE status IN ('open', 'acknowledged')) AS open_count,
  count(*) FILTER (WHERE severity = 'critical' AND status = 'open') AS critical_count,
  max(created_at) FILTER (WHERE status = 'open') AS latest_report,
  array_agg(DISTINCT feedback_type) FILTER (WHERE status IN ('open', 'acknowledged')) AS issue_types
FROM content_feedback
GROUP BY card_id;

-- Grant view access to anon
GRANT SELECT ON content_feedback_summary TO anon;
