from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import shutil

router = APIRouter(prefix="/escolas", tags=["Escolas"])

UPLOAD_DIR = r"C:\projetos\escola_facial\uploads\logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class EscolaCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None

class EscolaResponse(BaseModel):
    id: str
    nome: str
    cidade: Optional[str]
    estado: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    logo_url: Optional[str]
    ativo: bool

@router.post("/", response_model=EscolaResponse)
async def criar_escola(escola: EscolaCreate):
    from app.db.database import SessionLocal
    import sqlalchemy as sa
    async with SessionLocal() as db:
        escola_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO escola (id, nome, cnpj, cidade, estado, telefone, email)
            VALUES (:id, :nome, :cnpj, :cidade, :estado, :telefone, :email)
        """), {
            "id": escola_id, "nome": escola.nome, "cnpj": escola.cnpj,
            "cidade": escola.cidade, "estado": escola.estado,
            "telefone": escola.telefone, "email": escola.email,
        })
        await db.commit()
        return EscolaResponse(
            id=escola_id, nome=escola.nome, cidade=escola.cidade,
            estado=escola.estado, telefone=escola.telefone,
            email=escola.email, logo_url=None, ativo=True,
        )

@router.get("/", response_model=list[EscolaResponse])
async def listar_escolas():
    from app.db.database import SessionLocal
    import sqlalchemy as sa
    async with SessionLocal() as db:
        result = await db.execute(sa.text(
            "SELECT id, nome, cidade, estado, telefone, email, logo_url, ativo FROM escola WHERE ativo = 1"
        ))
        rows = result.fetchall()
        return [
            EscolaResponse(
                id=r.id, nome=r.nome, cidade=r.cidade, estado=r.estado,
                telefone=r.telefone, email=r.email,
                logo_url=r.logo_url, ativo=r.ativo
            )
            for r in rows
        ]

@router.post("/{escola_id}/logo")
async def upload_logo(escola_id: str, logo: UploadFile = File(...)):
    from app.db.database import SessionLocal
    import sqlalchemy as sa
    async with SessionLocal() as db:
        result = await db.execute(
            sa.text("SELECT id FROM escola WHERE id = :id AND ativo = 1"),
            {"id": escola_id}
        )
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Escola nao encontrada")
    ext = logo.filename.split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "svg", "webp"]:
        raise HTTPException(status_code=400, detail="Formato invalido. Use JPG, PNG ou SVG.")
    nome_arquivo = f"{escola_id}.{ext}"
    caminho = os.path.join(UPLOAD_DIR, nome_arquivo)
    with open(caminho, "wb") as f:
        shutil.copyfileobj(logo.file, f)
    logo_url = f"/uploads/logos/{nome_arquivo}"
    async with SessionLocal() as db:
        await db.execute(sa.text(
            "UPDATE escola SET logo_url = :logo_url WHERE id = :id"
        ), {"logo_url": logo_url, "id": escola_id})
        await db.commit()
    return {"mensagem": "Logo enviada com sucesso", "logo_url": logo_url}

@router.get("/{escola_id}", response_model=EscolaResponse)
async def buscar_escola(escola_id: str):
    from app.db.database import SessionLocal
    import sqlalchemy as sa
    async with SessionLocal() as db:
        result = await db.execute(sa.text(
            "SELECT id, nome, cidade, estado, telefone, email, logo_url, ativo FROM escola WHERE id = :id"
        ), {"id": escola_id})
        r = result.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Escola nao encontrada")
        return EscolaResponse(
            id=r.id, nome=r.nome, cidade=r.cidade, estado=r.estado,
            telefone=r.telefone, email=r.email, logo_url=r.logo_url, ativo=r.ativo
        )
