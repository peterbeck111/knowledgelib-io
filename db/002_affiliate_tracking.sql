-- knowledgelib.io — Affiliate Link Tracking
-- Migration: 002_affiliate_tracking
-- Database: PostgreSQL (Neon on Vercel)
-- Created: 2026-02-09
--
-- Tracks all /go/ redirect links, their destinations, and every click.
-- Supports multiple retailers, regional variants, and A/B testing.

-- ============================================================
-- TABLE: affiliate_links
-- Registry of all /go/ redirect URLs
-- ============================================================
CREATE TABLE affiliate_links (
    id                  BIGSERIAL PRIMARY KEY,
    slug                TEXT NOT NULL UNIQUE,        -- e.g. 'sony-wf-c710n' (the /go/{slug} part)
    card_id             TEXT REFERENCES knowledge_cards(id),  -- which card this link belongs to

    -- Product info
    product_name        TEXT NOT NULL,               -- e.g. 'Sony WF-C710N'
    product_asin        TEXT,                        -- Amazon ASIN e.g. 'B0D7XXXXX'

    -- Retailer & affiliate program
    retailer            TEXT NOT NULL,               -- 'amazon_us', 'amazon_de', 'bestbuy', etc.
    affiliate_tag       TEXT,                        -- e.g. 'knowledgelib-20'
    destination_url     TEXT NOT NULL,               -- full URL with affiliate tag baked in
    destination_url_clean TEXT,                      -- URL without affiliate tag (for transparency)

    -- Regional targeting (future: redirect based on visitor country)
    region              TEXT DEFAULT 'us',           -- ISO country or region code
    currency            TEXT DEFAULT 'USD',

    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at    TIMESTAMPTZ,                 -- last time we checked the link still works
    last_price          NUMERIC(10,2),               -- last known price (for staleness detection)
    last_price_at       TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for the redirect handler
CREATE INDEX idx_affiliate_slug ON affiliate_links (slug) WHERE is_active = TRUE;

-- Find all links for a card
CREATE INDEX idx_affiliate_card ON affiliate_links (card_id);


-- ============================================================
-- TABLE: affiliate_click_log
-- Every click on a /go/ link — full attribution trail
-- ============================================================
CREATE TABLE affiliate_click_log (
    id                  BIGSERIAL PRIMARY KEY,
    link_id             BIGINT NOT NULL REFERENCES affiliate_links(id),
    card_id             TEXT REFERENCES knowledge_cards(id),  -- denormalized for fast queries
    clicked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Attribution: how did they get here?
    referer             TEXT,                        -- HTTP Referer (the page they clicked from)
    referer_type        TEXT                         -- 'direct', 'knowledgelib_page', 'ai_agent', 'search', 'external'
                        CHECK (referer_type IN ('direct', 'knowledgelib_page', 'ai_agent', 'search', 'external')),

    -- Agent context (when an AI agent presents the link to a user)
    agent_type          TEXT,                        -- 'chatgpt', 'claude', 'perplexity', etc.
    source_query        TEXT,                        -- the original question that led here

    -- Visitor info (anonymized)
    ip_hash             TEXT,                        -- SHA-256 of IP
    user_agent          TEXT,
    country_code        TEXT,                        -- from GeoIP
    device_type         TEXT,                        -- 'mobile', 'desktop', 'tablet'

    -- Redirect result
    destination_url     TEXT NOT NULL,               -- actual URL we redirected to (snapshot)
    http_status         INTEGER DEFAULT 302          -- 302, 301, or error codes
);

-- Per-link click analytics
CREATE INDEX idx_clicks_link_time ON affiliate_click_log (link_id, clicked_at DESC);

-- Per-card revenue attribution
CREATE INDEX idx_clicks_card_time ON affiliate_click_log (card_id, clicked_at DESC);

-- Agent-driven clicks (key metric: are AI agents driving purchases?)
CREATE INDEX idx_clicks_agent ON affiliate_click_log (agent_type, clicked_at DESC)
    WHERE agent_type IS NOT NULL;

COMMENT ON TABLE affiliate_click_log IS
    'Every /go/ redirect click. Partition by clicked_at monthly when >1M rows.';


-- ============================================================
-- TABLE: affiliate_revenue
-- Manual or API-imported revenue data from affiliate programs
-- Amazon reports are CSV — import here for unified tracking
-- ============================================================
CREATE TABLE affiliate_revenue (
    id                  BIGSERIAL PRIMARY KEY,
    link_id             BIGINT REFERENCES affiliate_links(id),
    card_id             TEXT REFERENCES knowledge_cards(id),

    -- Revenue event
    event_type          TEXT NOT NULL
                        CHECK (event_type IN ('click', 'order', 'return', 'adjustment')),
    event_date          DATE NOT NULL,

    -- Financials
    order_amount        NUMERIC(10,2),               -- what the customer paid
    commission_amount   NUMERIC(10,2),               -- what you earned
    commission_currency TEXT DEFAULT 'USD',
    commission_rate     NUMERIC(5,4),                -- e.g. 0.0400 = 4%

    -- Source tracking
    retailer            TEXT NOT NULL,
    affiliate_program   TEXT NOT NULL,                -- 'amazon_associates_us', etc.
    external_order_id   TEXT,                         -- Amazon order ID etc.

    -- Import metadata
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    import_source       TEXT,                         -- 'amazon_csv_2026_02', 'manual', etc.
    raw_data            JSONB                         -- original row from the affiliate report
);

-- Revenue per card (which content makes money?)
CREATE INDEX idx_revenue_card ON affiliate_revenue (card_id, event_date DESC);

-- Monthly revenue reporting
CREATE INDEX idx_revenue_date ON affiliate_revenue (event_date DESC);


-- ============================================================
-- VIEW: affiliate_performance
-- Which links and cards are actually making money?
-- ============================================================
CREATE VIEW affiliate_performance AS
SELECT
    al.slug,
    al.product_name,
    al.retailer,
    al.card_id,
    kc.canonical_question,
    kc.category,

    -- Click metrics
    COUNT(acl.id) AS total_clicks,
    COUNT(acl.id) FILTER (WHERE acl.clicked_at > NOW() - INTERVAL '30 days') AS clicks_30d,
    COUNT(acl.id) FILTER (WHERE acl.clicked_at > NOW() - INTERVAL '7 days') AS clicks_7d,

    -- Agent attribution
    COUNT(acl.id) FILTER (WHERE acl.agent_type IS NOT NULL) AS agent_driven_clicks,
    ROUND(
        COUNT(acl.id) FILTER (WHERE acl.agent_type IS NOT NULL)::NUMERIC /
        NULLIF(COUNT(acl.id), 0) * 100, 1
    ) AS agent_click_pct,

    -- Revenue (if imported)
    COALESCE(SUM(ar.commission_amount), 0) AS total_commission,
    COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.event_date > CURRENT_DATE - 30), 0) AS commission_30d

