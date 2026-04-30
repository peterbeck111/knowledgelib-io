# Environment & Deployment

- **Hosting**: Cloudflare Pages (static) + Cloudflare Functions (API, affiliate redirects)
- **Database**: Supabase (PostgreSQL)
- **Secrets**: `.env` file locally; `wrangler secret` for production (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **npm token**: `NPM_TOKEN` in `.env` — automation token for publishing knowledgelib-mcp
- **License**: CC BY-SA 4.0
- **IndexNow key**: `ef8e8f4c-3591-49d6-be16-a7e0368a03d7` (file exists at prototype root)
- **Rate limiting**: Cloudflare WAF rate limit on `/go/*` (10 req/min per IP, block 60s). API and MCP endpoints rely on Cache-Control headers + edge caching

## Model Preference

Use Opus-4.6 for everything while building. It came out a few days ago and is an order of magnitude better than Sonnet and other models. If you can't find it, look it up first.
