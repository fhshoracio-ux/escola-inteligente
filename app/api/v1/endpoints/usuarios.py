from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
import hashlib
import secrets
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

def criar_hash(senha: str) -> str:
    salt = secrets.token_hex(16)
    hash = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
    return f"{salt}${hash}"

def verificar_token(token: str):
    import jwt
    try:
        payload = jwt.decode(token, "escola-facial-secret-2024", algorithms=["HS256"])
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token invalido")

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: str
    escola_id: Optional[str] = None
    turma_id: Optional[str] = None

class UsuarioResponse(BaseModel):
    id: str
    nome: str
    email: str
    perfil: str
    escola_id: Optional[str]
    ativo: bool

@router.post("/", response_model=UsuarioResponse)
async def criar_usuario(usuario: UsuarioCreate):
    if usuario.perfil not in ["admin_rede", "diretor", "professor", "operador"]:
        raise HTTPException(status_code=400, detail="Perfil invalido")

    async with SessionLocal() as db:
        existente = await db.execute(
            sa.text("SELECT id FROM usuario WHERE email = :email"),
            {"email": usuario.email}
        )
        if existente.fetchone():
            raise HTTPException(status_code=400, detail="Email ja cadastrado")

        usuario_id = str(uuid.uuid4())
        senha_hash = criar_hash(usuario.senha)

        await db.execute(sa.text("""
            INSERT INTO usuario (id, nome, email, senha_hash, perfil, escola_id, ativo)
            VALUES (:id, :nome, :email, :senha_hash, :perfil, :escola_id, 1)
        """), {
            "id": usuario_id,
            "nome": usuario.nome,
            "email": usuario.email,
            "senha_hash": senha_hash,
            "perfil": usuario.perfil,
            "escola_id": usuario.escola_id,
        })
        await db.commit()

        return UsuarioResponse(
            id=usuario_id, nome=usuario.nome, email=usuario.email,
            perfil=usuario.perfil, escola_id=usuario.escola_id, ativo=True
        )

@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios():
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, email, perfil, escola_id, ativo
            FROM usuario WHERE ativo = 1 ORDER BY nome
        """))
        return [UsuarioResponse(**dict(r._mapping)) for r in result.fetchall()]

@router.delete("/{usuario_id}")
async def desativar_usuario(usuario_id: str):
    async with SessionLocal() as db:
        await db.execute(sa.text(
            "UPDATE usuario SET ativo = 0 WHERE id = :id"
        ), {"id": usuario_id})
        await db.commit()
        return {"mensagem": "Usuario desativado"}

@router.put("/{usuario_id}/senha")
async def alterar_senha(usuario_id: str, dados: dict):
    nova_senha = dados.get("senha")
    if not nova_senha:
        raise HTTPException(status_code=400, detail="Senha obrigatoria")
    async with SessionLocal() as db:
        await db.execute(sa.text(
            "UPDATE usuario SET senha_hash = :hash WHERE id = :id"
        ), {"hash": criar_hash(nova_senha), "id": usuario_id})
        await db.commit()
        return {"mensagem": "Senha alterada"}