FROM affiliate_links al
LEFT JOIN affiliate_click_log acl ON acl.link_id = al.id
LEFT JOIN affiliate_revenue ar ON ar.link_id = al.id AND ar.event_type = 'order'
LEFT JOIN knowledge_cards kc ON kc.id = al.card_id
WHERE al.is_active = TRUE
GROUP BY al.slug, al.product_name, al.retailer, al.card_id, kc.canonical_question, kc.category
ORDER BY clicks_30d DESC;


-- ============================================================
-- SEED: Insert affiliate links from the earbuds prototype
-- (destination_url placeholders — replace with real affiliate URLs)
-- ============================================================
INSERT INTO affiliate_links (slug, card_id, product_name, retailer, affiliate_tag, destination_url, destination_url_clean) VALUES
('sony-wf-c710n',              'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Sony WF-C710N',                    'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('soundcore-space-a40',        'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Soundcore Space A40',              'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('earfun-air-pro-4-plus',      'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'EarFun Air Pro 4+',                'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('soundcore-liberty-4-nc',     'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Soundcore Liberty 4 NC',           'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('skullcandy-bose-method-360', 'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Skullcandy x Bose Method 360 ANC', 'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('nothing-ear',                'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Nothing Ear',                      'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('cambridge-melomania-a100',   'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Cambridge Audio Melomania A100',   'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('edifier-neobuds-pro-2',      'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Edifier NeoBuds Pro 2',            'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('jlab-go-pods-anc',           'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'JLab Go Pods ANC',                 'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER'),
('sony-wf-c510',               'consumer-electronics/audio/wireless-earbuds-under-150/2026', 'Sony WF-C510',                     'amazon_us', NULL, 'https://www.amazon.com/dp/PLACEHOLDER?tag=YOURTAG-20', 'https://www.amazon.com/dp/PLACEHOLDER');
