-- knowledgelib.io — Bot filtering for affiliate clicks
-- Migration: 011_bot_filtering
-- Created: 2026-03-06
--
-- Adds is_bot column to affiliate_click_log so we can distinguish
-- real human clicks from crawler noise in analytics.

ALTER TABLE affiliate_click_log
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering out bots in analytics queries
CREATE INDEX idx_clicks_human_only ON affiliate_click_log (link_id, clicked_at DESC)
  WHERE is_bot = FALSE;

-- Backfill: mark existing bot clicks based on known user_agent patterns
UPDATE affiliate_click_log
SET is_bot = TRUE
WHERE user_agent ~* '(bytespider|ahrefsbot|meta-externalagent|semrushbot|mj12bot|dotbot|blex.?ot|yandexbot|baiduspider|sogou|petalbot|dataforseobot|serpstatbot|zoominfobot|gptbot|claudebot|googlebot|bingbot|applebot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|Nexus 5X Build/MMB29P)'
  AND is_bot = FALSE;
