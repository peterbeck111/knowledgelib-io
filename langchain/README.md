# langchain-knowledgelib

LangChain retriever for [knowledgelib.io](https://knowledgelib.io) — pre-verified, cited knowledge units for AI agents.

## Installation

```bash
pip install langchain-knowledgelib
```

## Quick Start

```python
from langchain_knowledgelib import KnowledgelibRetriever

retriever = KnowledgelibRetriever(k=3)
docs = retriever.invoke("best wireless earbuds under 150")

for doc in docs:
    print(f"[{doc.metadata['confidence']}] {doc.metadata['canonical_question']}")
    print(doc.page_content[:200])
    print()
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_url` | `https://knowledgelib.io` | Base URL (change for self-hosted instances) |
| `k` | `3` | Number of results (1-20) |
| `domain` | `None` | Filter by domain (e.g., `"consumer_electronics"`, `"computing"`, `"home"`) |
| `fetch_full_content` | `True` | Fetch full markdown or just canonical question text |
| `api_key` | `None` | Optional API key (not required for the free public API) |

## Document Metadata

Each returned `Document` includes rich metadata from knowledgelib.io:

```python
doc.metadata = {
    "source": "knowledgelib.io",
    "id": "consumer-electronics/audio/wireless-earbuds-under-150/2026",
    "canonical_question": "What are the best wireless earbuds under $150 in 2026?",
    "confidence": 0.88,          # 0.0-1.0, based on source quality
    "last_verified": "2026-02-07",
    "source_count": 8,           # number of cited sources
    "freshness": "high",         # high/medium/low
    "token_estimate": 1800,      # approximate token count
    "relevance_score": 0.97,     # search relevance
    "url": "https://...",        # human-readable page
    "raw_md": "https://...",     # raw markdown URL
}
```

## Use in a RAG Chain

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI

retriever = KnowledgelibRetriever(k=2, domain="consumer_electronics")

prompt = ChatPromptTemplate.from_template(
    "Answer based on these verified knowledge units:\n\n{context}\n\nQuestion: {question}"
)

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI()
)

result = chain.invoke("best noise cancelling headphones under 200")
```

## Async Support

```python
docs = await retriever.ainvoke("best wireless earbuds under 150")
```

## What is knowledgelib.io?

An AI Knowledge Library with structured, cited knowledge units optimized for AI agent consumption. Each unit answers one canonical question with full source provenance, confidence scoring, and freshness tracking. Pre-verified answers that save tokens ($0.02/query vs $0.50-$5.00 in agent compute), reduce hallucinations, and cite every source.

- 172+ knowledge units across 11 domains
- Free API, no authentication required
- [API Documentation](https://knowledgelib.io/api)
- [OpenAPI Spec](https://knowledgelib.io/api/v1/openapi.json)

## License

CC BY-SA 4.0
