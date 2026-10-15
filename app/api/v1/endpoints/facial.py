from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import numpy as np
import cv2
import uuid
import httpx
import asyncio
from app.core.logging_config import logger

router = APIRouter(prefix="/facial", tags=["Facial"])

HIKVISION_USUARIO = "admin"
HIKVISION_SENHA   = "F11h06s1991*"

TERMINAIS_ENTRADA_SAIDA = [
    "172.18.10.4",
    "172.18.10.5",
    "172.18.10.6",
    "172.18.10.13",
]

TERMINAL_POR_TURMA = {
    "6 Ano A": "172.18.10.8",
    "6 Ano B": "172.18.10.8",
    "7 Ano A": "172.18.10.7",
    "7 Ano B": "172.18.10.7",
    "8 Ano A": "172.18.10.11",
    "8 Ano B": "172.18.10.11",
    "9 Ano A": "172.18.10.10",
    "9 Ano B": "172.18.10.10",
    "AEE":     "172.18.10.9",
    "Especial":"172.18.10.9",
}
class CadastroRostoResponse(BaseModel):
    mensagem: str
    aluno_id: str
    qdrant_point_id: str
    confianca_deteccao: float

async def cadastrar_funcionario_terminal(ip: str, matricula: str, nome: str):
    """Cadastra o aluno como funcionario no terminal Hikvision"""
    url = f"https://{ip}/ISAPI/AccessControl/UserInfo/Record?format=json"
    payload = {
        "UserInfo": {
            "employeeNo": matricula,
            "name": nome,
            "userType": "normal",
            "Valid": {
                "enable": True,
                "beginTime": "2026-01-01T00:00:00",
                "endTime": "2030-12-31T23:59:59",
                "timeType": "local"
            },
            "doorRight": "1",
            "RightPlan": [{"doorNo": 1, "planTemplateNo": "1"}]
        }
    }
    try:
        async with httpx.AsyncClient(
            verify=False,
            auth=httpx.DigestAuth(HIKVISION_USUARIO, HIKVISION_SENHA),
            timeout=10
        ) as client:
            res = await client.post(url, json=payload)
            dados = res.json()
            if dados.get("statusCode") in [1, 0]:
                logger.info(f"[Hikvision] {ip} — Aluno {matricula} cadastrado!")
            else:
                logger.warning(f"[Hikvision] {ip} — Aviso ao cadastrar aluno: {dados}")
    except Exception as e:
        logger.error(f"[Hikvision] {ip} — Erro ao cadastrar aluno: {e}")

async def cadastrar_rosto_terminal(ip: str, matricula: str, foto_bytes: bytes):
    """Envia o rosto para o terminal Hikvision"""
    url = f"https://{ip}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json"
    try:
        async with httpx.AsyncClient(
            verify=False,
            auth=httpx.DigestAuth(HIKVISION_USUARIO, HIKVISION_SENHA),
            timeout=15
        ) as client:
            files = {
                "FaceDataRecord": (
                    None,
                    f'{{"faceLibType":"blackFD","FDID":"1","FPID":"{matricula}"}}',
                    "application/json"
                ),
                "img": ("foto.jpg", foto_bytes, "image/jpeg"),
            }
            res = await client.post(url, files=files)
            dados = res.json()
            if dados.get("statusCode") == 1:
                logger.info(f"[Hikvision] {ip} — Rosto cadastrado para {matricula}!")
            else:
                logger.error(f"[Hikvision] {ip} — Erro rosto: {dados}")
    except Exception as e:
        logger.error(f"[Hikvision] {ip} — Erro: {e}")

async def cadastrar_rosto_terminais_aluno(matricula: str, nome: str, turma_nome: str, foto_bytes: bytes):
    terminais = list(TERMINAIS_ENTRADA_SAIDA)

    terminal_sala = TERMINAL_POR_TURMA.get(turma_nome)
    if terminal_sala and terminal_sala not in terminais:
        terminais.append(terminal_sala)

    logger.info(f"[Hikvision] Cadastrando em {len(terminais)} terminais: {terminais}")

    # Primeiro cadastra o aluno em todos os terminais
    await asyncio.gather(*[
        cadastrar_funcionario_terminal(ip, matricula, nome)
        for ip in terminais
    ])

    # Aguarda um momento para o terminal processar
    await asyncio.sleep(1)

    # Depois envia o rosto
    await asyncio.gather(*[
        cadastrar_rosto_terminal(ip, matricula, foto_bytes)
        for ip in terminais
    ])

