# knowledgelib.io — Claude Code Instructions

AI Knowledge Library — structured, cited knowledge units (markdown + YAML frontmatter) optimized for AI agent consumption. Pre-verified answers that save tokens, reduce hallucinations, and cite every source.

**Core value**: Token arbitrage — $0.02/query vs $0.50–$5.00 in agent compute.

## Rules

Detailed instructions are split into focused rule files under `.claude/rules/`:

| Rule file | Scope | What it covers |
|-----------|-------|----------------|
| `daily-workflow.md` | All files | 3-step pipeline (check → create → publish), skill commands |
| `project-structure.md` | All files | Full file tree reference |
| `content-quality.md` | `prototype/**/*.md`, `prototype/**/*.html` | Source requirements, confidence scoring, 5 template types (product_comparison, software_reference, fact, concept, rule), temporal_validity, related_kos, jurisdiction |
| `html-requirements.md` | `prototype/**/*.html`, `templates/*.html` | Meta tags, OG, Twitter Card, JSON-LD (Dataset, BreadcrumbList, TechArticle, DefinedTerm), all ai:* tags incl. entity_type, jurisdiction, temporal_status, change_sensitivity, sections |
| `database.md` | `db/**`, `functions/**` | Supabase schema (incl. content_feedback), insert ops, Zod validation (TemporalValidity, RelatedKo, InputNeeded, RuleScope), observability |
| `affiliate-links.md` | `prototype/**`, `db/**`, `functions/go/**` | ASIN lookup, buy link format, redirect pattern |
| `api-infrastructure.md` | `functions/**`, `mcp-server/**`, `n8n-node/**`, `langchain/**` | REST API (query filters: region/jurisdiction/entity_type), MCP v1.1 (report_issue), n8n v0.2 (Report Issue), LangChain v0.2 (report_issue), feedback loop, suggestion loop, discovery (catalog v1.1, ai-knowledge v1.1) |
| `environment.md` | All files | Hosting, secrets, deployment, model preference |
