-- knowledgelib.io — Initial Database Schema
-- Migration: 001_initial_schema
-- Database: PostgreSQL (Neon on Vercel)
-- Created: 2026-02-09
--
-- Design principles:
--   1. Full auditability — every change to every card is logged
--   2. Agent tracking — capture how agents find us and what they asked
--   3. Popularity-driven refresh — pop_index determines update frequency
--   4. PostgreSQL-native types — arrays, JSONB, timestamptz, intervals

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ============================================================
-- TABLE: knowledge_cards
-- The master registry of all knowledge units (md + html pairs)
-- ============================================================
CREATE TABLE knowledge_cards (
    -- Identity
    id                  TEXT PRIMARY KEY,           -- e.g. 'consumer-electronics/audio/wireless-earbuds-under-150/2026'
    category            TEXT NOT NULL,              -- e.g. 'consumer-electronics'
    subcategory         TEXT NOT NULL,              -- e.g. 'audio'
    topic               TEXT NOT NULL,              -- e.g. 'wireless-earbuds-under-150'
    version_tag         TEXT NOT NULL,              -- e.g. '2026', 'status-2025' (the filename part)

    -- Content metadata
    canonical_question  TEXT NOT NULL,
    aliases             TEXT[] DEFAULT '{}',        -- alternative phrasings for discovery
    entity_type         TEXT,                       -- 'product_comparison', 'explainer', 'market_data', etc.
    region              TEXT DEFAULT 'global',
    confidence          NUMERIC(3,2),               -- 0.00–1.00
    token_estimate      INTEGER,
    source_count        INTEGER,

    -- File paths (relative to site root)
    md_path             TEXT NOT NULL,
    html_path           TEXT NOT NULL,

    -- Status
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'needs_review', 'updating', 'archived')),

    -- Popularity & refresh scheduling
    pop_index           NUMERIC(5,2) DEFAULT 0,    -- 0 (no traffic) to 100 (most popular)
    refresh_interval    INTERVAL NOT NULL DEFAULT INTERVAL '365 days',  -- computed from pop_index
    access_count_30d    INTEGER DEFAULT 0,          -- rolling 30-day access count (updated by cron/function)

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ,
    next_review_at      TIMESTAMPTZ,                -- when this card should be reviewed/refreshed
    last_reviewed_at    TIMESTAMPTZ,                -- when it was last actually reviewed

    -- Versioning
    content_version     INTEGER NOT NULL DEFAULT 1,
    content_hash        TEXT                         -- SHA-256 of the .md file, to detect actual content changes
);

-- Index for finding cards due for refresh
CREATE INDEX idx_cards_next_review ON knowledge_cards (next_review_at)
    WHERE status IN ('active', 'needs_review');

-- Index for category browsing
CREATE INDEX idx_cards_category ON knowledge_cards (category, subcategory, topic);

-- Index for popularity ranking
CREATE INDEX idx_cards_pop ON knowledge_cards (pop_index DESC);

-- ============================================================
-- TABLE: card_access_log
-- Every page view / API call / MCP request — how agents find us
-- This is your analytics + agent question tracking table
-- ============================================================
CREATE TABLE card_access_log (
    id                  BIGSERIAL PRIMARY KEY,
    card_id             TEXT NOT NULL REFERENCES knowledge_cards(id),
    accessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- How they arrived
    access_channel      TEXT NOT NULL DEFAULT 'web'
                        CHECK (access_channel IN ('web', 'api', 'mcp', 'raw_md')),
    http_method         TEXT,                       -- GET, POST, etc.

    -- What they asked (the key insight for alias refinement)
    agent_query         TEXT,                       -- the search query or API query param
    referer             TEXT,                       -- HTTP Referer header (may contain search query)
    search_engine       TEXT,                       -- extracted: 'google', 'bing', 'perplexity', etc.

    -- Who they are (anonymized)
    user_agent          TEXT,                       -- full User-Agent string
    agent_type          TEXT,                       -- extracted: 'chatgpt', 'claude', 'perplexity', 'browser', 'bot', 'unknown'
    ip_hash             TEXT,                       -- SHA-256 of IP (never store raw IPs)
    country_code        TEXT,                       -- ISO 3166-1 alpha-2 from GeoIP

    -- Response info
    response_status     INTEGER,                    -- HTTP status code
    response_tokens     INTEGER,                    -- tokens served (for API/MCP)

    -- API-specific
    api_key_id          TEXT                        -- links to future api_keys table
);

-- Index for per-card analytics
CREATE INDEX idx_access_card_time ON card_access_log (card_id, accessed_at DESC);

