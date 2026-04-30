-- knowledgelib.io — Security Hardening
-- Migration: 005_security_hardening
-- Created: 2026-02-16
--
-- 1. Add standalone index on knowledge_cards.status
-- 2. Replace permissive anon_insert_clicks RLS policy

-- ============================================================
-- INDEX: standalone status filter
-- reconcile.js queries WHERE status = 'active' — currently
-- only partially covered by idx_cards_next_review.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cards_status
  ON knowledge_cards (status);

-- ============================================================
-- POLICY: Replace the wide-open anon_insert_clicks
-- with one that validates link_id references an active link.
--
-- The subquery ensures:
--   a) The link_id actually exists in affiliate_links
--   b) The referenced link is currently active
-- This prevents phantom click logging for non-existent or
-- deactivated links.
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_clicks" ON affiliate_click_log;

CREATE POLICY "anon_insert_clicks"
  ON affiliate_click_log
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliate_links
      WHERE affiliate_links.id = link_id
        AND affiliate_links.is_active = true
    )
  );
