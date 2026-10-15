from fastapi import APIRouter
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/acessos", tags=["Acessos"])

@router.get("/hoje")
async def acessos_hoje():
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT ra.id, ra.aluno_id, ra.confianca, ra.ocorrido_em, ra.tipo_evento,
                   a.nome as aluno_nome, a.turma_id, t.nome as turma, e.nome as escola
            FROM registro_acesso ra
            JOIN aluno a ON a.id = ra.aluno_id
            LEFT JOIN turma t ON t.id = a.turma_id
            JOIN escola e ON e.id = ra.escola_id
            WHERE DATE(ra.ocorrido_em) = CURDATE()
            ORDER BY ra.ocorrido_em DESC LIMIT 100
        """))
        return [dict(r._mapping) for r in result.fetchall()]

@router.get("/data/{data}")
async def acessos_por_data(data: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT ra.id, ra.aluno_id, ra.confianca, ra.ocorrido_em, ra.tipo_evento,
                   a.nome as aluno_nome, a.turma_id, t.nome as turma, e.nome as escola
            FROM registro_acesso ra
            JOIN aluno a ON a.id = ra.aluno_id
            LEFT JOIN turma t ON t.id = a.turma_id
            JOIN escola e ON e.id = ra.escola_id
            WHERE DATE(ra.ocorrido_em) = :data
            ORDER BY ra.ocorrido_em DESC
        """), {"data": data})
        return [dict(r._mapping) for r in result.fetchall()]

@router.get("/grafico/{escola_id}")
async def acessos_grafico(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                HOUR(ra.ocorrido_em) as hora,
                COUNT(*) as total
            FROM registro_acesso ra
            WHERE ra.escola_id = :escola_id
              AND DATE(ra.ocorrido_em) = CURDATE()
              AND ra.tipo_evento = 'entrada'
            GROUP BY HOUR(ra.ocorrido_em)
            ORDER BY hora
        """), {"escola_id": escola_id})
        rows = result.fetchall()
        return [{"hora": f"{r.hora:02d}:00", "total": r.total} for r in rows]