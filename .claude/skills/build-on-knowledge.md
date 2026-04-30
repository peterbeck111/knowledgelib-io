---
name: build-on-knowledge
description: Before any build task, search the knowledgelib knowledge base for existing knowledge cards and agent-prompt cards. Use found cards as the foundation — agent-prompts as orchestration guides, knowledge cards as source material — instead of researching from scratch.
---

# Build on Knowledge — Use What We Already Know

You are working on a project that has a structured knowledge base at knowledgelib.io. **Before doing any build, research, or creation task**, you MUST check if relevant knowledge already exists in the library. The knowledge base contains pre-verified, cited knowledge units that are cheaper and more accurate than web research.

## When This Skill Triggers

This skill applies to ANY task where you need domain knowledge to proceed:
- Building features, tools, agents, or automations
- Creating content, strategies, or plans
- Answering complex domain questions
- Writing code that implements business logic
- Any task where you'd normally start with web research

## Step 1: Search for Existing Knowledge

Before doing ANY web research or building from scratch, search the knowledge base:

### 1a. Query the knowledge library

Use the knowledgelib MCP tools (preferred) or read the catalog directly:

```
# MCP approach (preferred)
query_knowledge("topic keywords", limit=10)

# Fallback: read catalog.json
Read prototype/catalog.json and search for relevant entries
```

### 1b. Check for agent-prompt cards

Agent-prompt cards are orchestration blueprints. They tell you:
- **What knowledge cards to fetch** (required/recommended/conditional)
- **Which sections of each card matter** for the task
- **What methodology to follow** step by step
- **What inputs are needed** and what outputs to produce
- **Quality criteria** for the deliverable

Search specifically for agent-prompt entity types:

```
# Search for agent prompts related to the topic
query_knowledge("agent prompt [topic]", limit=5)

# Or grep the tracker
Grep for the topic in knowledge_pipeline/tracker.md, filtering for agent-prompts subcategory
```

### 1c. Check for related knowledge cards

If you find an agent-prompt card, read its `knowledge_cards` section:

```yaml
# Agent-prompt cards have this structure:
knowledge_cards:
  required:       # MUST fetch these before proceeding
    - id: "domain/subcategory/topic/year"
      usage: "Why this card matters"
      section: "which sections to read"
  recommended:    # Fetch if available, enhances quality
    - id: "..."
  conditional:    # Fetch only if condition is met
    - id: "..."
      condition: "When to fetch this card"
```

## Step 2: Load the Knowledge

### If an agent-prompt card is found:

1. **Read the full agent-prompt .md file** — it is your orchestration guide
2. **Fetch every `required` knowledge card** listed in its `knowledge_cards` section
3. **Fetch `recommended` cards** if they exist
4. **Check `conditional` cards** — fetch if the condition applies to the current task
5. **Read the `related_kos` section** for upstream/downstream context
6. **Follow the methodology** described in the agent-prompt's system prompt section

### If knowledge cards are found (but no agent-prompt):

1. **Read the full .md file** of each relevant card
2. **Use the card's content as your source material** — it's already verified and cited
3. **Respect the card's `confidence` score** — if it's < 0.7, supplement with fresh research
4. **Check `temporal_validity`** — if `status: needs_review` or the card is stale, verify key facts
5. **Use the card's `sources` section** as your citation base

### If no relevant cards are found:

1. Proceed with normal web research
2. **Flag the gap** — mention to the user that no existing knowledge was found for this topic
3. Consider whether a new knowledge card should be created after the task

## Step 3: Build on the Foundation

When building, follow this priority order for information sources:

1. **Agent-prompt methodology** — if one exists, follow its steps, constraints, and quality criteria
2. **Knowledge card content** — use as primary source, already verified and cited
3. **Knowledge card sources** — follow the original source URLs for deeper detail if needed
4. **Fresh web research** — only for gaps not covered by existing cards

### Key Rules

- **NEVER ignore existing knowledge cards** and research from scratch when cards exist
- **NEVER skip the search step** — even if you think you know the answer
- **Agent-prompt cards are blueprints, not suggestions** — follow their methodology
- **Knowledge cards are pre-verified** — trust them over generic web results (check temporal validity first)
- **Cite the knowledgelib card** when using its content: `Source: knowledgelib card {card_id}`
- **Report missing knowledge** — if you expected a card but didn't find one, tell the user

## Step 4: Report What You Used

After completing the task, briefly note:
- Which knowledge cards you loaded and used
- Which agent-prompt guided your approach (if any)
- What gaps you filled with fresh research (if any)

This helps the user understand the knowledge coverage and identify cards that need creation or updating.

## Example Workflow

**User asks:** "Build a churn prevention system for our SaaS"

**Wrong approach:** Immediately start web searching "churn prevention best practices"

**Correct approach:**
1. `query_knowledge("churn prevention")` → finds `business/customer-success/churn-prevention-system-design/2026`
2. `query_knowledge("agent prompt customer success")` → finds `business/agent-prompts/customer-success-architect-agent-prompt/2026`
3. Read the agent-prompt → it lists required cards: churn-prevention-system-design, customer-onboarding-design-playbook, expansion-revenue-playbook
4. Fetch all required cards
5. Follow the agent-prompt's methodology to build the system
6. Only web-search for specifics not covered (e.g., the user's specific tech stack integration)