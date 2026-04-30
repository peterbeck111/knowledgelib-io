---
# === IDENTITY ===
id: business/erp-integration/{topic}/{version_tag}
canonical_question: "{The single question this unit answers — e.g., 'What are the API capabilities and rate limits for Salesforce REST API?'}"
aliases:
  - "{alternative phrasing 1}"
  - "{alternative phrasing 2}"
  - "{alternative phrasing 3}"
  - "{alternative phrasing 4}"
entity_type: erp_integration
domain: business > erp-integration > {topic_readable}
region: global
jurisdiction: global
temporal_scope: {start_year}-{end_year}

# === SYSTEM PROFILE ===
# Which ERP system(s) this card covers. Single system for API capability cards,
# multiple for integration playbooks and comparison cards.
systems:
  - name: "{ERP System Name — e.g., Salesforce, SAP S/4HANA, Oracle ERP Cloud, NetSuite}"
    vendor: "{Vendor — e.g., Salesforce, SAP, Oracle, Microsoft, Workday}"
    version: "{API version or release — e.g., API v62.0, 2408, 24B}"
    edition: "{Edition/tier — e.g., Enterprise, Professional, Standard}"
    deployment: "{cloud | on-premise | hybrid}"
    api_surface: "{Primary API surface — e.g., REST, SOAP, OData, Bulk, GraphQL}"

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
version: 1.0
first_published: {YYYY-MM-DD}

# === TEMPORAL VALIDITY ===
# ERP APIs change frequently. Most cards should be volatile or evolving.
temporal_validity:
  status: volatile
  last_breaking_change: "{version/date of last breaking change, or null}"
  next_review: {YYYY-MM-DD}
  change_sensitivity: high

# === CONSTRAINTS ===
# Hard boundaries on API capabilities. Agents: read before recommending any integration approach.
# These are the #1 thing agents get wrong about ERP integrations.
constraints:
  - "{Rate limit: e.g., 100,000 API calls per 24h for Enterprise edition}"
  - "{Record limit: e.g., max 2,000 records per bulk import batch}"
  - "{Edition restriction: e.g., Streaming API not available on Professional edition}"
  - "{Concurrency limit: e.g., max 25 concurrent long-running API requests}"
  - "{Payload limit: e.g., max 50MB per REST request body}"
  - "{Deprecation: e.g., SOAP API deprecated for new development, maintenance-only}"

# === SKIP CONDITIONS ===
skip_this_unit_if:
  - condition: "{Scenario where this card is the wrong answer}"
    use_instead: "{business/erp-integration/{correct-topic}/{version_tag}}"
  - condition: "{User needs a different ERP system}"
    use_instead: "{business/erp-integration/{other-system-topic}/{version_tag}}"
  - condition: "{User needs a different integration surface}"
    use_instead: "{business/erp-integration/{correct-api-surface}/{version_tag}}"

# === AGENT HINTS ===
# Structured routing — helps agents decide whether to fetch this card BEFORE consuming the full body.
inputs_needed:
  - key: integration_pattern
    question: "What integration pattern do you need?"
    type: choice
    options:
      - "real-time sync (individual records, <1s latency)"
      - "batch/bulk (scheduled, high volume)"
      - "event-driven (webhook, CDC, platform events)"
      - "file-based (CSV/XML import/export)"
  - key: data_volume
    question: "What's your daily data volume?"
    type: choice
    options:
      - "< 1,000 records/day"
      - "1,000–100,000 records/day"
      - "> 100,000 records/day"
  - key: direction
    question: "What's the data flow direction?"
    type: choice
    options:
      - "inbound (writing to this ERP)"
      - "outbound (reading from this ERP)"
      - "bidirectional sync"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/business/erp-integration/{topic}/{version_tag}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  depends_on:
    - id: "{business/erp-integration/{prereq-topic}/{version_tag}}"
      label: "{Prerequisite Unit — e.g., authentication flow card}"
  related_to:
    - id: "{business/erp-integration/{related-topic}/{version_tag}}"
      label: "{Related Unit — e.g., another API surface for same ERP}"
  solves:
    - id: "{business/erp-integration/{downstream-topic}/{version_tag}}"
      label: "{Integration playbook that uses this API}"
  alternative_to:
    - id: "{business/erp-integration/{alt-topic}/{version_tag}}"
      label: "{Alternative API surface or approach}"
  often_confused_with:
    - id: "{business/erp-integration/{confused-topic}/{version_tag}}"
      label: "{API that looks similar but has different constraints}"

