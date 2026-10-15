import hashlib
import secrets
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "escola-facial-secret-2024"
ALGORITHM = "HS256"

def criar_hash_senha(senha: str) -> str:
    salt = secrets.token_hex(16)
    hash = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
    return f"{salt}${hash}"

def verificar_senha(senha: str, hash_guardado: str) -> bool:
    try:
        salt, hash = hash_guardado.split("$")
        hash_calculado = hashlib.sha256(f"{salt}{senha}".encode()).hexdigest()
        return hash_calculado == hash
    except Exception:
        return False

def criar_token(dados: dict) -> str:
    payload = dados.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=8)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)