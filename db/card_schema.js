const { z } = require('zod');

/**
 * Shared Zod schema for card_data JSON validation.
 * Used by insert_card.js and insert_card_rest.js to validate
 * card data before any database operations.
 */

const BuyLinkSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  product_name: z.string().min(1),
  asin: z.string().regex(/^B[A-Z0-9]{9}$/, 'ASIN must be 10 chars starting with B').nullable().optional(),
  retailer: z.string().default('amazon_us'),
  destination_url: z.string().url(),
  destination_url_clean: z.string().url().optional(),
  affiliate_tag: z.string().optional(),
});

const RelatedKoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const TemporalValiditySchema = z.object({
  status: z.enum(['stable', 'evolving', 'volatile']).optional(),
  last_breaking_change: z.string().nullable().optional(),
  next_review: z.string().optional(),
  change_sensitivity: z.enum(['low', 'medium', 'high']).optional(),
});

const InputNeededSchema = z.object({
  key: z.string().min(1),
  question: z.string().min(1),
  type: z.enum(['choice', 'text', 'boolean']).default('text'),
  options: z.array(z.string()).optional(),
  default: z.string().optional(),
});

const SkipConditionSchema = z.object({
  condition: z.string().min(1),
  use_instead: z.string().optional(),
});

const RuleScopeSchema = z.object({
  domain: z.string().optional(),
  price_range: z.string().nullable().optional(),
  user_segment: z.string().optional(),
  context: z.string().optional(),
});

const CardDataSchema = z.object({
  id: z.string().min(1).regex(
    /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/,
    'id must be category/subcategory/topic/version_tag format'
  ),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  topic: z.string().min(1),
  version_tag: z.string().min(1),
  canonical_question: z.string().min(10),
  aliases: z.array(z.string()).default([]),
  entity_type: z.enum([
    'product_comparison', 'software_reference', 'situation_assessment',
    'fact', 'concept', 'rule', 'erp_integration',
    'assessment', 'benchmark', 'decision_framework', 'playbook',
    'execution_recipe', 'agent_prompt'
  ]).default('product_comparison'),
  region: z.string().default('global'),
  jurisdiction: z.string().default('global'),
  confidence: z.number().min(0).max(1),
  token_estimate: z.number().int().positive(),
  source_count: z.number().int().min(1),
  md_path: z.string().startsWith('/'),
  html_path: z.string().startsWith('/'),
  priority: z.enum(['high', 'medium', 'low']),
  buy_links: z.array(BuyLinkSchema).default([]),

  // Improvement plan additions (all optional for backward compatibility)
  temporal_validity: TemporalValiditySchema.optional(),
  constraints: z.array(z.string()).optional(),
  skip_this_unit_if: z.array(SkipConditionSchema).optional(),
  related_kos: z.object({
    depends_on: z.array(RelatedKoSchema).default([]),
    related_to: z.array(RelatedKoSchema).default([]),
    solves: z.array(RelatedKoSchema).default([]),
    alternative_to: z.array(RelatedKoSchema).default([]),
    often_confused_with: z.array(RelatedKoSchema).default([]),
  }).optional(),
  inputs_needed: z.array(InputNeededSchema).optional(),
  applies_to: RuleScopeSchema.optional(),
});

module.exports = { CardDataSchema, BuyLinkSchema, SkipConditionSchema };
