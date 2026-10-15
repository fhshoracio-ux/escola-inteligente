from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
import hashlib
import secrets
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/professores", tags=["Professores"])

def criar_hash(senha: str) -> str:
    salt = secrets.token_hex(16)
    hash = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
    return f"{salt}${hash}"

class ProfessorCreate(BaseModel):
    nome: str
    email: str
    senha: str
    escola_id: str

class VinculoCreate(BaseModel):
    usuario_id: str
    disciplina_id: str
    turma_id: str
    escola_id: str

@router.post("/")
async def criar_professor(dados: ProfessorCreate):
    async with SessionLocal() as db:
        existe = await db.execute(
            sa.text("SELECT id FROM usuario WHERE email = :email"),
            {"email": dados.email}
        )
        if existe.fetchone():
            raise HTTPException(status_code=400, detail="Email ja cadastrado")

        usuario_id = str(uuid.uuid4())
        senha_hash = criar_hash(dados.senha)

        await db.execute(sa.text("""
            INSERT INTO usuario (id, nome, email, senha_hash, perfil, escola_id, ativo)
            VALUES (:id, :nome, :email, :senha_hash, 'professor', :escola_id, 1)
        """), {
            "id": usuario_id,
            "nome": dados.nome,
            "email": dados.email,
            "senha_hash": senha_hash,
            "escola_id": dados.escola_id,
        })
        await db.commit()

    return {"id": usuario_id, "mensagem": "Professor cadastrado!"}

@router.get("/escola/{escola_id}")
async def listar_professores(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, email, ativo
            FROM usuario
            WHERE escola_id = :escola_id AND perfil = 'professor' AND ativo = 1
            ORDER BY nome
        """), {"escola_id": escola_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.post("/vincular")
async def vincular_professor(dados: VinculoCreate):
    async with SessionLocal() as db:
        try:
            await db.execute(sa.text("""
                INSERT INTO professor_disciplina_turma
                    (id, usuario_id, disciplina_id, turma_id, escola_id)
                VALUES (:id, :usuario_id, :disciplina_id, :turma_id, :escola_id)
            """), {
                "id": str(uuid.uuid4()),
                "usuario_id": dados.usuario_id,
                "disciplina_id": dados.disciplina_id,
                "turma_id": dados.turma_id,
                "escola_id": dados.escola_id,
            })
            await db.commit()
            return {"mensagem": "Professor vinculado!"}
        except Exception as e:
            if "unico_vinculo" in str(e):
                raise HTTPException(status_code=400, detail="Professor ja vinculado a esta disciplina/turma")
            raise

@router.get("/plano/{escola_id}")
async def plano_aula(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                pdt.id,
                u.nome as professor,
                u.id as professor_id,
                d.nome as disciplina,
                d.id as disciplina_id,
                t.nome as turma,
                t.id as turma_id,
                t.turno,
                t.serie
            FROM professor_disciplina_turma pdt
            JOIN usuario u ON u.id = pdt.usuario_id
            JOIN disciplina d ON d.id = pdt.disciplina_id
            JOIN turma t ON t.id = pdt.turma_id
            WHERE pdt.escola_id = :escola_id AND pdt.ativo = 1
            ORDER BY t.serie, t.turno, d.nome
        """), {"escola_id": escola_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.delete("/vincular/{vinculo_id}")
async def remover_vinculo(vinculo_id: str):
    async with SessionLocal() as db:
        await db.execute(sa.text(
            "UPDATE professor_disciplina_turma SET ativo = 0 WHERE id = :id"
        ), {"id": vinculo_id})
        await db.commit()
    return {"mensagem": "Vinculo removido"}
