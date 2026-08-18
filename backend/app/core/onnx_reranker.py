from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import onnxruntime as ort
except ImportError:  # pragma: no cover - optional runtime dependency
    ort = None


@dataclass
class RerankResult:
    id: str
    text: str
    score: float
    metadata: dict[str, Any]


class FastONNXReranker:
    def __init__(self, model_path: str = "", provider: str = "CPUExecutionProvider") -> None:
        self.model_path = model_path
        self.provider = provider
        self._session = None
        self._tokenizer = None

        if model_path and Path(model_path).exists():
            self._load_model(model_path)

    def _load_model(self, model_path: str) -> None:
        if ort is None:
            raise RuntimeError("onnxruntime is required for ONNX reranking")

        self._session = ort.InferenceSession(
            model_path,
            providers=[self.provider] if self.provider else None,
        )

    def is_ready(self) -> bool:
        return self._session is not None

    def rerank(self, query: str, documents: list[dict[str, Any]], top_k: int = 5) -> list[dict[str, Any]]:
        if not documents:
            return []

        if not self.is_ready():
            return self._fallback_rerank(query, documents, top_k=top_k)

        encoded = self._prepare_inputs(query, documents)
        outputs = self._session.run(None, encoded)
        scores = outputs[0].reshape(-1).tolist() if isinstance(outputs[0], (list, tuple)) else outputs[0].tolist()
        ranked = []
        for item, score in zip(documents, scores[: len(documents)]):
            ranked.append(
                {
                    "id": str(item.get("id", hashlib.sha1(json.dumps(item, ensure_ascii=False).encode("utf-8")).hexdigest())),
                    "text": str(item.get("text") or item.get("metadata", {}).get("content") or ""),
                    "score": float(score),
                    "metadata": item.get("metadata", item),
                }
            )

        ranked.sort(key=lambda entry: float(entry["score"]), reverse=True)
        return ranked[: max(1, min(top_k, len(ranked)))]

    def _prepare_inputs(self, query: str, documents: list[dict[str, Any]]) -> dict[str, Any]:
        pairs = [
            (
                query,
                str(item.get("text") or item.get("metadata", {}).get("content") or ""),
            )
            for item in documents
        ]

        if not pairs:
            return {}

        try:
            from transformers import AutoTokenizer
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError("transformers is required for tokenization") from exc

        if self._tokenizer is None:
            self._tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-reranker-v2-m3")

        tokenized = self._tokenizer(
            [query for _ in pairs],
            [text for _, text in pairs],
            padding=True,
            truncation=True,
            return_tensors="pt",
            max_length=512,
        )

        return {"input_ids": tokenized["input_ids"].numpy(), "attention_mask": tokenized["attention_mask"].numpy()}

    def _fallback_rerank(self, query: str, documents: list[dict[str, Any]], top_k: int = 5) -> list[dict[str, Any]]:
        ranked = []
        for index, document in enumerate(documents):
            content = str(document.get("text") or document.get("metadata", {}).get("content") or "")
            score = self._lexical_overlap(query.lower(), content.lower())
            ranked.append(
                {
                    "id": str(document.get("id", index)),
                    "text": content,
                    "score": float(score),
                    "metadata": document.get("metadata", document),
                }
            )
        ranked.sort(key=lambda entry: float(entry["score"]), reverse=True)
        return ranked[: max(1, min(top_k, len(ranked)))]

    @staticmethod
    def _lexical_overlap(query: str, text: str) -> float:
        if not query or not text:
            return 0.0
        query_terms = set(query.split())
        text_terms = set(text.split())
        if not query_terms:
            return 0.0
        overlap = len(query_terms.intersection(text_terms)) / len(query_terms)
        return max(0.0, min(1.0, overlap))
