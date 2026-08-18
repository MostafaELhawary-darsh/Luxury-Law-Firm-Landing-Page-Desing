"""
Production-grade ONNX Reranker Engine with async/thread-pool support.
Uses asyncio.to_thread to offload inference from FastAPI event loop.
"""

import asyncio
import json
import logging
from typing import List

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

logger = logging.getLogger(__name__)


class ONNXRerankerEngine:
    """
    ONNX-based reranking engine for ranking document relevance.
    Supports batch processing and async execution without blocking.
    """

    def __init__(self, model_path: str, tokenizer_name: str = "BAAI/bge-reranker-large"):
        """
        Initialize ONNX Runtime session with optimizations.
        
        Args:
            model_path: Path to ONNX model file
            tokenizer_name: HuggingFace tokenizer identifier
        """
        try:
            opts = ort.SessionOptions()
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            opts.intra_op_num_threads = 4  # Tunable based on CPU cores
            opts.inter_op_num_threads = 1

            # Use CPU execution provider
            self.session = ort.InferenceSession(
                model_path,
                opts,
                providers=["CPUExecutionProvider"],
            )

            self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
            logger.info(f"✅ ONNX Reranker initialized: {model_path}")

        except FileNotFoundError:
            logger.error(f"❌ Model file not found: {model_path}")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to initialize ONNX Reranker: {e}")
            raise

    def _score_pair_sync(self, query: str, docs: List[str]) -> List[float]:
        """
        Synchronous scoring for execution in thread pool.
        
        Args:
            query: Search query
            docs: List of documents to score
            
        Returns:
            List of relevance scores
        """
        pairs = [[query, doc] for doc in docs]

        # Tokenize with proper padding and truncation
        inputs = self.tokenizer(
            pairs,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="np",
        )

        # Prepare ONNX inputs with correct types
        onnx_inputs = {
            k: v.astype(np.int64)
            for k, v in inputs.items()
            if k in [i.name for i in self.session.get_inputs()]
        }

        # Run inference
        outputs = self.session.run(None, onnx_inputs)
        logits = outputs[0].squeeze(-1)

        # Convert logits to scores
        if logits.ndim == 0:
            return [float(logits)]
        return [float(s) for s in logits]

    async def compute_scores(self, query: str, docs: List[str]) -> List[float]:
        """
        Async wrapper for scoring without blocking event loop.
        
        Args:
            query: Search query
            docs: List of documents to score
            
        Returns:
            List of relevance scores
        """
        return await asyncio.to_thread(self._score_pair_sync, query, docs)


class RerankedResult:
    """Result with rerank score attached."""

    def __init__(self, doc_id: str, text: str, score: float):
        self.id = doc_id
        self.text = text
        self.rerank_score = round(score, 4)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "rerank_score": self.rerank_score,
        }


async def batch_rerank(
    query: str,
    documents: List[dict],
    reranker: ONNXRerankerEngine,
    batch_size: int = 5,
) -> tuple[List[RerankedResult], int]:
    """
    Process documents through reranker in batches.
    
    Args:
        query: Search query
        documents: List of document dicts with 'id' and 'text'
        reranker: ONNXRerankerEngine instance
        batch_size: Number of docs per batch
        
    Returns:
        Tuple of (reranked results list, total processed count)
    """
    results = []
    doc_texts = [doc.get("text", "") for doc in documents]

    for i in range(0, len(doc_texts), batch_size):
        batch_docs = documents[i : i + batch_size]
        batch_texts = doc_texts[i : i + batch_size]

        # Compute scores for this batch
        scores = await reranker.compute_scores(query, batch_texts)

        # Attach scores and create result objects
        for doc, score in zip(batch_docs, scores):
            results.append(
                RerankedResult(
                    doc_id=doc.get("id", ""),
                    text=doc.get("text", ""),
                    score=score,
                )
            )

        # Yield control to event loop between batches
        await asyncio.sleep(0.001)

    # Sort by score descending
    results.sort(key=lambda x: x.rerank_score, reverse=True)

    return results, len(doc_texts)
