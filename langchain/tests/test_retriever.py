"""Tests for KnowledgelibRetriever."""

import re

import pytest
import responses
from aioresponses import aioresponses

from langchain_knowledgelib import KnowledgelibRetriever

from .conftest import MOCK_EMPTY_RESPONSE, MOCK_QUERY_RESPONSE, MOCK_UNIT_MARKDOWN

BASE_URL = "https://knowledgelib.io"
RE_QUERY = re.compile(r"^https://knowledgelib\.io/api/v1/query\b")
RE_UNIT_UNDER_150 = re.compile(
    r"^https://knowledgelib\.io/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026\.md\b"
)
RE_UNIT_OVER_150 = re.compile(
    r"^https://knowledgelib\.io/api/v1/units/consumer-electronics/audio/wireless-earbuds-over-150/2026\.md\b"
)


class TestSyncRetriever:
    """Synchronous retriever tests using responses mock."""

    @responses.activate
    def test_basic_query_returns_documents(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026.md",
            body=MOCK_UNIT_MARKDOWN,
        )
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-over-150/2026.md",
            body=MOCK_UNIT_MARKDOWN,
        )

        retriever = KnowledgelibRetriever(k=3)
        docs = retriever.invoke("best wireless earbuds under 150")

        assert len(docs) == 2
        assert all(hasattr(d, "page_content") for d in docs)
        assert all(hasattr(d, "metadata") for d in docs)

    @responses.activate
    def test_full_content_fetched_by_default(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026.md",
            body=MOCK_UNIT_MARKDOWN,
        )
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-over-150/2026.md",
            body=MOCK_UNIT_MARKDOWN,
        )

        retriever = KnowledgelibRetriever(k=3)
        docs = retriever.invoke("best wireless earbuds under 150")

        assert "Best Wireless Earbuds Under $150" in docs[0].page_content

    @responses.activate
    def test_fetch_full_content_false(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)

        retriever = KnowledgelibRetriever(k=3, fetch_full_content=False)
        docs = retriever.invoke("best wireless earbuds under 150")

        assert len(docs) == 2
        assert docs[0].page_content == "What are the best wireless earbuds under $150 in 2026?"
        # Should NOT have called the unit endpoint
        assert len(responses.calls) == 1

    @responses.activate
    def test_metadata_fields(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)

        retriever = KnowledgelibRetriever(k=3, fetch_full_content=False)
        docs = retriever.invoke("test query")

        meta = docs[0].metadata
        assert meta["source"] == "knowledgelib.io"
        assert meta["id"] == "consumer-electronics/audio/wireless-earbuds-under-150/2026"
        assert meta["confidence"] == 0.88
        assert meta["last_verified"] == "2026-02-07"
        assert meta["source_count"] == 8
        assert meta["freshness"] == "high"
        assert meta["token_estimate"] == 1800
        assert meta["relevance_score"] == 0.97
        assert meta["url"] is not None
        assert meta["raw_md"] is not None

    @responses.activate
    def test_domain_filter(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)

        retriever = KnowledgelibRetriever(
            k=3, domain="consumer_electronics", fetch_full_content=False
        )
        retriever.invoke("test query")

        assert "domain=consumer_electronics" in responses.calls[0].request.url

    @responses.activate
    def test_empty_results(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_EMPTY_RESPONSE)

        retriever = KnowledgelibRetriever(k=3)
        docs = retriever.invoke("nonexistent topic xyz")

        assert docs == []

    @responses.activate
    def test_custom_api_url(self):
        custom_url = "https://custom.knowledgelib.io"
        responses.get(f"{custom_url}/api/v1/query", json=MOCK_EMPTY_RESPONSE)

        retriever = KnowledgelibRetriever(api_url=custom_url, k=1)
        retriever.invoke("test")

        assert responses.calls[0].request.url.startswith(custom_url)

    @responses.activate
    def test_api_error_raises(self):
        responses.get(f"{BASE_URL}/api/v1/query", status=500)

        retriever = KnowledgelibRetriever(k=3)

        with pytest.raises(Exception):
            retriever.invoke("test query")

    @responses.activate
    def test_unit_fetch_failure_falls_back(self):
        responses.get(f"{BASE_URL}/api/v1/query", json=MOCK_QUERY_RESPONSE)
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-under-150/2026.md",
            status=500,
        )
        responses.get(
            f"{BASE_URL}/api/v1/units/consumer-electronics/audio/wireless-earbuds-over-150/2026.md",
            status=500,
        )

        retriever = KnowledgelibRetriever(k=3)
        docs = retriever.invoke("test")

        # Falls back to canonical_question
        assert docs[0].page_content == "What are the best wireless earbuds under $150 in 2026?"


class TestAsyncRetriever:
    """Asynchronous retriever tests using aioresponses mock."""

    @pytest.mark.asyncio
    async def test_async_basic_query(self):
        with aioresponses() as m:
            m.get(RE_QUERY, payload=MOCK_QUERY_RESPONSE)
            m.get(RE_UNIT_UNDER_150, body=MOCK_UNIT_MARKDOWN)
            m.get(RE_UNIT_OVER_150, body=MOCK_UNIT_MARKDOWN)

            retriever = KnowledgelibRetriever(k=3)
            docs = await retriever.ainvoke("best wireless earbuds under 150")

            assert len(docs) == 2
            assert "Best Wireless Earbuds Under $150" in docs[0].page_content

    @pytest.mark.asyncio
    async def test_async_no_full_content(self):
        with aioresponses() as m:
            m.get(RE_QUERY, payload=MOCK_QUERY_RESPONSE)

            retriever = KnowledgelibRetriever(k=3, fetch_full_content=False)
            docs = await retriever.ainvoke("test query")

            assert len(docs) == 2
            assert docs[0].page_content == "What are the best wireless earbuds under $150 in 2026?"

    @pytest.mark.asyncio
    async def test_async_empty_results(self):
        with aioresponses() as m:
            m.get(RE_QUERY, payload=MOCK_EMPTY_RESPONSE)

            retriever = KnowledgelibRetriever(k=3)
            docs = await retriever.ainvoke("nonexistent topic")

            assert docs == []
