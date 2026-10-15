from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import hashlib
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = "escola-facial-secret-2024"
ALGORITHM = "HS256"

def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        salt, hash_stored = senha_hash.split("$")
        hash_calc = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
        return hash_calc == hash_stored
    except Exception as e:
        return False

class LoginRequest(BaseModel):
    email: str
    senha: str

@router.post("/login")
async def login(dados: LoginRequest):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, email, senha_hash, perfil, escola_id, ativo
            FROM usuario
            WHERE email = :email AND ativo = 1
        """), {"email": dados.email})
        usuario = result.fetchone()

    if not usuario:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    if not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    # Buscar turmas vinculadas ao professor
    turmas_ids = []
    if usuario.perfil == "professor":
        async with SessionLocal() as db:
            result = await db.execute(sa.text("""
                SELECT DISTINCT turma_id
                FROM professor_disciplina_turma
                WHERE usuario_id = :usuario_id AND ativo = 1
            """), {"usuario_id": usuario.id})
            turmas_ids = [r.turma_id for r in result.fetchall()]

    # Buscar alunos vinculados ao responsavel
    alunos_ids = []
    if usuario.perfil == "responsavel":
        async with SessionLocal() as db:
            result = await db.execute(sa.text("""
                SELECT DISTINCT r.aluno_id
                FROM responsavel r
                JOIN usuario u ON u.email = CONCAT(r.telefone_whatsapp, '@escola.app')
                WHERE u.id = :usuario_id
            """), {"usuario_id": usuario.id})
            alunos_ids = [r.aluno_id for r in result.fetchall()]

    token = jwt.encode({
        "sub": usuario.id,
        "nome": usuario.nome,
        "perfil": usuario.perfil,
        "escola_id": usuario.escola_id,
        "turmas_ids": turmas_ids,
        "alunos_ids": alunos_ids,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "token": token,
        "nome": usuario.nome,
        "perfil": usuario.perfil,
        "escola_id": usuario.escola_id,
        "turmas_ids": turmas_ids,
        "alunos_ids": alunos_ids,
    }
