import uuid
import numpy as np
from qdrant_client.models import PointStruct
from app.db.qdrant import get_qdrant
from app.core.config import settings

def buscar_rosto(embedding: np.ndarray, colecao: str):
    qdrant = get_qdrant()
    resultados = qdrant.search(
        collection_name=colecao,
        query_vector=embedding.tolist(),
        limit=1,
        score_threshold=settings.FACE_CONFIDENCE_THRESHOLD,
    )
    if not resultados:
        return None
    return {
        "qdrant_point_id": str(resultados[0].id),
        "confianca": resultados[0].score,
        "payload": resultados[0].payload,
    }

def cadastrar_rosto(entidade_id: str, embedding: np.ndarray, colecao: str) -> str:
    qdrant = get_qdrant()
    point_id = str(uuid.uuid4())
    qdrant.upsert(
        collection_name=colecao,
        points=[PointStruct(
            id=point_id,
            vector=embedding.tolist(),
            payload={"entidade_id": entidade_id},
        )],
    )
    return point_id
