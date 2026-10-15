import asyncio
import sqlalchemy as sa
from app.db.database import SessionLocal
from app.core.security import verificar_senha
from app.core.logging_config import logger

async def testar():
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, email, senha_hash, perfil, ativo
            FROM usuario
            WHERE email = 'admin@rede.edu.br' AND ativo = 1
        """))
        usuario = result.fetchone()
        if usuario:
            logger.info("Usuario encontrado: %s", usuario.nome)
            ok = verificar_senha('Admin@2024', usuario.senha_hash)
            logger.info("Senha correta: %s", ok)
        else:
            logger.warning("Usuario nao encontrado!")

asyncio.run(testar())