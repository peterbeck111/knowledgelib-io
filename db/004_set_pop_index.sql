-- knowledgelib.io — Set pop_index for existing cards + RLS for card reads
-- Migration: 004_set_pop_index
-- Created: 2026-02-11
--
-- Sets initial pop_index based on tracker priority:
--   high   → 100 → refresh_interval = 30 days (monthly)
--   medium →  70 → refresh_interval = ~130 days (quarterly)
--   low    →   0 → refresh_interval = 365 days (yearly)
--
-- The trg_card_refresh_schedule trigger fires on UPDATE OF pop_index
-- and auto-recomputes refresh_interval and next_review_at.

-- ============================================================
-- High-priority cards → pop_index = 100 (monthly refresh)
-- ============================================================
UPDATE knowledge_cards
SET pop_index = 100
WHERE id IN (
    'consumer-electronics/audio/wireless-earbuds-under-150/2026',
    'energy/us/interconnection-queue/status-2025',
    'consumer-electronics/audio/noise-cancelling-headphones-under-200/2026',
    'consumer-electronics/audio/noise-cancelling-headphones-under-400/2026',
    'consumer-electronics/audio/wireless-earbuds-over-150/2026',
    'consumer-electronics/audio/soundbars-under-300/2026',
    'consumer-electronics/audio/soundbars-under-1000/2026',
    'consumer-electronics/audio/wireless-earbuds-for-running/2026',
    'consumer-electronics/audio/bluetooth-speakers-under-100/2026'
);

-- ============================================================
-- Medium-priority cards → pop_index = 70 (quarterly refresh)
-- ============================================================
UPDATE knowledge_cards
SET pop_index = 70
WHERE id = 'consumer-electronics/audio/bluetooth-speakers-under-300/2026';

-- ============================================================
-- RLS: Allow anon reads on knowledge_cards (for client-side
-- verified-date.js to fetch updated_at via Supabase REST API)
-- ============================================================
ALTER TABLE knowledge_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_card_metadata"
    ON knowledge_cards
    FOR SELECT
    TO anon
    USING (status = 'active');
