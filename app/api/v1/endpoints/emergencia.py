from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import httpx
import sqlalchemy as sa
from app.db.database import SessionLocal

router = APIRouter(prefix="/emergencia", tags=["Emergencia"])

class AcionarEmergencia(BaseModel):
    escola_id: str
    local: str
    descricao: Optional[str] = "Emergencia acionada"
    acionado_por: Optional[str] = "Sistema"
    numero_guarda: Optional[str] = None

class ConfigGuarda(BaseModel):
    numero_guarda: str
    numero_diretor: Optional[str] = None

async def enviar_whatsapp(numero: str, mensagem: str):
    numero = numero.replace("+", "").replace("-", "").replace(" ", "")
    if not numero.startswith("55"):
        numero = "55" + numero
    partes = numero[2:]
    if len(partes) == 10:
        partes = partes[:2] + "9" + partes[2:]
        numero = "55" + partes
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://localhost:8080/message/sendText/Escola-Principal",
            headers={"Content-Type": "application/json", "apikey": "3zxy3t1vcvnxlphq2hvvoc"},
            json={"number": numero, "options": {"delay": 0}, "textMessage": {"text": mensagem}},
            timeout=10,
        )

@router.post("/acionar")
async def acionar_emergencia(dados: AcionarEmergencia):
    agora = datetime.now()
    horario = agora.strftime("%H:%M")
    data = agora.strftime("%d/%m/%Y")

    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT ec.numero_guarda, ec.numero_diretor, e.nome
            FROM escola e
            LEFT JOIN escola_config ec ON ec.escola_id = e.id
            WHERE e.id = :escola_id
        """), {"escola_id": dados.escola_id})
        config = result.fetchone()

        registro_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO emergencia_log
                (id, escola_id, local, descricao, acionado_por, acionado_em)
            VALUES
                (:id, :escola_id, :local, :descricao, :acionado_por, NOW())
        """), {
            "id": registro_id,
            "escola_id": dados.escola_id,
            "local": dados.local,
            "descricao": dados.descricao,
            "acionado_por": dados.acionado_por,
        })
        await db.commit()

    mensagem = (
        f"🚨 *EMERGÊNCIA ESCOLAR* 🚨\n\n"
        f"📍 *Local:* {dados.local}\n"
        f"🏫 *Escola:* {config.nome if config else 'Escola'}\n"
        f"🕐 *Horário:* {horario} de {data}\n"
        f"👤 *Acionado por:* {dados.acionado_por}\n\n"
        f"⚠️ Solicita-se apoio imediato!"
    )

    enviados = []

    # Se numero foi passado diretamente pelo painel, usa ele
    if dados.numero_guarda:
        try:
            await enviar_whatsapp(dados.numero_guarda, mensagem)
            enviados.append(f"Guarda ({dados.numero_guarda})")
            print(f"[Emergencia] Alerta enviado para: {dados.numero_guarda}")
        except Exception as e:
            print(f"[Emergencia] Erro ao enviar: {e}")
    else:
        # Usa numeros salvos no banco
        numeros = []
        if config and config.numero_guarda:
            numeros.append(("Guarda Municipal", config.numero_guarda))
        if config and config.numero_diretor:
            numeros.append(("Diretor", config.numero_diretor))

        for nome, numero in numeros:
            try:
                await enviar_whatsapp(numero, mensagem)
                enviados.append(nome)
                print(f"[Emergencia] Alerta enviado para {nome}: {numero}")
            except Exception as e:
                print(f"[Emergencia] Erro ao enviar para {nome}: {e}")

    return {
        "status": "ok",
        "registro_id": registro_id,
        "horario": f"{horario} de {data}",
        "enviados": enviados,
        "mensagem": "Emergencia registrada e alertas enviados!"
    }

@router.get("/historico/{escola_id}")
async def historico_emergencias(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id, local, descricao, acionado_por, acionado_em
            FROM emergencia_log
            WHERE escola_id = :escola_id
            ORDER BY acionado_em DESC
            LIMIT 50
        """), {"escola_id": escola_id})
        return [dict(r._mapping) for r in result.fetchall()]

@router.get("/config/{escola_id}")
async def buscar_config(escola_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT numero_guarda, numero_diretor
            FROM escola_config
            WHERE escola_id = :escola_id
        """), {"escola_id": escola_id})
        row = result.fetchone()
        if not row:
            return {"numero_guarda": "", "numero_diretor": ""}
        return dict(row._mapping)

@router.post("/config/{escola_id}")
async def salvar_config(escola_id: str, config: ConfigGuarda):
    async with SessionLocal() as db:
        existe = await db.execute(sa.text(
            "SELECT escola_id FROM escola_config WHERE escola_id = :id"
        ), {"id": escola_id})
        if existe.fetchone():
            await db.execute(sa.text("""
                UPDATE escola_config
                SET numero_guarda = :numero_guarda, numero_diretor = :numero_diretor
                WHERE escola_id = :escola_id
            """), {
                "numero_guarda": config.numero_guarda,
                "numero_diretor": config.numero_diretor,
                "escola_id": escola_id,
            })
        else:
            await db.execute(sa.text("""
                INSERT INTO escola_config (escola_id, numero_guarda, numero_diretor)
                VALUES (:escola_id, :numero_guarda, :numero_diretor)
            """), {
                "escola_id": escola_id,
                "numero_guarda": config.numero_guarda,
                "numero_diretor": config.numero_diretor,
            })
        await db.commit()
    return {"mensagem": "Configuracao salva!"}