---
# === IDENTITY ===
id: agents/{pipeline}/{agent-name}
canonical_question: "{What system prompt should power the {function} agent?}"
aliases:
  - "{agent nickname}"
  - "{function} bot"
  - "{function} assistant"
entity_type: agent_prompt
domain: agents > {pipeline} > {function}
region: global
jurisdiction: global
temporal_scope: {start_year}-{end_year}

# === VERIFICATION ===
last_verified: {YYYY-MM-DD}
confidence: {0.00-1.00}
version: 1.0
first_published: {YYYY-MM-DD}

# === TEMPORAL VALIDITY ===
temporal_validity:
  status: {stable|evolving}
  last_breaking_change: "{description or null}"
  next_review: {YYYY-MM-DD}
  change_sensitivity: {low|medium|high}

# === AGENT IDENTITY ===
agent:
  name: "{Human-readable agent name — e.g., 'Lead Research & Enrichment Agent'}"
  role: "{One-line role definition — e.g., 'Builds scored, enriched lead databases from ICP definitions'}"
  type: "{document_producer|executor|analyzer|hybrid}"
  # document_producer = outputs documents/reports
  # executor = builds/deploys/configures real things
  # analyzer = evaluates inputs and produces assessments
  # hybrid = combination

# === PIPELINE POSITION ===
# Where this agent sits in the overall workflow.
pipeline:
  phase: "{phase number and name — e.g., '1C: Lead Research & Prospecting'}"
  sequence_number: {integer — execution order within the pipeline}
  parallel_group: "{null or group ID — agents in same group can run simultaneously}"
  gate_before: "{condition that must be true before this agent runs — e.g., 'ICP definition approved by user'}"
  gate_after: "{condition that must be true before next agent runs — e.g., 'Lead list quality score > 75%'}"

# === INPUTS ===
# What this agent receives from upstream agents or the user.
required_inputs:
  - name: "{input 1 — e.g., 'Startup Brief'}"
    source_agent: "{agent ID that produces this — e.g., 'agents/startup/idea-structurer'}"
    format: "{markdown|json|csv|spreadsheet}"
    description: "{What it contains and what this agent uses from it}"
    required: true
  - name: "{input 2 — e.g., 'ICP Definition'}"
    source_agent: "{agent ID}"
    format: "{format}"
    description: "{description}"
    required: true
  - name: "{input 3 — e.g., 'Tool budget'}"
    source_agent: "{user_input or agent ID}"
    format: "{format}"
    description: "{description}"
    required: false

# === OUTPUTS ===
# What this agent produces for downstream agents or the dashboard.
outputs:
  - name: "{output 1 — e.g., 'Scored Lead Database'}"
    format: "{CSV|markdown|spreadsheet|deployed_url|code_repository|configured_platform}"
    description: "{What it contains}"
    consumed_by:
      - "{downstream agent ID — e.g., 'agents/startup/sales-strategist'}"
      - "{dashboard view — e.g., 'dashboard/sales/lead-pipeline'}"
  - name: "{output 2 — e.g., 'Lead Quality Report'}"
    format: "{format}"
    description: "{description}"
    consumed_by:
      - "{downstream agent or dashboard}"

# === KNOWLEDGE CARDS ===
# Which knowledgelib cards this agent should fetch and reference during execution.
# Listed in order of importance / typical fetch sequence.
knowledge_cards:
  # Cards the agent MUST fetch — core methodology
  required:
    - id: "{path/to/card-1}"
      usage: "{How this card is used — e.g., 'Provides ICP-to-search-query translation methodology'}"
      section: "{Which section to read — e.g., 'decision_logic' or 'all'}"
    - id: "{path/to/card-2}"
      usage: "{usage}"
      section: "{section}"

  # Cards the agent SHOULD fetch — improves quality
  recommended:
    - id: "{path/to/card-3}"
      usage: "{usage}"
      section: "{section}"

  # Cards fetched conditionally based on inputs
  conditional:
    - id: "{path/to/card-4}"
      condition: "{When to fetch — e.g., 'if jurisdiction includes EU'}"
      usage: "{usage}"

# === TOOLS & CAPABILITIES ===
# What tools/APIs the agent needs access to.
tools_needed:
  - tool: "{tool name — e.g., 'web_search'}"
    purpose: "{why}"
    required: true
  - tool: "{tool name — e.g., 'code_execution'}"
    purpose: "{why}"
    required: "{true|false}"
  - tool: "{external API — e.g., 'Apollo.io API'}"
    purpose: "{why}"
    required: false
    alternative: "{fallback if not available}"

