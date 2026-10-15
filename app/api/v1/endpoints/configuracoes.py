from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from app.core.config import settings

router = APIRouter(prefix="/configuracoes", tags=["Configuracoes"])

UPLOAD_DIR = os.path.join(settings.UPLOADS_DIR, "config")
os.makedirs(UPLOAD_DIR, exist_ok=True)

PUSH_TOKENS = []

class PushTokenRequest(BaseModel):
    token: str
    nome: Optional[str] = None

@router.post("/push-token")
async def salvar_push_token(dados: PushTokenRequest):
    if dados.token not in PUSH_TOKENS:
        PUSH_TOKENS.append(dados.token)
    return {"mensagem": "Token salvo", "total": len(PUSH_TOKENS)}

@router.get("/push-tokens")
async def listar_push_tokens():
    return {"tokens": PUSH_TOKENS, "total": len(PUSH_TOKENS)}

@router.post("/marca-dagua")
async def upload_marca_dagua(imagem: UploadFile = File(...)):
    ext = imagem.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "svg", "webp"]:
        return {"erro": "Formato invalido. Use JPG, PNG ou SVG."}
    caminho = os.path.join(UPLOAD_DIR, f"marca_dagua.{ext}")
    with open(caminho, "wb") as f:
        shutil.copyfileobj(imagem.file, f)
    return {"mensagem": "Marca dagua salva!", "url": f"/uploads/config/marca_dagua.{ext}"}

@router.get("/marca-dagua")
async def buscar_marca_dagua():
    for ext in ["png", "jpg", "jpeg", "svg", "webp"]:
        caminho = os.path.join(UPLOAD_DIR, f"marca_dagua.{ext}")
        if os.path.exists(caminho):
            return {"url": f"/uploads/config/marca_dagua.{ext}"}
    return {"url": None}
