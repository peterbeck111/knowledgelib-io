-- knowledgelib.io — Fix SECURITY DEFINER view
-- Migration: 009_fix_view_security
-- Created: 2026-02-17
--
-- Supabase linter flagged top_unanswered_questions as SECURITY DEFINER.
-- Since anon already has SELECT on discovered_questions via RLS,
-- the view should use SECURITY INVOKER (respect caller's RLS policies).

ALTER VIEW top_unanswered_questions SET (security_invoker = true);
