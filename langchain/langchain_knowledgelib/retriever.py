"""LangChain retriever for knowledgelib.io knowledge units."""

from typing import Any, List, Optional

import aiohttp
import requests
from langchain_core.callbacks import (
    AsyncCallbackManagerForRetrieverRun,
    CallbackManagerForRetrieverRun,
)
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import Field


class KnowledgelibRetriever(BaseRetriever):
    """Retriever that queries knowledgelib.io for pre-verified, cited knowledge units.

    Each returned Document contains the full markdown content of a knowledge unit,
    with metadata including confidence scores, source counts, freshness indicators,
    and verification dates.

    Example:
        .. code-block:: python

            from langchain_knowledgelib import KnowledgelibRetriever

            retriever = KnowledgelibRetriever(k=3)
            docs = retriever.invoke("best wireless earbuds under 150")

            for doc in docs:
                print(doc.metadata["confidence"], doc.metadata["canonical_question"])
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
    fetch_full_content: bool = Field(
        default=True,
        description="Fetch full markdown content for each result.",
    )
    api_key: Optional[str] = Field(
        default=None,
        description="Optional API key for future authenticated access.",
    )

    def _build_headers(self) -> dict:
        headers: dict[str, str] = {"Accept": "application/json, text/markdown"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _build_metadata(self, result: dict) -> dict:
        return {
            "source": "knowledgelib.io",
            "id": result.get("id"),
            "canonical_question": result.get("canonical_question"),
            "confidence": result.get("confidence"),
            "last_verified": result.get("last_verified"),
            "relevance_score": result.get("relevance_score"),
            "source_count": result.get("source_count"),
            "freshness": result.get("freshness"),
            "token_estimate": result.get("token_estimate"),
            "url": result.get("url"),
            "raw_md": result.get("raw_md"),
        }

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
        **kwargs: Any,
    ) -> List[Document]:
        """Fetch relevant documents from knowledgelib.io (synchronous)."""
        params: dict[str, Any] = {"q": query, "limit": self.k}
        if self.domain:
            params["domain"] = self.domain

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
        params: dict[str, str] = {"q": query, "limit": str(self.k)}
        if self.domain:
            params["domain"] = self.domain

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
