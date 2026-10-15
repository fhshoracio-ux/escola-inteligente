from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/boletim", tags=["Boletim"])

class DisciplinaCreate(BaseModel):
    turma_id: str
    escola_id: str
    nome: str
    carga_horaria: Optional[int] = 40

class NotaCreate(BaseModel):
    aluno_id: str
    disciplina_id: str
    bimestre: int
    valor: float
    tipo: Optional[str] = "prova"
    observacao: Optional[str] = None

@router.post("/disciplinas")
async def criar_disciplina(dados: DisciplinaCreate):
    async with SessionLocal() as db:
        disc_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO disciplina (id, turma_id, escola_id, nome, carga_horaria)
            VALUES (:id, :turma_id, :escola_id, :nome, :carga_horaria)
        """), {
            "id": disc_id,
            "turma_id": dados.turma_id,
            "escola_id": dados.escola_id,
            "nome": dados.nome,
            "carga_horaria": dados.carga_horaria,
        })
        await db.commit()
    return {"id": disc_id, "mensagem": "Disciplina criada!"}

@router.get("/disciplinas/turma/{turma_id}")
async def listar_disciplinas(turma_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, carga_horaria
            FROM disciplina
            WHERE turma_id = :turma_id AND ativo = 1
            ORDER BY nome
        """), {"turma_id": turma_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.post("/notas")
async def lancar_nota(dados: NotaCreate):
    if dados.valor < 0 or dados.valor > 10:
        raise HTTPException(status_code=400, detail="Nota deve ser entre 0 e 10")
    async with SessionLocal() as db:
        # Verificar se ja existe nota para este bimestre
        existe = await db.execute(sa.text("""
            SELECT id FROM nota
            WHERE aluno_id = :aluno_id AND disciplina_id = :disciplina_id
            AND bimestre = :bimestre AND tipo = :tipo
        """), {
            "aluno_id": dados.aluno_id,
            "disciplina_id": dados.disciplina_id,
            "bimestre": dados.bimestre,
            "tipo": dados.tipo,
        })
        row = existe.fetchone()
        if row:
            await db.execute(sa.text("""
                UPDATE nota SET valor = :valor, observacao = :observacao
                WHERE id = :id
            """), {"valor": dados.valor, "observacao": dados.observacao, "id": row.id})
        else:
            await db.execute(sa.text("""
                INSERT INTO nota (id, aluno_id, disciplina_id, bimestre, valor, tipo, observacao)
                VALUES (:id, :aluno_id, :disciplina_id, :bimestre, :valor, :tipo, :observacao)
            """), {
                "id": str(uuid.uuid4()),
                "aluno_id": dados.aluno_id,
                "disciplina_id": dados.disciplina_id,
                "bimestre": dados.bimestre,
                "valor": dados.valor,
                "tipo": dados.tipo,
                "observacao": dados.observacao,
            })
        await db.commit()
    return {"mensagem": "Nota lancada!"}

@router.get("/aluno/{aluno_id}")
async def boletim_aluno(aluno_id: str):
    async with SessionLocal() as db:
        # Dados do aluno
        result = await db.execute(sa.text("""
            SELECT a.id, a.nome, a.matricula, t.nome as turma, e.nome as escola
            FROM aluno a
            LEFT JOIN turma t ON t.id = a.turma_id
            LEFT JOIN escola e ON e.id = a.escola_id
            WHERE a.id = :aluno_id
        """), {"aluno_id": aluno_id})
        aluno = result.fetchone()
        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno nao encontrado")

        # Disciplinas e notas
        result = await db.execute(sa.text("""
            SELECT
                d.id as disciplina_id,
                d.nome as disciplina,
                n.bimestre,
                n.valor,
                n.tipo
            FROM disciplina d
            LEFT JOIN nota n ON n.disciplina_id = d.id AND n.aluno_id = :aluno_id
            WHERE d.turma_id = (SELECT turma_id FROM aluno WHERE id = :aluno_id)
            AND d.ativo = 1
            ORDER BY d.nome, n.bimestre
        """), {"aluno_id": aluno_id})
        notas = result.fetchall()

        # Frequencia
        result = await db.execute(sa.text("""
            SELECT
                COUNT(*) as total_aulas,
                SUM(CASE WHEN status = 'presente' THEN 1 ELSE 0 END) as presencas
            FROM presenca p
            JOIN aula au ON au.id = p.aula_id
            WHERE p.aluno_id = :aluno_id
        """), {"aluno_id": aluno_id})
        freq = result.fetchone()

    # Organizar notas por disciplina
    disciplinas = {}
    for n in notas:
        disc = n.disciplina
        if disc not in disciplinas:
            disciplinas[disc] = {"notas": {}, "media": 0, "situacao": ""}
        if n.bimestre:
            disciplinas[disc]["notas"][f"{n.bimestre}B"] = float(n.valor) if n.valor else None

    # Calcular medias
    for disc, dados in disciplinas.items():
        notas_vals = [v for v in dados["notas"].values() if v is not None]
        if notas_vals:
            media = sum(notas_vals) / len(notas_vals)
            dados["media"] = round(media, 1)
            if media >= 7:
                dados["situacao"] = "Aprovado"
            elif media >= 5:
                dados["situacao"] = "Recuperacao"
            else:
                dados["situacao"] = "Reprovado"

    # Calcular frequencia
    frequencia = 0
    if freq and freq.total_aulas and freq.total_aulas > 0:
        frequencia = round((freq.presencas / freq.total_aulas) * 100, 1)

    return {
        "aluno": {
            "id": aluno.id,
            "nome": aluno.nome,
            "matricula": aluno.matricula,
            "turma": aluno.turma,
            "escola": aluno.escola,
        },
        "disciplinas": [
            {
                "nome": disc,
                "notas": dados["notas"],
                "media": dados["media"],
                "situacao": dados["situacao"],
            }
            for disc, dados in disciplinas.items()
        ],
        "frequencia": frequencia,
        "total_aulas": freq.total_aulas if freq else 0,
        "presencas": freq.presencas if freq else 0,
    }
@router.get("/notas/turma/{turma_id}")
async def notas_por_turma(turma_id: str, disciplina_id: str, bimestre: int):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT n.aluno_id, n.valor
            FROM nota n
            WHERE n.disciplina_id = :disciplina_id
            AND n.bimestre = :bimestre
            AND n.aluno_id IN (
                SELECT id FROM aluno WHERE turma_id = :turma_id AND ativo = 1
            )
        """), {"disciplina_id": disciplina_id, "bimestre": bimestre, "turma_id": turma_id})
        return [dict(r._mapping) for r in result.fetchall()]
