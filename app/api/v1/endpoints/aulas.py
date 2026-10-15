from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import httpx
import sqlalchemy as sa
from app.db.database import SessionLocal
from app.core.logging_config import logger

router = APIRouter(prefix="/aulas", tags=["Aulas"])

EVOLUTION_URL = "http://localhost:8080/message/sendText/Escola-Principal"
EVOLUTION_KEY = "3zxy3t1vcvnxlphq2hvvoc"

class AulaCreate(BaseModel):
    turma_id: str
    professor_id: Optional[str] = None
    disciplina: str
    inicio: Optional[str] = None

class PresencaUpdate(BaseModel):
    status: str
    justificativa: Optional[str] = None

async def enviar_whatsapp(numero: str, mensagem: str):
    numero = numero.replace("+", "").replace("-", "").replace(" ", "")
    if not numero.startswith("55"):
        numero = "55" + numero
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                EVOLUTION_URL,
                headers={"Content-Type": "application/json", "apikey": EVOLUTION_KEY},
                json={"number": numero, "options": {"delay": 0}, "textMessage": {"text": mensagem}},
                timeout=10,
            )
            logger.info(f"[Presenca] WhatsApp enviado para {numero}")
    except Exception as e:
            logger.error(f"[Presenca] Erro ao enviar WhatsApp: {e}")

@router.post("/")
async def criar_aula(aula: AulaCreate):
    async with SessionLocal() as db:
        turma = await db.execute(
            sa.text("SELECT id, escola_id FROM turma WHERE id = :id AND ativo = 1"),
            {"id": aula.turma_id}
        )
        turma = turma.fetchone()
        if not turma:
            raise HTTPException(status_code=404, detail="Turma nao encontrada")

        aula_id = str(uuid.uuid4())
        inicio = aula.inicio or datetime.now().isoformat()

        await db.execute(sa.text("""
            INSERT INTO aula (id, turma_id, professor_id, disciplina, inicio, presenca_gerada)
            VALUES (:id, :turma_id, :professor_id, :disciplina, :inicio, 0)
        """), {
            "id": aula_id,
            "turma_id": aula.turma_id,
            "professor_id": aula.professor_id,
            "disciplina": aula.disciplina,
            "inicio": inicio,
        })

        alunos = await db.execute(sa.text(
            "SELECT id FROM aluno WHERE turma_id = :turma_id AND ativo = 1"
        ), {"turma_id": aula.turma_id})
        alunos = alunos.fetchall()

        for aluno in alunos:
            await db.execute(sa.text("""
                INSERT INTO presenca (id, aluno_id, turma_id, aula_id, data_aula, status)
                VALUES (:id, :aluno_id, :turma_id, :aula_id, :data_aula, 'ausente')
            """), {
                "id": str(uuid.uuid4()),
                "aluno_id": aluno.id,
                "turma_id": aula.turma_id,
                "aula_id": aula_id,
                "data_aula": datetime.now().date().isoformat(),
            })

        await db.commit()
        return {
            "id": aula_id,
            "turma_id": aula.turma_id,
            "disciplina": aula.disciplina,
            "inicio": inicio,
            "total_alunos": len(alunos),
            "mensagem": f"Aula criada com {len(alunos)} alunos na lista"
        }

@router.get("/{aula_id}/presenca")
async def listar_presenca(aula_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                p.id as presenca_id, p.aluno_id, p.status,
                p.justificativa, p.registrado_em,
                a.nome as aluno_nome, a.matricula,
                au.disciplina, au.inicio as aula_inicio,
                t.nome as turma
            FROM presenca p
            JOIN aluno a ON a.id = p.aluno_id
            JOIN aula au ON au.id = p.aula_id
            JOIN turma t ON t.id = p.turma_id
            WHERE p.aula_id = :aula_id
            ORDER BY a.nome
        """), {"aula_id": aula_id})
        rows = result.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="Aula nao encontrada")
        return [dict(r._mapping) for r in rows]

@router.put("/{aula_id}/presenca/{aluno_id}")
async def atualizar_presenca(aula_id: str, aluno_id: str, dados: PresencaUpdate):
    async with SessionLocal() as db:
        await db.execute(sa.text("""
            UPDATE presenca
            SET status = :status, justificativa = :justificativa, atualizado_em = NOW()
            WHERE aula_id = :aula_id AND aluno_id = :aluno_id
        """), {
            "status": dados.status,
            "justificativa": dados.justificativa,
            "aula_id": aula_id,
            "aluno_id": aluno_id,
        })
        await db.commit()

        # 🔔 Notificação de falta via WhatsApp
        if dados.status == "ausente":
            result = await db.execute(sa.text("""
                SELECT
                    a.nome as aluno_nome,
                    au.disciplina,
                    au.inicio as aula_inicio,
                    t.nome as turma_nome,
                    r.telefone_whatsapp as responsavel_telefone,
                    r.nome as responsavel_nome
                FROM presenca p
                JOIN aluno a ON a.id = p.aluno_id
                JOIN aula au ON au.id = p.aula_id
                JOIN turma t ON t.id = p.turma_id
                LEFT JOIN responsavel r ON r.id = (
                    SELECT id FROM responsavel
                    WHERE responsavel.aluno_id = :aluno_id
                    LIMIT 1
                )
                WHERE p.aula_id = :aula_id AND p.aluno_id = :aluno_id
            """), {"aula_id": aula_id, "aluno_id": aluno_id})
            info = result.fetchone()

            if info and info.responsavel_telefone:
                horario = datetime.now().strftime("%H:%M")
                data = datetime.now().strftime("%d/%m/%Y")

                mensagem = (
                    f"📚 *Aviso de Falta — Escola Inteligente*\n\n"
                    f"Olá, {info.responsavel_nome}!\n\n"
                    f"Informamos que *{info.aluno_nome}* foi registrado(a) como "
                    f"*ausente* na aula de *{info.disciplina}* hoje.\n\n"
                    f"📅 *Data:* {data}\n"
                    f"🕐 *Horário:* {horario}\n"
                    f"🏫 *Turma:* {info.turma_nome}\n"
                )
                if dados.justificativa:
                    mensagem += f"📝 *Justificativa:* {dados.justificativa}\n"

                mensagem += (
                    f"\nCaso tenha alguma dúvida, entre em contato com a escola.\n"
                    f"_Mensagem automática — Escola Inteligente_ 🏫"
                )

                await enviar_whatsapp(info.responsavel_telefone, mensagem)

        return {"mensagem": "Presenca atualizada"}

@router.get("/turma/{turma_id}/historico")
async def historico_presenca_turma(turma_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT
                au.id as aula_id, au.disciplina, au.inicio,
                COUNT(*) as total_alunos,
                SUM(p.status = 'presente') as presentes,
                SUM(p.status = 'ausente') as ausentes,
                SUM(p.status = 'atrasado') as atrasados
            FROM aula au
            JOIN presenca p ON p.aula_id = au.id
            WHERE au.turma_id = :turma_id
            GROUP BY au.id, au.disciplina, au.inicio
            ORDER BY au.inicio DESC LIMIT 30
        """), {"turma_id": turma_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.get("/turmas/escola/{escola_id}")
async def turmas_da_escola(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, nome, serie, turno, ano_letivo
            FROM turma
            WHERE escola_id = :escola_id AND ativo = 1
            ORDER BY serie, nome
        """), {"escola_id": escola_id})
        return [dict(r._mapping) for r in result.fetchall()]