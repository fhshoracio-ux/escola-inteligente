from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import httpx
import sqlalchemy as sa
from app.db.database import SessionLocal
from app.core.logging_config import logger

router = APIRouter(prefix="/alunos", tags=["Alunos"])

HIKVISION_USUARIO = "admin"
HIKVISION_SENHA = "F11h06s1991*"

TERMINAIS = [
    "172.18.10.4", "172.18.10.5", "172.18.10.6",
    "172.18.10.7", "172.18.10.8", "172.18.10.9",
    "172.18.10.10", "172.18.10.11", "172.18.10.13",
]

class AlunoCreate(BaseModel):
    escola_id: str
    turma_id: Optional[str] = None
    nome: str
    matricula: Optional[str] = None
    data_nascimento: Optional[str] = None

class AlunoUpdate(BaseModel):
    nome: Optional[str] = None
    matricula: Optional[str] = None
    turma_id: Optional[str] = None
    data_nascimento: Optional[str] = None

class AlunoResponse(BaseModel):
    id: str
    escola_id: str
    turma_id: Optional[str]
    nome: str
    matricula: str
    ativo: bool

async def gerar_matricula(escola_id: str, db) -> str:
    ano = datetime.now().year
    result = await db.execute(sa.text("""
        SELECT COUNT(*) as total FROM escola WHERE ativo = 1
        AND criado_em <= (SELECT criado_em FROM escola WHERE id = :id)
    """), {"id": escola_id})
    row = result.fetchone()
    cod_escola = str(row.total).zfill(3)
    result = await db.execute(sa.text("""
        SELECT COUNT(*) as total FROM aluno
        WHERE escola_id = :escola_id AND YEAR(criado_em) = :ano
    """), {"escola_id": escola_id, "ano": ano})
    row = result.fetchone()
    sequencial = str(row.total + 1).zfill(3)
    return f"{ano}{cod_escola}{sequencial}"

async def cadastrar_no_hikvision(matricula: str, nome: str):
    url = f"https://172.18.10.10/ISAPI/AccessControl/UserInfo/Record?format=json"
    payload = {
        "UserInfo": {
            "employeeNo": matricula,
            "name": nome[:32],
            "userType": "normal",
            "Valid": {
                "enable": True,
                "beginTime": "2026-01-01T00:00:00",
                "endTime": "2030-12-31T23:59:59"
            },
            "doorRight": "1",
            "RightPlan": [{"doorNo": 1, "planTemplateNo": "1"}]
        }
    }
    try:
        async with httpx.AsyncClient(verify=False, auth=httpx.DigestAuth(HIKVISION_USUARIO, HIKVISION_SENHA), timeout=10) as client:
            res = await client.post(url, json=payload)
            dados = res.json()
            if dados.get("statusCode") == 1:
                logger.info(f"[Hikvision] Aluno {nome} cadastrado no terminal!")
            else:
                logger.error(f"[Hikvision] Erro: {dados}")
    except Exception as e:
        logger.error(f"[Hikvision] Erro ao cadastrar: {e}")

async def remover_do_hikvision(matricula: str):
    for ip in TERMINAIS:
        url = f"https://{ip}/ISAPI/AccessControl/UserInfo/Delete?format=json"
        payload = {"UserInfoDelCond": {"EmployeeNoList": [{"employeeNo": matricula}]}}
        try:
            async with httpx.AsyncClient(verify=False, auth=httpx.DigestAuth(HIKVISION_USUARIO, HIKVISION_SENHA), timeout=5) as client:
                res = await client.put(url, json=payload)
                logger.info(f"[Hikvision] {ip} — Remocao {matricula}: {res.status_code}")
        except Exception as e:
            logger.error(f"[Hikvision] {ip} — Erro: {e}")

