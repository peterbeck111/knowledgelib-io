-- knowledgelib.io — RLS Policies for /go/ redirect handler
-- Migration: 003_rls_policies
-- Created: 2026-02-10
--
-- The Cloudflare Pages Function uses the Supabase anon key
-- to read affiliate links and log clicks via the REST API.
-- These policies allow that without exposing other tables.

-- Enable RLS on both tables (idempotent — safe to run if already enabled)
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_click_log ENABLE ROW LEVEL SECURITY;

-- Allow the /go/ handler to read active affiliate links
CREATE POLICY "anon_read_active_links"
  ON affiliate_links
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow the /go/ handler to insert click logs
CREATE POLICY "anon_insert_clicks"
  ON affiliate_click_log
  FOR INSERT
  TO anon
  WITH CHECK (true);
