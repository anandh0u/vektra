import math
import re
from typing import Any, Dict, List, Tuple

class RAGEngine:
    def __init__(self):
        # List of dicts: {"text": str, "source": str, "index": int}
        self.chunks: List[Dict[str, Any]] = []

    def clear(self):
        self.chunks.clear()

    def add_document(self, text: str, source: str):
        """Splits document text into overlapping chunks of ~500 chars."""
        cleaned = re.sub(r'\s+', ' ', text).strip()
        chunk_size = 500
        overlap = 100
        
        start = 0
        idx = 0
        while start < len(cleaned):
            end = start + chunk_size
            chunk_text = cleaned[start:end].strip()
            self.chunks.append({
                "text": chunk_text,
                "source": source,
                "index": idx
            })
            start += (chunk_size - overlap)
            idx += 1

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\w+', text.lower())

    def _term_frequency(self, tokens: List[str]) -> Dict[str, float]:
        tf = {}
        for token in tokens:
            tf[token] = tf.get(token, 0.0) + 1.0
        length = len(tokens) or 1
        for k in tf:
            tf[k] /= length
        return tf

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Performs semantic-like TF-IDF keyword overlap vector query search."""
        if not self.chunks or not query:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        # Build vocabulary across all chunks
        all_tokens_lists = [self._tokenize(chunk["text"]) for chunk in self.chunks]
        
        # Calculate Inverse Document Frequency (IDF)
        num_documents = len(self.chunks)
        idf = {}
        unique_words = set(token for tokens in all_tokens_lists for token in tokens)
        for word in unique_words:
            docs_with_word = sum(1 for tokens in all_tokens_lists if word in tokens)
            idf[word] = math.log(1.0 + (num_documents / (1.0 + docs_with_word)))

        # Vectorize query
        query_tf = self._term_frequency(query_tokens)
        query_vector = {word: tf * idf.get(word, 0.0) for word, tf in query_tf.items() if word in idf}
        query_norm = math.sqrt(sum(val ** 2 for val in query_vector.values())) or 1.0

        results: List[Tuple[float, Dict[str, Any]]] = []

        for idx, chunk in enumerate(self.chunks):
            chunk_tokens = all_tokens_lists[idx]
            chunk_tf = self._term_frequency(chunk_tokens)
            chunk_vector = {word: tf * idf.get(word, 0.0) for word, tf in chunk_tf.items() if word in query_vector}
            
            # Compute cosine similarity dot product
            dot_product = sum(query_vector[word] * chunk_vector[word] for word in chunk_vector)
            
            # Normalization of chunk vector
            chunk_all_vector = {word: tf * idf.get(word, 0.0) for word, tf in chunk_tf.items()}
            chunk_norm = math.sqrt(sum(val ** 2 for val in chunk_all_vector.values())) or 1.0
            
            similarity = dot_product / (query_norm * chunk_norm)
            
            # Scale similarity to 0-1 range
            confidence = min(max(similarity, 0.0), 1.0)
            
            # Boost score slightly if exact matches for key terms occur
            matches = sum(1 for token in query_tokens if token in chunk_tokens)
            if matches > 0:
                confidence = min(confidence + (matches * 0.05), 1.0)
            
            results.append((confidence, chunk))

        # Sort and return top_k
        results.sort(key=lambda x: x[0], reverse=True)
        
        top_results = []
        for score, chunk in results[:top_k]:
            if score > 0.02: # Minimum relevance threshold
                top_results.append({
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "confidence_score": round(score * 100, 1)
                })
                
        return top_results

# Centralized global RAG engine instance
global_rag_engine = RAGEngine()
