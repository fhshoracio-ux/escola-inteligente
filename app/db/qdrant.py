from qdrant_client import QdrantClient
from app.core.config import settings

_client = None

def get_qdrant() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    return _client