@router.post("/", response_model=AlunoResponse)
async def criar_aluno(aluno: AlunoCreate):
    async with SessionLocal() as db:
        escola = await db.execute(
            sa.text("SELECT id FROM escola WHERE id = :id AND ativo = 1"),
            {"id": aluno.escola_id}
        )
        if not escola.fetchone():
            raise HTTPException(status_code=404, detail="Escola nao encontrada")

        matricula = aluno.matricula
        if not matricula:
            matricula = await gerar_matricula(aluno.escola_id, db)

        existe = await db.execute(
            sa.text("SELECT id FROM aluno WHERE matricula = :m AND escola_id = :e"),
            {"m": matricula, "e": aluno.escola_id}
        )
        if existe.fetchone():
            matricula = await gerar_matricula(aluno.escola_id, db)

        aluno_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO aluno (id, escola_id, turma_id, nome, matricula, data_nascimento)
            VALUES (:id, :escola_id, :turma_id, :nome, :matricula, :data_nascimento)
        """), {
            "id": aluno_id,
            "escola_id": aluno.escola_id,
            "turma_id": aluno.turma_id,
            "nome": aluno.nome,
            "matricula": matricula,
            "data_nascimento": aluno.data_nascimento,
        })
        await db.commit()

    await cadastrar_no_hikvision(matricula, aluno.nome)

    return AlunoResponse(
        id=aluno_id, escola_id=aluno.escola_id, turma_id=aluno.turma_id,
        nome=aluno.nome, matricula=matricula, ativo=True,
    )

@router.get("/escola/{escola_id}", response_model=list[AlunoResponse])
async def listar_alunos(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, escola_id, turma_id, nome, matricula, ativo
            FROM aluno WHERE escola_id = :escola_id AND ativo = 1
            ORDER BY nome
        """), {"escola_id": escola_id})
        return [AlunoResponse(**dict(r._mapping)) for r in result.fetchall()]

@router.get("/matricula/proxima/{escola_id}")
async def proxima_matricula(escola_id: str):
    async with SessionLocal() as db:
        matricula = await gerar_matricula(escola_id, db)
        return {"matricula": matricula}
@router.get("/turma/{turma_id}", response_model=list[AlunoResponse])
async def listar_alunos_turma(turma_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, escola_id, turma_id, nome, matricula, ativo
            FROM aluno WHERE turma_id = :turma_id AND ativo = 1
            ORDER BY nome
        """), {"turma_id": turma_id})
        return [AlunoResponse(**dict(r._mapping)) for r in result.fetchall()]

@router.get("/{aluno_id}", response_model=AlunoResponse)
async def buscar_aluno(aluno_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, escola_id, turma_id, nome, matricula, ativo
            FROM aluno WHERE id = :id
        """), {"id": aluno_id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Aluno nao encontrado")
        return AlunoResponse(**dict(row._mapping))

@router.put("/{aluno_id}/turma")
async def atualizar_turma_aluno(aluno_id: str, dados: dict):
    turma_id = dados.get("turma_id") or None
    async with SessionLocal() as db:
        await db.execute(sa.text(
            "UPDATE aluno SET turma_id = :turma_id WHERE id = :id"
        ), {"turma_id": turma_id, "id": aluno_id})
        await db.commit()
    return {"mensagem": "Turma atualizada"}

@router.put("/{aluno_id}")
async def atualizar_aluno(aluno_id: str, dados: AlunoUpdate):
    async with SessionLocal() as db:
        await db.execute(sa.text("""
            UPDATE aluno SET
                nome = COALESCE(:nome, nome),
                matricula = COALESCE(:matricula, matricula),
                turma_id = :turma_id,
                data_nascimento = COALESCE(:data_nascimento, data_nascimento)
            WHERE id = :id
        """), {
            "nome": dados.nome,
            "matricula": dados.matricula,
            "turma_id": dados.turma_id or None,
            "data_nascimento": dados.data_nascimento or None,
            "id": aluno_id,
        })
        await db.commit()
    return {"mensagem": "Aluno atualizado!"}

@router.delete("/{aluno_id}")
async def excluir_aluno(aluno_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text(
            "SELECT matricula, nome FROM aluno WHERE id = :id"
        ), {"id": aluno_id})
        aluno = result.fetchone()
        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno nao encontrado")

        await db.execute(sa.text(
            "UPDATE aluno SET ativo = 0 WHERE id = :id"
        ), {"id": aluno_id})
        await db.commit()

    await remover_do_hikvision(aluno.matricula)
    logger.info(f"[Aluno] {aluno.nome} removido do sistema e dos terminais")

    return {"mensagem": "Aluno excluido e removido dos terminais!"}
