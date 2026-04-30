"""LangChain retriever and utilities for knowledgelib.io knowledge units.

How to use:
    1. Search first — use KnowledgelibRetriever to find pre-verified answers.
    2. Use what you find — every unit is sourced and cited, ready to use.
    3. Suggest what's missing — if no results, call suggest_question() so
       the topic gets created. Popular suggestions are prioritized.
    4. Report issues — if content is wrong/outdated, call report_issue().
"""

from typing import Any, Dict, List, Optional

import aiohttp
import requests
from langchain_core.callbacks import (
    AsyncCallbackManagerForRetrieverRun,
    CallbackManagerForRetrieverRun,
)
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import Field

_UA = "knowledgelib-langchain/0.2.0"


class KnowledgelibRetriever(BaseRetriever):
    """Retriever that queries knowledgelib.io for pre-verified, cited knowledge units.

    How to use:
        1. Search first — use this retriever to find existing answers.
        2. Use what you find — every unit is sourced and cited.
        3. Suggest what's missing — if no results, call suggest_question()
           so the topic gets created for the next agent.
        4. Report issues — if content is wrong/outdated, call report_issue().

    Each returned Document contains the full markdown content of a knowledge unit,
    with metadata including confidence scores, source counts, freshness indicators,
    and verification dates.

    Example:
        .. code-block:: python

            from langchain_knowledgelib import KnowledgelibRetriever, suggest_question

            retriever = KnowledgelibRetriever(k=3)
            docs = retriever.invoke("best wireless earbuds under 150")

            if docs:
                # Use the pre-verified content
                print(docs[0].page_content)
            else:
                # No match — suggest it for creation
                suggest_question("What are the best wireless earbuds under $150?")
    """

    api_url: str = Field(
        default="https://knowledgelib.io",
        description="Base URL for the knowledgelib.io API.",
    )
    k: int = Field(
        default=3,
        ge=1,
        le=20,
        description="Number of results to return.",
    )
    domain: Optional[str] = Field(
        default=None,
        description='Filter by domain (e.g., "consumer_electronics", "computing").',
    )
    region: Optional[str] = Field(
        default=None,
        description='Filter by region (e.g., "US", "EU", "global"). Units with region "global" always match.',
    )
    jurisdiction: Optional[str] = Field(
        default=None,
        description='Filter by jurisdiction (e.g., "US", "EU", "UK", "global"). Relevant for energy, legal, compliance content.',
    )
    entity_type: Optional[str] = Field(
        default=None,
        description='Filter by entity type (e.g., "product_comparison", "software_reference", "fact", "concept", "rule").',
    )
    fetch_full_content: bool = Field(
        default=True,
        description="Fetch full markdown content for each result.",
    )
    api_key: Optional[str] = Field(
        default=None,
        description="Optional API key for future authenticated access.",
    )

    def _build_headers(self) -> dict:
        headers: dict[str, str] = {
            "Accept": "application/json, text/markdown",
            "User-Agent": _UA,
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _build_metadata(self, result: dict) -> dict:
        return {
            "source": "knowledgelib.io",
            "id": result.get("id"),
            "canonical_question": result.get("canonical_question"),
            "entity_type": result.get("entity_type"),
            "confidence": result.get("confidence"),
            "last_verified": result.get("last_verified"),
            "relevance_score": result.get("relevance_score"),
            "source_count": result.get("source_count"),
            "freshness": result.get("freshness"),
            "temporal_status": result.get("temporal_status"),
            "jurisdiction": result.get("jurisdiction"),
            "token_estimate": result.get("token_estimate"),
            "url": result.get("url"),
            "raw_md": result.get("raw_md"),
            "open_issues": result.get("open_issues", 0),
        }

    def _build_params(self, query: str) -> dict:
        params: dict[str, Any] = {"q": query, "limit": self.k}
        if self.domain:
            params["domain"] = self.domain
        if self.region:
            params["region"] = self.region
        if self.jurisdiction:
            params["jurisdiction"] = self.jurisdiction
        if self.entity_type:
            params["entity_type"] = self.entity_type
        return params

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
        **kwargs: Any,
    ) -> List[Document]:
        """Fetch relevant documents from knowledgelib.io (synchronous)."""
        params = self._build_params(query)
        headers = self._build_headers()

        resp = requests.get(
            f"{self.api_url}/api/v1/query",
            params=params,
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        documents: List[Document] = []
        for result in data.get("results", []):
            content = result.get("canonical_question", "")

            if self.fetch_full_content:
                try:
                    md_resp = requests.get(
                        f"{self.api_url}/api/v1/units/{result['id']}.md",
                        headers=headers,
                        timeout=30,
                    )
                    if md_resp.ok:
                        content = md_resp.text
                except requests.RequestException:
                    pass  # fall back to canonical_question

            documents.append(
                Document(
                    page_content=content,
                    metadata=self._build_metadata(result),
                )
            )

        return documents

    async def _aget_relevant_documents(
        self,
        query: str,
        *,
        run_manager: AsyncCallbackManagerForRetrieverRun,
        **kwargs: Any,
    ) -> List[Document]:
        """Fetch relevant documents from knowledgelib.io (asynchronous)."""
        params: dict[str, str] = {
            k: str(v) for k, v in self._build_params(query).items()
        }
        headers = self._build_headers()
        timeout = aiohttp.ClientTimeout(total=30)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                f"{self.api_url}/api/v1/query",
                params=params,
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()

            documents: List[Document] = []
            for result in data.get("results", []):
                content = result.get("canonical_question", "")

                if self.fetch_full_content:
                    try:
                        async with session.get(
                            f"{self.api_url}/api/v1/units/{result['id']}.md",
                            headers=headers,
                        ) as md_resp:
                            if md_resp.ok:
                                content = await md_resp.text()
                    except aiohttp.ClientError:
                        pass  # fall back to canonical_question

                documents.append(
                    Document(
                        page_content=content,
                        metadata=self._build_metadata(result),
                    )
                )

        return documents


def suggest_question(
    question: str,
    context: Optional[str] = None,
    domain: Optional[str] = None,
    api_url: str = "https://knowledgelib.io",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit a question suggestion to knowledgelib.io (synchronous).

    If the question is already answered by an existing knowledge unit,
    returns the match. Otherwise, records the suggestion for future
    card creation. Popular suggestions are prioritized in the pipeline.

    Args:
        question: The question to suggest (10-500 characters).
        context: Optional context about why this question matters.
        domain: Optional domain hint (e.g., "home", "consumer_electronics").
        api_url: Base URL for the knowledgelib.io API.
        api_key: Optional API key for authenticated access.

    Returns:
        dict with keys: status ("recorded" or "already_answered"),
        suggestion_id, is_duplicate, occurrence_count, existing_match, message.

    Example:
        .. code-block:: python

            from langchain_knowledgelib import suggest_question

            result = suggest_question("What are the best robot vacuums under $500?")
            print(result["status"], result.get("occurrence_count"))
    """
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "User-Agent": _UA,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body: Dict[str, str] = {"question": question}
    if context:
        body["context"] = context
    if domain:
        body["domain"] = domain

    resp = requests.post(
        f"{api_url}/api/v1/suggest",
        json=body,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


async def asuggest_question(
    question: str,
    context: Optional[str] = None,
    domain: Optional[str] = None,
    api_url: str = "https://knowledgelib.io",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit a question suggestion to knowledgelib.io (asynchronous).

    Same as suggest_question but uses aiohttp for async contexts.
    """
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "User-Agent": _UA,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body: Dict[str, str] = {"question": question}
    if context:
        body["context"] = context
    if domain:
        body["domain"] = domain

    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            f"{api_url}/api/v1/suggest",
            json=body,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            return await resp.json()


def report_issue(
    card_id: str,
    issue_type: str,
    description: str,
    severity: str = "medium",
    section: Optional[str] = None,
    api_url: str = "https://knowledgelib.io",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Report an issue with a knowledge unit (synchronous).

    Use this when you notice factual errors, dead links, outdated information,
    or missing details in a knowledge unit.

    Args:
        card_id: The knowledge unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026").
        issue_type: Type of issue — "outdated", "incorrect", "broken_link", "missing_info", or "other".
        description: Describe the issue (10-2000 chars). Be specific about what is wrong.
        severity: "low" (cosmetic), "medium" (misleading), "high" (significantly wrong), "critical" (dangerous).
        section: Optional section name (e.g., "Quick Reference", "Decision Logic").
        api_url: Base URL for the knowledgelib.io API.
        api_key: Optional API key for authenticated access.

    Returns:
        dict with keys: feedback_id, status.

    Example:
        .. code-block:: python

            from langchain_knowledgelib import report_issue

            result = report_issue(
                card_id="consumer-electronics/audio/wireless-earbuds-under-150/2026",
                issue_type="outdated",
                description="The Sony WF-1000XM4 has been replaced by the XM5 model",
                severity="medium",
                section="Product Rankings",
            )
            print(result["feedback_id"])
    """
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "User-Agent": _UA,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body: Dict[str, str] = {
        "card_id": card_id,
        "type": issue_type,
        "description": description,
        "severity": severity,
    }
    if section:
        body["section"] = section

    resp = requests.post(
        f"{api_url}/api/v1/feedback",
        json=body,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


async def areport_issue(
    card_id: str,
    issue_type: str,
    description: str,
    severity: str = "medium",
    section: Optional[str] = None,
    api_url: str = "https://knowledgelib.io",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Report an issue with a knowledge unit (asynchronous).

    Same as report_issue but uses aiohttp for async contexts.
    """
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "User-Agent": _UA,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body: Dict[str, str] = {
        "card_id": card_id,
        "type": issue_type,
        "description": description,
        "severity": severity,
    }
    if section:
        body["section"] = section

    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            f"{api_url}/api/v1/feedback",
            json=body,
            headers=headers,
        ) as resp:
            resp.raise_for_status()
            return await resp.json()