# === SOURCES (5-8 authoritative sources) ===
# Types: official_docs, technical_blog, community_resource, industry_report, vendor_release_notes
# Reliability: high, moderate_high, moderate, authoritative
sources:
  - id: src1
    title: "{Official API Documentation}"
    author: {Vendor}
    url: {url}
    type: official_docs
    published: {YYYY-MM-DD}
    reliability: authoritative
  - id: src2
    title: "{API Release Notes or Developer Guide}"
    author: {Vendor}
    url: {url}
    type: vendor_release_notes
    published: {YYYY-MM-DD}
    reliability: high
---

# {Title}

## TL;DR

{3-5 bullet points. The complete answer in ≤100 tokens. An agent that only reads this section should be able to give a useful response.}

- **Bottom line**: {One sentence — e.g., "Use Bulk API 2.0 for anything over 2,000 records; REST API for real-time individual record operations."}
- **Key limit**: {The single most important constraint — e.g., "100,000 API calls/24h (Enterprise), 15,000 Bulk API batches/24h"}
- **Watch out for**: {The #1 mistake — e.g., "Governor limits are per-transaction, not per-API-call — triggers can cascade."}
- **Best for**: {When to use this API surface — e.g., "Real-time CRM operations under 2,000 records per operation."}
- **Authentication**: {One-line auth summary — e.g., "OAuth 2.0 JWT bearer flow for server-to-server; web server flow for user-context."}

## System Profile

{1-2 paragraphs. Which ERP system, version, edition(s), and deployment model this card covers. Include what's NOT covered (different editions, on-premise vs cloud differences). For integration playbooks: list all systems involved and their roles.}

| Property | Value |
|---|---|
| **Vendor** | {Vendor name} |
| **System** | {ERP system name and version} |
| **API Surface** | {REST, SOAP, Bulk, OData, etc.} |
| **Current API Version** | {e.g., v62.0, 2408} |
| **Editions Covered** | {Which editions — e.g., "Enterprise, Unlimited, Developer"} |
| **Deployment** | {Cloud / On-Premise / Hybrid} |
| **API Docs URL** | [{Official docs}]({url}) |
| **Status** | {GA / Beta / Deprecated / Maintenance-only} |

{For integration playbooks, replace with a systems table:}

| System | Role | API Surface | Direction |
|---|---|---|---|
| {System A} | {e.g., CRM — source of truth for customers} | {REST API v62.0} | {Outbound} |
| {System B} | {e.g., ERP — financial master} | {OData v4} | {Inbound} |
| {Middleware} | {e.g., Integration platform} | {N/A} | {Orchestrator} |

## API Surfaces & Capabilities

{Overview of all available API surfaces for this ERP system. For single-API cards, focus on the one surface. For system-level cards, map all surfaces.}

| API Surface | Protocol | Best For | Max Records/Request | Rate Limit | Real-time? | Bulk? |
|---|---|---|---|---|---|---|
| {REST API} | {HTTPS/JSON} | {Individual record CRUD, <2K records} | {200 composite, 2K query} | {100K calls/24h} | {Yes} | {No} |
| {Bulk API 2.0} | {HTTPS/CSV} | {ETL, data migration, >2K records} | {150M per file} | {15K batches/24h} | {No} | {Yes} |
| {SOAP API} | {HTTPS/XML} | {Metadata operations, legacy} | {2K records} | {Shared with REST} | {Yes} | {No} |
| {Streaming API} | {Bayeux/CometD} | {Real-time notifications} | {N/A} | {Edition-dependent} | {Yes} | {N/A} |

{4-8 rows. This table alone should answer 60% of "which API should I use?" questions.}

## Rate Limits & Quotas

<!-- This is the highest-value section. Agents hallucinate rate limits constantly.
     Every number must be cited. Edition-specific differences are critical. -->

### Per-Request Limits

| Limit Type | Value | Applies To | Notes |
|---|---|---|---|
| {Max records per query} | {2,000} | {REST API SOQL} | {Use queryMore for pagination} |
| {Max request body size} | {50 MB} | {REST API} | {} |
| {Max batch file size} | {150 MB} | {Bulk API 2.0} | {Split larger files} |
| {Max composite subrequests} | {25} | {Composite API} | {All-or-nothing by default} |

{4-10 rows.} [src1]

### Rolling / Daily Limits

| Limit Type | Value | Window | Edition Differences |
|---|---|---|---|
| {API calls} | {100,000} | {24h rolling} | {Enterprise: 100K, Unlimited: 5M, Developer: 15K} |
| {Bulk API batches} | {15,000} | {24h rolling} | {Shared across all editions} |
| {Streaming events} | {100K-10M} | {24h} | {Depends on add-on licenses} |
| {Concurrent long-running requests} | {25} | {Per org} | {} |

{4-8 rows.} [src1, src2]

### Transaction / Governor Limits

{For systems with transaction-scoped limits (especially Salesforce governor limits, NetSuite governance units, SAP dialog step limits). Omit for systems without these.}

| Limit Type | Per-Transaction Value | Notes |
|---|---|---|
| {SOQL queries} | {100} | {Includes queries from triggers — cascading triggers consume from same pool} |
| {DML statements} | {150} | {Each insert/update/delete counts as 1, regardless of record count} |
| {Callouts} | {100} | {HTTP requests to external services within a transaction} |
| {CPU time} | {10,000 ms (sync), 60,000 ms (async)} | {Exceeded = transaction abort} |
| {Heap size} | {6 MB (sync), 12 MB (async)} | {} |

{4-8 rows. For Salesforce governor limits, NetSuite governance units, SAP dialog work process limits, etc.} [src1]

## Authentication

{Which authentication flows are available, when to use each, and the specific gotchas.}

| Flow | Use When | Token Lifetime | Refresh? | Notes |
|---|---|---|---|---|
| {OAuth 2.0 JWT Bearer} | {Server-to-server, no user context} | {Session timeout (default 2h)} | {New JWT per request} | {Recommended for integrations} |
| {OAuth 2.0 Web Server} | {User-context operations} | {Access: 2h, Refresh: until revoked} | {Yes} | {Requires callback URL} |
| {Username-Password} | {Legacy, testing only} | {Session timeout} | {No} | {Do NOT use in production — no MFA support} |

{2-5 rows.} [src1, src3]

### Authentication Gotchas

- {Gotcha 1 — e.g., "JWT bearer flow requires a connected app with digital certificate — self-signed works for dev, CA-signed for prod"} [src1]
- {Gotcha 2 — e.g., "Access tokens are org-scoped, not user-scoped for JWT flow — all API calls use the integration user's permissions"} [src3]
- {Gotcha 3 — e.g., "Session timeout can be changed by admin — don't hardcode 2h"} [src1]

## Constraints
<!-- Agents: read this section before recommending any integration approach from this unit.
     These are hard constraints that must not be violated. -->

- {Constraint 1 — edition restriction that changes available APIs}
- {Constraint 2 — rate limit that prevents certain integration patterns}
- {Constraint 3 — data model limitation (e.g., "cannot update formula fields via API")}
- {Constraint 4 — concurrency limit that affects parallel processing}
- {Constraint 5 — deprecation or sunset that affects long-term viability}
- {Constraint 6 — licensing requirement (e.g., "Platform Events require add-on license")}

{4-8 constraints. Each is a hard rule an agent must respect. These prevent agents from recommending impossible integration patterns.}

## Integration Pattern Decision Tree

{Structured if/then logic. Agents use this to determine which API surface, integration pattern, or middleware approach to recommend.}

```
START — User needs to integrate with {ERP System}
├── What's the integration pattern?
│   ├── Real-time (individual records, <1s)
│   │   ├── Data volume < 200 records/operation?
│   │   │   ├── YES → REST API: use composite resources for multi-object
│   │   │   └── NO → REST API with chunking + async processing
│   │   └── Need notifications/webhooks?
│   │       ├── YES → Platform Events / Change Data Capture
│   │       └── NO → REST API polling (not recommended >1K records)
│   ├── Batch/Bulk (scheduled, high volume)
│   │   ├── Data volume < 2,000 records?
│   │   │   ├── YES → REST API (simpler, no batch overhead)
│   │   │   └── NO ↓
│   │   ├── Data volume < 150,000 records?
│   │   │   ├── YES → Bulk API 2.0 (single job)
│   │   │   └── NO → Bulk API 2.0 with job chunking
│   │   └── Need real-time status tracking?
│   │       ├── YES → Bulk API 2.0 (poll job status)
│   │       └── NO → File-based import (FBDI/EIB) if available
│   ├── Event-driven (CDC, webhooks)
│   │   ├── Need guaranteed delivery?
│   │   │   ├── YES → Platform Events with replay (24h retention)
│   │   │   └── NO → Streaming API / Outbound Messages
│   │   └── Need cross-object change tracking?
│   │       ├── YES → Change Data Capture
│   │       └── NO → Field-level triggers + Platform Events
│   └── File-based (CSV/XML)
│       └── {System-specific: FBDI, EIB, DMF, IDoc} → see system profile
├── Which direction?
│   ├── Inbound (writing to ERP) → check write rate limits above
│   ├── Outbound (reading from ERP) → check query limits above
│   └── Bidirectional → design conflict resolution strategy FIRST
└── What's the error tolerance?
    ├── Zero-loss required → implement idempotency + dead letter queue
    └── Best-effort acceptable → fire-and-forget with retry
```

## Quick Reference

{Pick the appropriate format for the card type.}

{FOR API CAPABILITY CARDS — endpoint reference table:}

| Operation | Method | Endpoint | Payload | Notes |
|---|---|---|---|---|
| {Create record} | {POST} | {/services/data/v62.0/sobjects/{Object}} | {JSON} | {Returns ID on success} |
| {Query records} | {GET} | {/services/data/v62.0/query?q={SOQL}} | {N/A} | {Max 2,000 per page} |
| {Bulk insert} | {POST} | {/services/data/v62.0/jobs/ingest} | {CSV} | {Async, poll for status} |

{FOR INTEGRATION PLAYBOOKS — process flow table:}

| Step | Source System | Action | Target System | Data Objects | Failure Handling |
|---|---|---|---|---|---|
| {1} | {Salesforce} | {Opportunity closed-won → trigger} | {NetSuite} | {Sales Order} | {Retry 3x, then DLQ} |
| {2} | {NetSuite} | {SO fulfilled → item fulfillment} | {ShipStation} | {Shipment} | {Manual review} |

{FOR COMPARISON CARDS — capability comparison table:}

| Capability | {System A} | {System B} | {System C} | Winner |
|---|---|---|---|---|
| {REST API rate limit} | {100K/24h} | {Throttled/fair-use} | {10K/min} | {System C} |
| {Bulk import} | {Bulk API 2.0, 150MB/file} | {FBDI, 250MB/file} | {SuiteTalk, 100 records/page} | {System B} |

{8-15 rows. This table alone should answer 60% of agent queries on this topic.}

## Step-by-Step Integration Guide

### 1. {Authenticate and obtain access token}

{What to do, why, and what to verify after.} [src1]

```{language}
{Complete, runnable code. Not pseudo-code.
Include the specific API endpoint, headers, and payload format.}
```

**Verify**: `{command to confirm this step worked}` → expected output: `{output}`

### 2. {Execute the primary integration operation}

{Description.} [src2]

```{language}
{code}
```

**Verify**: `{command}` → `{expected}`

### 3. {Handle pagination / large result sets}

{Description.} [src1]

```{language}
{code showing pagination handling}
```

**Verify**: `{command}` → `{expected}`

### 4. {Implement error handling and retries}

{Description.} [src3]

```{language}
{code showing retry logic with exponential backoff,
rate limit handling (429), and dead letter queue pattern}
```

**Verify**: `{command}` → `{expected}`

{4-8 steps. Each step is self-contained: code + verification.}

## Code Examples
<!-- Keep inline examples ≤15 lines. For longer scripts, extract to scripts/ subdirectory
     and link: "Full script: [name.ext](scripts/name.ext) (N lines)" -->

### Python: {Specific Use Case — e.g., "Bulk upsert 50K contacts via Bulk API 2.0"}

```python
# Input:  {what this code expects — e.g., "CSV file with 50K contact records"}
# Output: {what this code produces — e.g., "Bulk job ID, success/failure counts"}

{Complete, tested, copy-pasteable code.
Every non-obvious line has a comment.
Includes error handling for production use.
Pin dependency versions in imports/requires.
Show rate limit handling (429 retry with backoff).}
```

### JavaScript/Node.js: {Specific Use Case}

```javascript
// Input:  {what this code expects}
// Output: {what this code produces}

{Same pattern, different language.
Include the specific npm package and version.}
```

### cURL: {Quick API test}

```bash
# Input:  {prerequisites — token, record ID}
# Output: {API response format}

{cURL commands for quick testing/debugging.
Show both the request and expected response shape.}
```

{2-4 examples. Prioritize: Python, JavaScript/Node.js, cURL, Java — in that order of integration developer frequency.}

## Data Mapping

{Field mapping patterns, transformation rules, and data type conversions between systems. Critical for integration playbooks. For single-system API cards, show the API's data model quirks.}

### Field Mapping Reference

| Source Field | Target Field | Type | Transform | Gotcha |
|---|---|---|---|---|
| {Salesforce: Account.Name} | {NetSuite: customer.companyName} | {String} | {Direct} | {Max 83 chars in NetSuite vs 255 in SF} |
| {Salesforce: Opportunity.Amount} | {NetSuite: salesOrder.total} | {Currency} | {Convert currency if multi-currency} | {Exchange rate timing matters} |

{4-10 rows. Include the non-obvious transformations — these are where integrations break.}

### Data Type Gotchas

- {Gotcha 1 — e.g., "Salesforce datetime is always UTC; NetSuite depends on user timezone preference"} [src1]
- {Gotcha 2 — e.g., "SAP amounts store in smallest currency unit (cents); Salesforce stores in decimal"} [src2]
- {Gotcha 3 — e.g., "Multi-select picklists serialize as semicolon-delimited in Salesforce API but comma-delimited in UI"} [src1]

{Omit this section for pure comparison cards.}

## Error Handling & Failure Points

{What breaks and why. This section prevents consultants from building integrations that fail silently.}

### Common Error Codes

| Code | Meaning | Cause | Resolution |
|---|---|---|---|
| {429} | {Rate limit exceeded} | {Too many API calls in window} | {Exponential backoff: wait 2^n seconds, max 5 retries} |
| {INVALID_FIELD} | {Field doesn't exist or isn't writable} | {Wrong API version or object permissions} | {Check field-level security + API version} |
| {UNABLE_TO_LOCK_ROW} | {Record locked by another transaction} | {Concurrent updates to same record} | {Retry with jitter, implement record-level locking} |

{4-8 rows.} [src1, src3]

### Failure Points in Production

- **{Failure point 1}**: {What breaks — e.g., "Bulk API jobs silently fail when CSV has BOM characters."} Fix: `{specific fix}`. [src3]
- **{Failure point 2}**: {What breaks — e.g., "Trigger recursion causes governor limit breach on cascading updates."} Fix: `{fix}`. [src1]
- **{Failure point 3}**: {What breaks — e.g., "OAuth refresh token expires after 90 days of non-use, breaking unattended integrations."} Fix: `{fix}`. [src2]
- **{Failure point 4}**: {What breaks.} Fix: `{fix}`. [src1]

{4-8 failure points. Each one is: symptom → cause → fix. These are worth more than the code examples — they represent $200/hr consultant knowledge.}

## Anti-Patterns

{Show WRONG integration approach alongside CORRECT approach. These are the most common and expensive mistakes.}

### Wrong: {Description — e.g., "Querying all records to find changes"}

```{language}
// ❌ BAD — {why this is wrong}
{wrong code or approach description}
```

### Correct: {The right approach — e.g., "Use Change Data Capture or SystemModstamp filter"}

```{language}
// ✅ GOOD — {why this is right}
{correct code or approach}
```

### Wrong: {Second common mistake — e.g., "Synchronous callouts inside triggers for every record"}

```{language}
// ❌ BAD — {why}
{wrong code}
```

### Correct: {Right approach — e.g., "Collect records, callout in @future or Queueable"}

```{language}
// ✅ GOOD — {why}
{correct code}
```

{3-6 anti-pattern pairs. Source from real project failures, vendor community forums, and Stack Overflow top wrong answers.}

## Common Pitfalls

- **{Pitfall 1 — e.g., "Sandbox ≠ Production API limits"}**: {What goes wrong — e.g., "Sandbox has lower API limits and may not have all production data."} Fix: `{fix — e.g., "Load-test against a full sandbox with production data volumes."}`. [src1]
- **{Pitfall 2 — e.g., "API version pinning"}**: {What goes wrong — e.g., "Not pinning API version means your integration breaks on next release."} Fix: `{fix}`. [src2]
- **{Pitfall 3 — e.g., "Ignoring field-level security"}**: {What goes wrong.} Fix: `{fix}`. [src3]
- **{Pitfall 4 — e.g., "Not handling partial success in bulk operations"}**: {What goes wrong.} Fix: `{fix}`. [src1]

{4-8 pitfalls. Each one is: symptom → cause → fix. Dense, no filler.}

## Diagnostic Commands

{Commands or API calls an agent can suggest to debug integration issues.}

```bash
# Check API usage / remaining limits
{curl command or API call to check quota}

# Test authentication
{curl command to test auth flow}

# Verify object/field accessibility
{curl command to describe object schema}

# Check integration user permissions
{curl command or approach to audit permissions}

# Monitor bulk job status
{curl command to check async job status}
```

## Version History & Compatibility

| API Version | Release Date | Status | Breaking Changes | Migration Notes |
|---|---|---|---|---|
| {v62.0} | {2026-02} | Current | {None} | — |
| {v61.0} | {2025-10} | Supported | {Deprecated X} | {Use Y instead} |
| {v58.0} | {2024-02} | EOL | — | {Minimum version for Z feature} |

{Include only when version-specific behavior matters. ERP APIs almost always have version-specific behavior, so include this for most cards.} [src1, src2]

### Deprecation Policy

{1-2 sentences on the vendor's API deprecation policy — e.g., "Salesforce supports API versions for a minimum of 3 years. Versions are retired in groups — check the API version support matrix." or "SAP follows a 2-year API deprecation notice policy on SAP API Business Hub."} [src2]

## When to Use / When Not to Use

| Use When | Don't Use When | Use Instead |
|---|---|---|
| {Scenario — e.g., "Real-time individual record operations, <2K records"} | {Counter-scenario — e.g., "Data migration >10K records"} | {Alternative — e.g., "business/erp-integration/salesforce-bulk-api/2026"} |
| {Scenario — e.g., "User-initiated operations with immediate response"} | {Counter-scenario — e.g., "Scheduled batch processing"} | {Alternative} |
| {Scenario} | {Counter-scenario} | {Alternative} |

## Cross-System Comparison

{Include only for comparison cards or when a direct comparison adds significant value. Omit for single-system API capability cards.}

| Capability | {System A} | {System B} | {System C} | Notes |
|---|---|---|---|---|
| {API Style} | {REST + SOAP} | {OData v4} | {REST + SOAP} | {} |
| {Rate Limits} | {100K/24h} | {Fair use / throttled} | {Configurable per tenant} | {System A most restrictive} |
| {Bulk Import} | {Bulk API 2.0} | {FBDI} | {SuiteTalk lists} | {System A most mature} |
| {Event-Driven} | {Platform Events + CDC} | {Business Events} | {User Event Scripts} | {} |
| {Auth} | {OAuth 2.0} | {OAuth 2.0 + SAML} | {TBA + OAuth 2.0} | {} |
| {Sandbox Support} | {Full + Partial} | {Test instance} | {Sandbox + Release Preview} | {} |
| {API Versioning} | {Numbered (v62.0)} | {Release-based (2408)} | {WSDL versioned} | {} |

{6-12 rows. Focus on the capabilities that matter for integration decisions.}

## Important Caveats

- {Caveat about edition-specific differences — e.g., "Rate limits vary dramatically by Salesforce edition; Developer edition has only 15,000 calls/24h"}
- {Caveat about sandbox vs production — e.g., "Sandbox API limits are lower and reset independently of production"}
- {Caveat about licensing — e.g., "Some API surfaces require additional licenses (e.g., Platform Events high-volume add-on)"}
- {Caveat about regional differences — e.g., "EU instances may have different data residency constraints affecting cross-region API calls"}
- {Caveat about the information in this card — e.g., "Rate limits are subject to change with each release; always verify against current release notes"}

## Related Units
<!-- Generated from related_kos frontmatter -->

- [{Related API surface for same system}](/{path-to-related-unit})
- [{Same API surface for different system}](/{path-to-related-unit})
- [{Integration playbook that uses this API}](/{path-to-related-unit})
- [{Comparison card covering this system}](/{path-to-related-unit})