-- Index for agent question analysis
CREATE INDEX idx_access_query ON card_access_log (agent_query)
    WHERE agent_query IS NOT NULL;

-- Index for channel breakdown
CREATE INDEX idx_access_channel ON card_access_log (access_channel, accessed_at DESC);

-- Partition hint: when this table grows, partition by month on accessed_at
COMMENT ON TABLE card_access_log IS
    'Every access event. Partition by accessed_at monthly when >1M rows.';


-- ============================================================
-- TABLE: card_audit_log
-- Full audit trail: every change to every card, with before/after
-- ============================================================
CREATE TABLE card_audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    card_id             TEXT NOT NULL REFERENCES knowledge_cards(id),
    action              TEXT NOT NULL
                        CHECK (action IN (
                            'create', 'update', 'publish', 'archive',
                            'restore', 'review_complete', 'refresh_start', 'refresh_complete'
                        )),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by          TEXT NOT NULL,              -- 'system', 'api', 'admin:peter', agent name, etc.

    -- What changed (JSONB snapshots for full auditability)
    old_values          JSONB,                      -- fields before change (null on create)
    new_values          JSONB,                      -- fields after change

    -- Context
    change_reason       TEXT,                       -- 'scheduled refresh', 'manual update', 'new sources available'
    change_source       TEXT                        -- 'admin_ui', 'api', 'cron', 'manual'
);

-- Index for card history
CREATE INDEX idx_audit_card_time ON card_audit_log (card_id, changed_at DESC);

-- Index for finding all actions by a specific actor
CREATE INDEX idx_audit_actor ON card_audit_log (changed_by, changed_at DESC);


-- ============================================================
-- TABLE: discovered_questions
-- Aggregated unique questions from access logs
-- Used to refine aliases and discover new card opportunities
-- ============================================================
CREATE TABLE discovered_questions (
    id                  BIGSERIAL PRIMARY KEY,
    card_id             TEXT REFERENCES knowledge_cards(id),  -- NULL if no card matched
    question_text       TEXT NOT NULL,
    normalized_text     TEXT NOT NULL,               -- lowercase, trimmed, for dedup
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrence_count    INTEGER NOT NULL DEFAULT 1,
    is_alias            BOOLEAN DEFAULT FALSE,       -- TRUE if already added to card aliases
    is_new_card_candidate BOOLEAN DEFAULT FALSE,     -- TRUE if this suggests a card we should create

    UNIQUE (card_id, normalized_text)
);

-- Find unanswered questions (potential new cards)
CREATE INDEX idx_discovered_unmatched ON discovered_questions (occurrence_count DESC)
    WHERE card_id IS NULL AND is_new_card_candidate = TRUE;


