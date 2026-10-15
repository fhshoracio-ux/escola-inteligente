from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import hashlib
import secrets
from app.core.logging_config import logger

router = APIRouter(prefix="/responsaveis", tags=["Responsaveis"])

def criar_hash(senha: str) -> str:
    salt = secrets.token_hex(16)
    hash = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
    return f"{salt}${hash}"

class ResponsavelCreate(BaseModel):
    aluno_id: str
    nome: str
    telefone_whatsapp: str
    email: Optional[str] = None
    parentesco: str = "responsavel_legal"

class ResponsavelResponse(BaseModel):
    id: str
    aluno_id: str
    nome: str
    telefone_whatsapp: str
    email: Optional[str]
    parentesco: str
    notificacoes_ativas: bool

@router.post("/", response_model=ResponsavelResponse)
async def criar_responsavel(resp: ResponsavelCreate):
    from app.db.database import SessionLocal
    import sqlalchemy as sa

    async with SessionLocal() as db:
        aluno = await db.execute(
            sa.text("SELECT id, escola_id FROM aluno WHERE id = :id AND ativo = 1"),
            {"id": resp.aluno_id}
        )
        aluno_row = aluno.fetchone()
        if not aluno_row:
            raise HTTPException(status_code=404, detail="Aluno nao encontrado")

        resp_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO responsavel (id, aluno_id, nome, telefone_whatsapp, email, parentesco)
            VALUES (:id, :aluno_id, :nome, :telefone_whatsapp, :email, :parentesco)
        """), {
            "id": resp_id,
            "aluno_id": resp.aluno_id,
            "nome": resp.nome,
            "telefone_whatsapp": resp.telefone_whatsapp,
            "email": resp.email,
            "parentesco": resp.parentesco,
        })

        # Criar login automatico para o app
        # Email: numero@escola.app  Senha: 6 ultimos digitos do telefone
        numero = resp.telefone_whatsapp.replace("+", "").replace("-", "").replace(" ", "")
        email_app = f"{numero}@escola.app"
        senha_padrao = numero[-6:]
        senha_hash = criar_hash(senha_padrao)

        # Verificar se ja tem usuario com esse email
        existe = await db.execute(
            sa.text("SELECT id FROM usuario WHERE email = :email"),
            {"email": email_app}
        )
        if not existe.fetchone():
                await db.execute(sa.text("""
                    INSERT INTO usuario (id, escola_id, nome, email, senha_hash, perfil, ativo)
                    VALUES (:id, :escola_id, :nome, :email, :senha_hash, 'responsavel', 1)
                """), {
                    "id": str(uuid.uuid4()),
                    "escola_id": aluno_row.escola_id,
                    "nome": resp.nome,
                    "email": email_app,
                    "senha_hash": senha_hash,
                })
                logger.info(f"[Responsavel] Login criado: {email_app} / senha: {senha_padrao}")

        await db.commit()

    return ResponsavelResponse(
        id=resp_id,
        aluno_id=resp.aluno_id,
        nome=resp.nome,
        telefone_whatsapp=resp.telefone_whatsapp,
        email=resp.email,
        parentesco=resp.parentesco,
        notificacoes_ativas=True,
    )

@router.get("/aluno/{aluno_id}", response_model=list[ResponsavelResponse])
async def listar_responsaveis(aluno_id: str):
    from app.db.database import SessionLocal
    import sqlalchemy as sa

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, aluno_id, nome, telefone_whatsapp, email, parentesco, notificacoes_ativas
            FROM responsavel WHERE aluno_id = :aluno_id
        """), {"aluno_id": aluno_id})
        rows = result.fetchall()
        return [
            ResponsavelResponse(
                id=r.id, aluno_id=r.aluno_id, nome=r.nome,
                telefone_whatsapp=r.telefone_whatsapp, email=r.email,
                parentesco=r.parentesco, notificacoes_ativas=r.notificacoes_ativas
            )
            for r in rows
        ]
