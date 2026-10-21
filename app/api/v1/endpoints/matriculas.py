from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import os
import sqlalchemy as sa
from app.db.database import SessionLocal
from app.core.logging_config import logger

router = APIRouter(prefix="/matriculas", tags=["Matrículas"])

UPLOAD_DIR = "uploads/matriculas"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Schemas ──────────────────────────────────────────────────────────────────

class SolicitacaoCreate(BaseModel):
    escola_id: str
    nome_aluno: str
    data_nascimento: Optional[str] = None
    cpf_aluno: Optional[str] = None
    nome_responsavel: str
    cpf_responsavel: str
    telefone_responsavel: str
    tipo: str = "matricula"          # matricula | rematricula | transferencia
    turma_desejada: Optional[str] = None
    observacoes: Optional[str] = None

class SolicitacaoUpdate(BaseModel):
    status: str                      # pendente | em_analise | aprovado | rejeitado | correcao
    mensagem_coordenador: Optional[str] = None

# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_solicitacao(db, sol_id: str):
    r = await db.execute(sa.text(
        "SELECT * FROM solicitacoes_matricula WHERE id = :id"
    ), {"id": sol_id})
    row = r.mappings().fetchone()
    if not row:
        raise HTTPException(404, "Solicitação não encontrada")
    return dict(row)

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/")
async def criar_solicitacao(dados: SolicitacaoCreate):
    """Pai cria uma solicitação de matrícula."""
    async with SessionLocal() as db:
        sol_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO solicitacoes_matricula
                (id, escola_id, nome_aluno, data_nascimento, cpf_aluno,
                 nome_responsavel, cpf_responsavel, telefone_responsavel,
                 tipo, turma_desejada, observacoes, status, criado_em)
            VALUES
                (:id, :escola_id, :nome_aluno, :data_nascimento, :cpf_aluno,
                 :nome_responsavel, :cpf_responsavel, :telefone_responsavel,
                 :tipo, :turma_desejada, :observacoes, 'pendente', NOW())
        """), {"id": sol_id, **dados.model_dump()})
        await db.commit()
        return {"id": sol_id, "status": "pendente"}


@router.get("/")
async def listar_solicitacoes(
    escola_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Coordenador lista todas as solicitações."""
    async with SessionLocal() as db:
        filtros = []
        params = {}
        if escola_id:
            filtros.append("escola_id = :escola_id")
            params["escola_id"] = escola_id
        if status:
            filtros.append("status = :status")
            params["status"] = status
        where = ("WHERE " + " AND ".join(filtros)) if filtros else ""
        r = await db.execute(sa.text(
            f"SELECT * FROM solicitacoes_matricula {where} ORDER BY criado_em DESC"
        ), params)
        return r.mappings().fetchall()


@router.get("/{sol_id}")
async def obter_solicitacao(sol_id: str):
    async with SessionLocal() as db:
        sol = await _get_solicitacao(db, sol_id)
        # busca documentos
        r = await db.execute(sa.text(
            "SELECT * FROM documentos_matricula WHERE solicitacao_id = :id"
        ), {"id": sol_id})
        sol["documentos"] = r.mappings().fetchall()
        return sol


@router.patch("/{sol_id}")
async def atualizar_status(sol_id: str, dados: SolicitacaoUpdate):
    """Coordenador aprova, rejeita ou pede correção."""
    async with SessionLocal() as db:
        sol = await _get_solicitacao(db, sol_id)

        await db.execute(sa.text("""
            UPDATE solicitacoes_matricula
            SET status = :status,
                mensagem_coordenador = :msg,
                atualizado_em = NOW()
            WHERE id = :id
        """), {"status": dados.status, "msg": dados.mensagem_coordenador, "id": sol_id})

        # Se aprovado → cria o aluno automaticamente
        if dados.status == "aprovado":
            aluno_id = str(uuid.uuid4())
            matricula = f"AUTO{datetime.now().strftime('%Y%m%d%H%M%S')}"
            await db.execute(sa.text("""
                INSERT INTO aluno
                    (id, escola_id, nome, matricula, data_nascimento, ativo, criado_em)
                VALUES
                    (:id, :escola_id, :nome, :matricula, :data_nasc, 1, NOW())
            """), {
                "id": aluno_id,
                "escola_id": sol["escola_id"],
                "nome": sol["nome_aluno"],
                "matricula": matricula,
                "data_nasc": sol["data_nascimento"],
            })
            await db.commit()
            logger.info(f"Aluno criado automaticamente: {aluno_id} ({sol['nome_aluno']})")
            return {"status": dados.status, "aluno_id": aluno_id, "matricula": matricula}

        await db.commit()
        return {"status": dados.status}


@router.post("/{sol_id}/documentos")
async def upload_documento(
    sol_id: str,
    tipo: str = Form(...),           # foto | rg | cpf | comprovante | historico
    arquivo: UploadFile = File(...)
):
    """Pai envia um documento da solicitação."""
    async with SessionLocal() as db:
        await _get_solicitacao(db, sol_id)   # valida existência

        ext = os.path.splitext(arquivo.filename)[1].lower()
        nome_arquivo = f"{sol_id}_{tipo}{ext}"
        caminho = os.path.join(UPLOAD_DIR, nome_arquivo)

        conteudo = await arquivo.read()
        with open(caminho, "wb") as f:
            f.write(conteudo)

        doc_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO documentos_matricula
                (id, solicitacao_id, tipo, caminho, enviado_em)
            VALUES (:id, :sol_id, :tipo, :caminho, NOW())
        """), {"id": doc_id, "sol_id": sol_id, "tipo": tipo, "caminho": caminho})
        await db.commit()
        return {"id": doc_id, "tipo": tipo, "arquivo": nome_arquivo}


@router.get("/{sol_id}/documentos/{doc_id}/url")
async def url_documento(sol_id: str, doc_id: str):
    """Retorna o caminho do documento para visualização."""
    async with SessionLocal() as db:
        r = await db.execute(sa.text(
            "SELECT * FROM documentos_matricula WHERE id = :id AND solicitacao_id = :sol"
        ), {"id": doc_id, "sol": sol_id})
        doc = r.mappings().fetchone()
        if not doc:
            raise HTTPException(404, "Documento não encontrado")
        return {"caminho": doc["caminho"]}
