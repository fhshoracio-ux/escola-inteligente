from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/turmas", tags=["Turmas"])

class TurmaCreate(BaseModel):
    escola_id: str
    professor_id: Optional[str] = None
    nome: str
    serie: str
    turno: str  # manha, tarde, noite, integral
    ano_letivo: int

class TurmaResponse(BaseModel):
    id: str
    escola_id: str
    professor_id: Optional[str]
    nome: str
    serie: str
    turno: str
    ano_letivo: int
    ativo: bool

@router.post("/", response_model=TurmaResponse)
async def criar_turma(turma: TurmaCreate):
    from app.db.database import SessionLocal
    import sqlalchemy as sa

    async with SessionLocal() as db:
        escola = await db.execute(
            sa.text("SELECT id FROM escola WHERE id = :id AND ativo = 1"),
            {"id": turma.escola_id}
        )
        if not escola.fetchone():
            raise HTTPException(status_code=404, detail="Escola não encontrada")

        turma_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO turma (id, escola_id, professor_id, nome, serie, turno, ano_letivo)
            VALUES (:id, :escola_id, :professor_id, :nome, :serie, :turno, :ano_letivo)
        """), {
            "id": turma_id,
            "escola_id": turma.escola_id,
            "professor_id": turma.professor_id,
            "nome": turma.nome,
            "serie": turma.serie,
            "turno": turma.turno,
            "ano_letivo": turma.ano_letivo,
        })
        await db.commit()
        return TurmaResponse(
            id=turma_id,
            escola_id=turma.escola_id,
            professor_id=turma.professor_id,
            nome=turma.nome,
            serie=turma.serie,
            turno=turma.turno,
            ano_letivo=turma.ano_letivo,
            ativo=True,
        )

@router.get("/escola/{escola_id}", response_model=list[TurmaResponse])
async def listar_turmas(escola_id: str):
    from app.db.database import SessionLocal
    import sqlalchemy as sa

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, escola_id, professor_id, nome, serie, turno, ano_letivo, ativo
            FROM turma
            WHERE escola_id = :escola_id AND ativo = 1
            ORDER BY serie, nome
        """), {"escola_id": escola_id})
        rows = result.fetchall()
        return [
            TurmaResponse(
                id=r.id, escola_id=r.escola_id, professor_id=r.professor_id,
                nome=r.nome, serie=r.serie, turno=r.turno,
                ano_letivo=r.ano_letivo, ativo=r.ativo
            )
            for r in rows
        ]

@router.put("/{turma_id}/aluno/{aluno_id}", tags=["Turmas"])
async def vincular_aluno_turma(turma_id: str, aluno_id: str):
    from app.db.database import SessionLocal
    import sqlalchemy as sa

    async with SessionLocal() as db:
        turma = await db.execute(
            sa.text("SELECT id FROM turma WHERE id = :id AND ativo = 1"),
            {"id": turma_id}
        )
        if not turma.fetchone():
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        await db.execute(sa.text("""
            UPDATE aluno SET turma_id = :turma_id WHERE id = :aluno_id
        """), {"turma_id": turma_id, "aluno_id": aluno_id})
        await db.commit()
        return {"mensagem": "Aluno vinculado à turma com sucesso"}