@router.post("/cadastrar-rosto/{aluno_id}", response_model=CadastroRostoResponse)
async def cadastrar_rosto(aluno_id: str, foto: UploadFile = File(...)):
    from app.db.database import SessionLocal
    from app.facial.busca import cadastrar_rosto as salvar_no_qdrant
    import sqlalchemy as sa

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT a.id, a.nome, a.matricula, t.nome as turma_nome
            FROM aluno a
            LEFT JOIN turma t ON t.id = a.turma_id
            WHERE a.id = :id AND a.ativo = 1
        """), {"id": aluno_id})
        aluno = result.fetchone()
        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno nao encontrado")

    conteudo = await foto.read()
    arr = np.frombuffer(conteudo, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Imagem invalida ou corrompida")

    resultado = extrair_embedding_com_confianca(frame)
    if resultado is None:
        raise HTTPException(status_code=400, detail="Nenhum rosto detectado. Tente uma foto mais clara e centralizada.")

    embedding, confianca = resultado

    point_id = salvar_no_qdrant(aluno_id, embedding, "rostos_alunos")

    async with SessionLocal() as db:
        # Verificar se ja existe referencia
        existe = await db.execute(sa.text(
            "SELECT id FROM embedding_ref WHERE entidade_id = :id"
        ), {"id": aluno_id})
        if existe.fetchone():
            await db.execute(sa.text(
                "UPDATE embedding_ref SET qdrant_point_id = :point_id WHERE entidade_id = :id"
            ), {"point_id": point_id, "id": aluno_id})
        else:
            ref_id = str(uuid.uuid4())
            await db.execute(sa.text("""
                INSERT INTO embedding_ref (id, entidade_id, tipo_entidade, qdrant_point_id)
                VALUES (:id, :entidade_id, :tipo_entidade, :qdrant_point_id)
            """), {
                "id": ref_id,
                "entidade_id": aluno_id,
                "tipo_entidade": "aluno",
                "qdrant_point_id": point_id,
            })
        await db.commit()

    turma_nome = aluno.turma_nome or ""
    await cadastrar_rosto_terminais_aluno(aluno.matricula, aluno.nome, turma_nome, conteudo)

    return CadastroRostoResponse(
        mensagem=f"Rosto de {aluno.nome} cadastrado com sucesso!",
        aluno_id=aluno_id,
        qdrant_point_id=point_id,
        confianca_deteccao=round(confianca, 4),
    )

@router.post("/reconhecer", tags=["Facial"])
async def reconhecer_rosto(foto: UploadFile = File(...)):
    from app.db.database import SessionLocal
    from app.facial.busca import buscar_rosto
    import sqlalchemy as sa

    conteudo = await foto.read()
    arr = np.frombuffer(conteudo, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Imagem invalida")

    resultado = extrair_embedding_com_confianca(frame)
    if resultado is None:
        raise HTTPException(status_code=400, detail="Nenhum rosto detectado")

    embedding, _ = resultado
    match = buscar_rosto(embedding, "rostos_alunos")
    if not match:
        return {"reconhecido": False, "mensagem": "Rosto nao encontrado"}

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT a.id, a.nome, a.matricula, t.nome as turma
            FROM embedding_ref er
            JOIN aluno a ON a.id = er.entidade_id
            LEFT JOIN turma t ON t.id = a.turma_id
            WHERE er.qdrant_point_id = :point_id
        """), {"point_id": match["qdrant_point_id"]})
        aluno = result.fetchone()

    if not aluno:
        return {"reconhecido": False, "mensagem": "Referencia nao encontrada"}

    return {
        "reconhecido": True,
        "confianca": match["confianca"],
        "aluno": {"id": aluno.id, "nome": aluno.nome, "matricula": aluno.matricula, "turma": aluno.turma}
    }

def extrair_embedding_com_confianca(frame):
    from app.facial.motor import get_face_app
    app = get_face_app()
    faces = app.get(frame)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    confianca = float(face.det_score) if hasattr(face, 'det_score') else 1.0
    return face.embedding, confianca