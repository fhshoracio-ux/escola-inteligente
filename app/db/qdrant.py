from qdrant_client import QdrantClient

_client = None

def get_qdrant() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(host="localhost", port=6333)
    return _client