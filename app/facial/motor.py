import numpy as np
from insightface.app import FaceAnalysis
from app.core.config import settings

_face_app = None

def get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(name=settings.FACE_MODEL_NAME)
        _face_app.prepare(ctx_id=-1)
    return _face_app

def extrair_embedding(frame_bgr: np.ndarray):
    app = get_face_app()
    faces = app.get(frame_bgr)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
    return face.embedding