-- ============================================================
-- FUNCTION: compute_refresh_interval
-- Maps pop_index (0-100) to refresh interval (30-365 days)
--
-- Formula: interval = 365 - (pop_index / 100) * 335
--   pop_index=100 → 30 days  (most popular, refresh monthly)
--   pop_index=50  → 197 days (~6.5 months)
--   pop_index=0   → 365 days (least popular, refresh yearly)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_refresh_interval(p_pop_index NUMERIC)
RETURNS INTERVAL AS $$
BEGIN
    RETURN make_interval(
        days => GREATEST(30, 365 - ROUND((p_pop_index / 100.0) * 335)::INTEGER)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- FUNCTION: update_card_refresh_schedule
-- Called after pop_index changes to recompute next_review_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_card_refresh_schedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Recompute refresh interval from pop_index
    NEW.refresh_interval := compute_refresh_interval(NEW.pop_index);

    -- Set next review based on last review + new interval
    IF NEW.last_reviewed_at IS NOT NULL THEN
        NEW.next_review_at := NEW.last_reviewed_at + NEW.refresh_interval;
    ELSE
        NEW.next_review_at := NOW() + NEW.refresh_interval;
    END IF;

    -- Always update updated_at
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TRIGGER: auto-update refresh schedule when pop_index changes
-- ============================================================
CREATE TRIGGER trg_card_refresh_schedule
    BEFORE INSERT OR UPDATE OF pop_index, last_reviewed_at
    ON knowledge_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_card_refresh_schedule();


-- ============================================================
-- TRIGGER: auto-audit all changes to knowledge_cards
-- ============================================================
CREATE OR REPLACE FUNCTION audit_card_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO card_audit_log (card_id, action, changed_by, new_values)
        VALUES (NEW.id, 'create', COALESCE(current_setting('app.current_user', TRUE), 'system'),
                to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if something actually changed
        IF OLD IS DISTINCT FROM NEW THEN
            INSERT INTO card_audit_log (card_id, action, changed_by, old_values, new_values)
            VALUES (NEW.id, 'update', COALESCE(current_setting('app.current_user', TRUE), 'system'),
                    to_jsonb(OLD), to_jsonb(NEW));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_card_changes
    AFTER INSERT OR UPDATE
    ON knowledge_cards
    FOR EACH ROW
    EXECUTE FUNCTION audit_card_changes();


-- ============================================================
-- VIEW: cards_due_for_refresh
-- Quick way to find what needs updating
-- ============================================================
CREATE VIEW cards_due_for_refresh AS
SELECT
    id,
    category,
    subcategory,
    topic,
    canonical_question,
    pop_index,
    refresh_interval,
    last_reviewed_at,
    next_review_at,
    access_count_30d,
    (NOW() - next_review_at) AS overdue_by
FROM knowledge_cards
WHERE status IN ('active', 'needs_review')
  AND next_review_at <= NOW()
ORDER BY pop_index DESC, next_review_at ASC;


-- ============================================================
-- VIEW: agent_question_insights
-- Discover what agents are asking, grouped and ranked
-- ============================================================
CREATE VIEW agent_question_insights AS
SELECT
    card_id,
    agent_query,
    COUNT(*) AS query_count,
    COUNT(DISTINCT ip_hash) AS unique_agents,
    MIN(accessed_at) AS first_seen,
    MAX(accessed_at) AS last_seen,
    ARRAY_AGG(DISTINCT agent_type) FILTER (WHERE agent_type IS NOT NULL) AS agent_types
FROM card_access_log
WHERE agent_query IS NOT NULL
GROUP BY card_id, agent_query
ORDER BY query_count DESC;


-- ============================================================
-- VIEW: card_popularity_stats
-- For recomputing pop_index periodically
-- ============================================================
CREATE VIEW card_popularity_stats AS
SELECT
    kc.id,
    kc.category,
    kc.canonical_question,
    kc.pop_index AS current_pop_index,
    COUNT(cal.id) FILTER (WHERE cal.accessed_at > NOW() - INTERVAL '30 days') AS hits_30d,
    COUNT(cal.id) FILTER (WHERE cal.accessed_at > NOW() - INTERVAL '7 days') AS hits_7d,
    COUNT(DISTINCT cal.ip_hash) FILTER (WHERE cal.accessed_at > NOW() - INTERVAL '30 days') AS unique_visitors_30d,
    COUNT(DISTINCT cal.agent_type) FILTER (WHERE cal.accessed_at > NOW() - INTERVAL '30 days') AS agent_types_30d
FROM knowledge_cards kc
LEFT JOIN card_access_log cal ON cal.card_id = kc.id
WHERE kc.status = 'active'
GROUP BY kc.id, kc.category, kc.canonical_question, kc.pop_index
ORDER BY hits_30d DESC;


-- ============================================================
-- SEED: Insert the existing prototype cards
-- ============================================================
INSERT INTO knowledge_cards (
    id, category, subcategory, topic, version_tag,
    canonical_question, aliases, entity_type, region,
    confidence, token_estimate, source_count,
    md_path, html_path,
    status, published_at
) VALUES
(
    'consumer-electronics/audio/wireless-earbuds-under-150/2026',
    'consumer-electronics', 'audio', 'wireless-earbuds-under-150', '2026',
    'What are the best wireless earbuds under $150 in 2026?',
    ARRAY[
        'best budget earbuds 2026',
        'wireless earbuds comparison under 150',
        'top ANC earbuds affordable',
        'best true wireless earbuds budget',
        'earbuds with best noise cancellation under 150',
        'wireless earbuds for running under 150',
        'best sound quality earbuds cheap',
        'compare Sony WF-C710N vs Soundcore Liberty 4 NC'
    ],
    'product_comparison', 'global',
    0.88, 1800, 8,
    '/consumer-electronics/audio/wireless-earbuds-under-150/2026.md',
    '/consumer-electronics/audio/wireless-earbuds-under-150/2026.html',
    'active', NOW()
),
(
    'energy/us/interconnection-queue/status-2025',
    'energy', 'us', 'interconnection-queue', 'status-2025',
    'What is the current status of the US electricity interconnection queue?',
    ARRAY[
        'US grid interconnection queue 2025',
        'how long does interconnection take',
        'FERC interconnection backlog',
        'solar wind interconnection wait time'
    ],
    'market_data', 'us',
    0.85, NULL, NULL,
    '/energy/us/interconnection-queue/status-2025.md',
    '/energy/us/interconnection-queue/status-2025.html',
    'active', NOW()
);
