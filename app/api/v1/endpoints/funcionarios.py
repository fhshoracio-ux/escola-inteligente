from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import uuid
import numpy as np
import cv2
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/funcionarios", tags=["Funcionarios"])

class FuncionarioCreate(BaseModel):
    escola_id: str
    nome: str
    cpf: Optional[str] = None
    cargo: str
    departamento: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None

class FuncionarioResponse(BaseModel):
    id: str
    escola_id: str
    nome: str
    cargo: str
    departamento: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    ativo: bool

@router.post("/", response_model=FuncionarioResponse)
async def criar_funcionario(func: FuncionarioCreate):
    async with SessionLocal() as db:
        escola = await db.execute(
            sa.text("SELECT id FROM escola WHERE id = :id AND ativo = 1"),
            {"id": func.escola_id}
        )
        if not escola.fetchone():
            raise HTTPException(status_code=404, detail="Escola nao encontrada")
        func_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO funcionario
                (id, escola_id, nome, cpf, cargo, departamento, telefone, email, ativo)
            VALUES
                (:id, :escola_id, :nome, :cpf, :cargo, :departamento, :telefone, :email, 1)
        """), {
            "id": func_id, "escola_id": func.escola_id, "nome": func.nome,
            "cpf": func.cpf, "cargo": func.cargo, "departamento": func.departamento,
            "telefone": func.telefone, "email": func.email,
        })
        await db.commit()
        return FuncionarioResponse(
            id=func_id, escola_id=func.escola_id, nome=func.nome,
            cargo=func.cargo, departamento=func.departamento,
            telefone=func.telefone, email=func.email, ativo=True,
        )

@router.get("/escola/{escola_id}", response_model=list[FuncionarioResponse])
async def listar_funcionarios(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, escola_id, nome, cargo, departamento, telefone, email, ativo
            FROM funcionario WHERE escola_id = :escola_id AND ativo = 1 ORDER BY nome
        """), {"escola_id": escola_id})
        return [FuncionarioResponse(**dict(r._mapping)) for r in result.fetchall()]

@router.post("/cadastrar-rosto/{funcionario_id}")
async def cadastrar_rosto_funcionario(funcionario_id: str, foto: UploadFile = File(...)):
    from app.facial.motor import get_face_app
    from app.facial.busca import cadastrar_rosto
    async with SessionLocal() as db:
        result = await db.execute(
            sa.text("SELECT id, nome FROM funcionario WHERE id = :id AND ativo = 1"),
            {"id": funcionario_id}
        )
        func = result.fetchone()
        if not func:
            raise HTTPException(status_code=404, detail="Funcionario nao encontrado")
    conteudo = await foto.read()
    arr = np.frombuffer(conteudo, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Imagem invalida")
    app = get_face_app()
    faces = app.get(frame)
    if not faces:
        raise HTTPException(status_code=400, detail="Nenhum rosto detectado")
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    point_id = cadastrar_rosto(funcionario_id, face.embedding, "rostos_funcionarios")
    async with SessionLocal() as db:
        await db.execute(sa.text("""
            INSERT INTO embedding_ref (id, entidade_id, tipo_entidade, qdrant_point_id)
            VALUES (:id, :entidade_id, :tipo_entidade, :qdrant_point_id)
        """), {"id": str(uuid.uuid4()), "entidade_id": funcionario_id,
               "tipo_entidade": "funcionario", "qdrant_point_id": point_id})
        await db.commit()
    return {"mensagem": f"Rosto de {func.nome} cadastrado", "qdrant_point_id": point_id}

@router.post("/ponto/{dispositivo_id}")
async def registrar_ponto(dispositivo_id: str, foto: UploadFile = File(...)):
    from app.facial.motor import get_face_app
    from app.facial.busca import buscar_rosto
    conteudo = await foto.read()
    arr = np.frombuffer(conteudo, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Imagem invalida")
    app = get_face_app()
    faces = app.get(frame)
    if not faces:
        return {"reconhecido": False, "mensagem": "Nenhum rosto detectado"}
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    match = buscar_rosto(face.embedding, "rostos_funcionarios")
    if not match:
        return {"reconhecido": False, "mensagem": "Funcionario nao reconhecido"}
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT f.id, f.nome, f.cargo FROM embedding_ref er
            JOIN funcionario f ON f.id = er.entidade_id
            WHERE er.qdrant_point_id = :point_id AND f.ativo = 1
        """), {"point_id": match["qdrant_point_id"]})
        func = result.fetchone()
    if not func:
        return {"reconhecido": False, "mensagem": "Funcionario nao encontrado"}
    async with SessionLocal() as db:
        ultimo = await db.execute(sa.text("""
            SELECT tipo FROM registro_ponto
            WHERE funcionario_id = :func_id AND DATE(ocorrido_em) = CURDATE()
            ORDER BY ocorrido_em DESC LIMIT 1
        """), {"func_id": func.id})
        ultimo = ultimo.fetchone()
    tipo = "saida" if ultimo and ultimo.tipo == "entrada" else "entrada"
    async with SessionLocal() as db:
        await db.execute(sa.text("""
            INSERT INTO registro_ponto (id, funcionario_id, dispositivo_id, tipo, confianca)
            VALUES (:id, :func_id, :disp_id, :tipo, :confianca)
        """), {"id": str(uuid.uuid4()), "func_id": func.id, "disp_id": dispositivo_id,
               "tipo": tipo, "confianca": match["confianca"]})
        await db.commit()
    horario = datetime.now().strftime("%H:%M")
    return {"reconhecido": True, "tipo": tipo, "funcionario": func.nome,
            "cargo": func.cargo, "confianca": round(match["confianca"], 4), "horario": horario}

@router.get("/ponto/hoje/escola/{escola_id}")
async def pontos_hoje(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT f.nome, f.cargo, rp.tipo, rp.confianca, rp.ocorrido_em
            FROM registro_ponto rp JOIN funcionario f ON f.id = rp.funcionario_id
            WHERE f.escola_id = :escola_id AND DATE(rp.ocorrido_em) = CURDATE()
            ORDER BY rp.ocorrido_em DESC
        """), {"escola_id": escola_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.get("/{funcionario_id}/ponto/mes")
async def relatorio_ponto_mes(funcionario_id: str, mes: Optional[int] = None, ano: Optional[int] = None):
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT DATE(ocorrido_em) as data,
                MIN(CASE WHEN tipo = 'entrada' THEN TIME(ocorrido_em) END) as entrada,
                MAX(CASE WHEN tipo = 'saida' THEN TIME(ocorrido_em) END) as saida
            FROM registro_ponto
            WHERE funcionario_id = :func_id AND MONTH(ocorrido_em) = :mes AND YEAR(ocorrido_em) = :ano
            GROUP BY DATE(ocorrido_em) ORDER BY data
        """), {"func_id": funcionario_id, "mes": mes, "ano": ano})
        return [dict(r._mapping) for r in result.fetchall()]
