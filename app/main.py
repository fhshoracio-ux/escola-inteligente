from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.v1.router import router
from app.core.logging_config import logger
from app.core.config import settings
import os

app = FastAPI(title="Sistema Escolar Facial")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup():
    try:
        from app.db.qdrant import get_qdrant
        from qdrant_client.models import Distance, VectorParams
        qdrant = get_qdrant()
        colecoes = [c.name for c in qdrant.get_collections().collections]
        if "rostos_alunos" not in colecoes:
            qdrant.create_collection(
                collection_name="rostos_alunos",
                vectors_config=VectorParams(size=512, distance=Distance.COSINE)
            )
            logger.info("[Qdrant] Colecao rostos_alunos criada automaticamente!")
        else:
            logger.info("[Qdrant] Colecao rostos_alunos OK!")
    except Exception as e:
        logger.error(f"[Qdrant] Erro no startup: {e}")

# Servir uploads
uploads_path = settings.UPLOADS_DIR
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Servir HLS streams
hls_path = settings.HLS_DIR
os.makedirs(hls_path, exist_ok=True)
app.mount("/hls", StaticFiles(directory=hls_path), name="hls")

# Servir painel React (opcional, so monta se o caminho existir)
painel_path = settings.PAINEL_DIST_PATH
if painel_path and os.path.exists(painel_path):
    app.mount("/painel", StaticFiles(directory=painel_path, html=True), name="painel")

@app.get("/")
async def raiz():
    return {"status": "ok", "mensagem": "Sistema Escolar Facial rodando"}

@app.get("/painel/{full_path:path}")
async def servir_painel(full_path: str):
    index = os.path.join(painel_path, "index.html")
    return FileResponse(index)