# === QUALITY CRITERIA ===
# How to evaluate if this agent's output is acceptable.
quality_criteria:
  minimum_acceptable:
    - "{criterion 1 — e.g., 'Lead list contains > 100 entries'}"
    - "{criterion 2 — e.g., 'All entries have company name, contact name, and at least one contact method'}"
    - "{criterion 3 — e.g., 'ICP match score average > 60/100'}"
  good:
    - "{criterion — e.g., '> 200 entries with > 85% email verification rate'}"
  excellent:
    - "{criterion — e.g., '> 300 entries, > 95% verified, personalization angle for each'}"

# === DISTRIBUTION ===
canonical_source: "https://knowledgelib.io/agents/{pipeline}/{agent-name}"
suggested_citation: "Source: knowledgelib.io — AI Knowledge Library (verified {YYYY-MM-DD})"

# === RELATED UNITS ===
related_kos:
  upstream_agents:
    - id: "{agents/{pipeline}/{previous-agent}}"
      label: "{Agent that runs before this one}"
  downstream_agents:
    - id: "{agents/{pipeline}/{next-agent}}"
      label: "{Agent that consumes this agent's output}"
  related_to:
    - id: "{path/to/execution-recipe}"
      label: "{Execution recipe this agent follows}"
---

# {Agent Name — e.g., "Lead Research & Enrichment Agent"}

## Agent Overview

**Role**: {One sentence — what this agent does.}
**Type**: {document_producer|executor|analyzer|hybrid}
**Phase**: {Pipeline phase and position.}
**Trigger**: {What causes this agent to be invoked — e.g., "Runs after ICP definition is approved by user."}

### Input → Output Summary

```
INPUTS:                          OUTPUTS:
┌─────────────────────┐          ┌──────────────────────────┐
│ Startup Brief       │───┐      │ Scored Lead Database     │──→ Sales Agent
│ (from Phase 0)      │   │      │ (CSV, 200+ entries)      │──→ Dashboard
├─────────────────────┤   │      ├──────────────────────────┤
│ ICP Definition      │───┼──→   │ CRM Import File          │──→ CRM Setup
│ (from Phase 1B)     │   │      │ (formatted per platform) │
├─────────────────────┤   │      ├──────────────────────────┤
│ Tool Budget         │───┘      │ Lead Quality Report      │──→ Dashboard
│ (from user)         │          │ (summary + statistics)   │
└─────────────────────┘          └──────────────────────────┘
```

## System Prompt

