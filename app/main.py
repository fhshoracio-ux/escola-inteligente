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

    # Migração automática — tabelas de matrícula
    try:
        from app.db.database import engine
        import sqlalchemy as sa
        async with engine.begin() as conn:
            await conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS solicitacoes_matricula (
                    id VARCHAR(36) PRIMARY KEY,
                    escola_id VARCHAR(36) NOT NULL,
                    nome_aluno VARCHAR(200) NOT NULL,
                    data_nascimento DATE,
                    cpf_aluno VARCHAR(14),
                    nome_responsavel VARCHAR(200) NOT NULL,
                    cpf_responsavel VARCHAR(14) NOT NULL,
                    telefone_responsavel VARCHAR(20) NOT NULL,
                    tipo VARCHAR(20) NOT NULL DEFAULT 'matricula',
                    turma_desejada VARCHAR(100),
                    observacoes TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
                    mensagem_coordenador TEXT,
                    criado_em DATETIME NOT NULL DEFAULT NOW(),
                    atualizado_em DATETIME
                )
            """))
            await conn.execute(sa.text("""
                CREATE TABLE IF NOT EXISTS documentos_matricula (
                    id VARCHAR(36) PRIMARY KEY,
                    solicitacao_id VARCHAR(36) NOT NULL,
                    tipo VARCHAR(50) NOT NULL,
                    caminho VARCHAR(500) NOT NULL,
                    enviado_em DATETIME NOT NULL DEFAULT NOW(),
                    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_matricula(id) ON DELETE CASCADE
                )
            """))
        logger.info("[Matriculas] Tabelas OK!")
    except Exception as e:
        logger.error(f"[Matriculas] Erro na migração: {e}")

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
