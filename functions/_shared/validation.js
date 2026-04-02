/**
 * Zod validation schemas for knowledgelib.io API endpoints.
 *
 * Single source of truth for request validation.
 * Mirrors the MCP server schemas in mcp-server/cli.js.
 */

import { z } from 'zod';

// ============================================================
// Query endpoint
// ============================================================

export const QuerySchema = z.object({
  q: z.string().min(1, 'Missing required parameter: q'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  domain: z.string().optional(),
  region: z.string().optional(),
  jurisdiction: z.string().optional(),
  entity_type: z.string().optional(),
});

// ============================================================
// Batch endpoint
// ============================================================

export const BatchQueryItemSchema = z.object({
  q: z.string().min(1, 'q is required'),
  limit: z.coerce.number().int().min(1).max(20).default(3).optional(),
  domain: z.string().optional(),
  region: z.string().optional(),
  jurisdiction: z.string().optional(),
  entity_type: z.string().optional(),
});

export const BatchSchema = z.object({
  queries: z.array(BatchQueryItemSchema).min(1, 'queries must be a non-empty array').max(10, 'Maximum 10 queries per batch'),
});

// ============================================================
// Suggest endpoint
// ============================================================

export const SuggestSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question must not exceed 500 characters'),
  context: z.string().max(500).optional(),
  domain: z.string().max(100).optional(),
});

// ============================================================
// Feedback POST endpoint
// ============================================================

export const FeedbackSchema = z.object({
  card_id: z.string().min(5, 'card_id is required (e.g., "software/debugging/git-merge-conflicts/2026")'),
  type: z.enum(['outdated', 'incorrect', 'broken_link', 'missing_info', 'other'], {
    errorMap: () => ({ message: 'type must be one of: outdated, incorrect, broken_link, missing_info, other' }),
  }),
  description: z.string().min(10, 'description must be at least 10 characters').max(2000, 'description must not exceed 2000 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  section: z.string().max(100).optional(),
});

// ============================================================
// Helpers
// ============================================================

/**
 * Validate input against a Zod schema.
 * Returns { success: true, data } or { success: false, error: string }.
 */
export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Return the first error message
  const firstError = result.error.issues[0];
  const field = firstError.path.length > 0 ? firstError.path.join('.') + ': ' : '';
  return { success: false, error: `${field}${firstError.message}` };
}