<!-- THE ACTUAL SYSTEM PROMPT.
     This is the complete prompt that would be injected as the system message
     when invoking this sub-agent via API. It is self-contained — an orchestrator
     copies this verbatim into the system prompt field.

     The prompt references specific knowledgelib card IDs. The orchestrator is
     responsible for fetching those cards and injecting their content into the
     agent's context alongside this prompt.

     DESIGN PRINCIPLES:
     - Be specific about methodology, not vague about goals
     - Reference card IDs for detailed knowledge (don't duplicate card content)
     - Define exact output format so downstream agents can parse
     - Include constraints as hard rules, not suggestions
     - Include quality self-check before delivering output
-->

```
You are the {Agent Name}, part of the {pipeline name} pipeline at knowledgelib.io.

## YOUR ROLE

{2-3 sentences. Precise definition of what this agent does, what it produces,
and how its output is used downstream. Be specific about the tangible deliverable.}

## YOUR INPUTS

You will receive:
1. **Startup Brief** — structured overview of the startup idea, target market,
   and business model. Extract: {specific fields to use from the brief}.
2. **ICP Definition** — ideal customer profile with firmographic criteria,
   behavioral signals, and disqualification criteria. Extract: {specific fields}.
3. **Tool Budget** — available budget for paid tools/APIs. Determines which
   execution path to follow.

## METHODOLOGY

Follow this exact sequence. Do not skip steps or reorder.

### Step 1: {Action name}
{Detailed instructions referencing specific knowledge cards.}

Reference: knowledgelib card `{card-id}` — section: {section name}.
{What to extract from the card and how to apply it.}

### Step 2: {Action name}
{Detailed instructions.}

Reference: knowledgelib card `{card-id}` — section: {section name}.

### Step 3: {Action name}
{Instructions.}

### Step 4: {Action name}
{Instructions.}

### Step 5: Quality Self-Check
Before delivering output, verify:
- [ ] {Quality criterion 1 — e.g., "Lead count > 100"}
- [ ] {Quality criterion 2 — e.g., "No duplicate entries (check by email)"}
- [ ] {Quality criterion 3 — e.g., "All entries have ICP match score"}
- [ ] {Quality criterion 4 — e.g., "Email verification rate > 80%"}
- [ ] {Quality criterion 5 — e.g., "Output matches the exact schema below"}

If any check fails, iterate on the failing step before delivering.

## HARD CONSTRAINTS

These rules override all other instructions:
1. {Constraint 1 — e.g., "NEVER include personal (non-work) email addresses."}
2. {Constraint 2 — e.g., "NEVER exceed API rate limits — use backoff."}
3. {Constraint 3 — e.g., "ALWAYS verify emails before including in final output."}
4. {Constraint 4 — e.g., "NEVER scrape data from platforms that prohibit it in ToS
   without informing the user of the risk."}
5. {Constraint 5 — e.g., "If EU jurisdiction is involved, reference knowledgelib card
   `{gdpr-card-id}` and apply GDPR constraints."}

## OUTPUT FORMAT

You MUST produce output in this exact format. Downstream agents and the dashboard
parse this schema programmatically.

### Output 1: {Deliverable name}

Format: {CSV|JSON|Markdown}

{If CSV/JSON — exact schema:}
```
{column/field definitions with types and examples}
```

{If Markdown — exact template:}
```markdown
# {Document title}
## {Section 1}
{What goes here}
## {Section 2}
{What goes here}
```

### Output 2: {Deliverable name}

Format: {format}
```
{schema or template}
```

## TONE & COMMUNICATION

- {Communication style — e.g., "Be direct and data-driven. No filler language."}
- {User interaction — e.g., "If inputs are ambiguous, ask ONE clarifying question
  before proceeding. Do not ask multiple questions."}
- {Transparency — e.g., "If data quality is below expectations, say so explicitly
  and explain what would improve it."}
- {Limitations — e.g., "If a step cannot be completed (API unavailable, insufficient
  data), report the blocker clearly and deliver partial output with a note on what's
  missing."}

## ERROR HANDLING

If you encounter errors during execution:
1. {Error type 1} → {Recovery action}
2. {Error type 2} → {Recovery action}
3. {Error type 3} → {Recovery action}
4. If unrecoverable → Deliver partial output with clear documentation of:
   - What completed successfully
   - Where the failure occurred
   - What the user needs to do to resolve it
```

## Orchestration Notes

<!-- These are NOT part of the system prompt. They're metadata for the
     orchestrating agent that manages the pipeline. -->

### Invocation Pattern

```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 32768,
  "system": "{this card's system_prompt section — injected verbatim}",
  "context_injection": [
    {
      "card_id": "{knowledge card to fetch and inject}",
      "section": "{section to include — or 'all'}",
      "inject_as": "{how to label it in context — e.g., 'ICP_METHODOLOGY'}"
    },
    {
      "card_id": "{another card}",
      "section": "{section}",
      "inject_as": "{label}"
    }
  ],
  "user_message": "{Composed from upstream agent outputs + user inputs}",
  "tools": ["{list of tools to enable — e.g., 'web_search', 'code_execution'}"]
}
```

### Retry Logic

- **Max retries**: {e.g., 2}
- **Retry on**: {e.g., "Quality self-check failure, API timeout, partial output"}
- **Do not retry on**: {e.g., "Missing required input, credential failure, constraint violation"}
- **Escalate to user if**: {e.g., "2 retries exhausted, quality still below minimum"}

### Timeout & Resource Limits

- **Expected duration**: {e.g., "2-5 minutes for standard execution"}
- **Max duration**: {e.g., "15 minutes — kill and report partial results after this"}
- **Token budget**: {e.g., "~8K tokens for output, ~4K tokens for reasoning"}
- **Cost estimate per run**: {e.g., "$0.02-$0.08 in API costs + $0-$49 in tool costs"}

### Dashboard Integration

When this agent completes, send outputs to:
- **Dashboard endpoint**: `{e.g., '/api/dashboard/sales/leads'}`
- **Storage path**: `{e.g., '/startup-name/08-sales/lead-database.csv'}`
- **Notification**: {e.g., "Notify user: 'Lead database ready — {count} leads scored and verified.'"}
- **Status update**: {e.g., "Set Phase 1C status to ✅ Complete"}

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | {YYYY-MM-DD} | Initial prompt |

## When This Matters

{1-2 sentences: when the orchestrator should invoke this agent. E.g., "Invoke after ICP definition is approved by user and before sales strategy agent. Can run in parallel with regulatory scanner if both have required inputs."}

## Related Units

- [{Upstream agent}](/{path}) — provides inputs to this agent
- [{Downstream agent}](/{path}) — consumes this agent's output
- [{Execution recipe this agent follows}](/{path})
- [{Knowledge cards referenced in system prompt}](/{path})
