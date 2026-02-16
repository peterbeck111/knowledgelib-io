"""Shared fixtures for knowledgelib retriever tests."""

import pytest


MOCK_QUERY_RESPONSE = {
    "query": "best wireless earbuds under 150",
    "results": [
        {
            "id": "consumer-electronics/audio/wireless-earbuds-under-150/2026",
            "canonical_question": "What are the best wireless earbuds under $150 in 2026?",
            "confidence": 0.88,
            "last_verified": "2026-02-07",
            "relevance_score": 0.97,
            "url": "https://knowledgelib.io/consumer-electronics/audio/wireless-earbuds-under-150/2026",
            "raw_md": "https://knowledgelib.io/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026.md",
            "token_estimate": 1800,
            "source_count": 8,
            "freshness": "high",
        },
        {
            "id": "consumer-electronics/audio/wireless-earbuds-over-150/2026",
            "canonical_question": "What are the best wireless earbuds over $150 in 2026?",
            "confidence": 0.90,
            "last_verified": "2026-02-10",
            "relevance_score": 0.72,
            "url": "https://knowledgelib.io/consumer-electronics/audio/wireless-earbuds-over-150/2026",
            "raw_md": "https://knowledgelib.io/api/v1/units/consumer-electronics/audio/wireless-earbuds-over-150/2026.md",
            "token_estimate": 1650,
            "source_count": 7,
            "freshness": "high",
        },
    ],
    "total_results": 2,
    "query_cost_tokens": 42,
}

MOCK_UNIT_MARKDOWN = """---
canonical_question: "What are the best wireless earbuds under $150 in 2026?"
confidence: 0.88
last_verified: 2026-02-07
---

# Best Wireless Earbuds Under $150 (2026)

## Summary
The Sony WF-1000XM5 and Samsung Galaxy Buds3 Pro lead the pack.
"""

MOCK_EMPTY_RESPONSE = {
    "query": "nonexistent topic xyz",
    "results": [],
    "total_results": 0,
    "query_cost_tokens": 42,
}
