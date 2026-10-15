from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import re
import json
import sqlalchemy as sa
import httpx
import xml.etree.ElementTree as ET
from app.db.database import SessionLocal

router = APIRouter(prefix="/isup", tags=["ISUP"])

TERMINAIS_MAP = {
    "172.18.10.4":  ("Entrada 1",  "entrada"),
    "172.18.10.5":  ("Saida 1",    "saida"),
    "172.18.10.6":  ("Entrada 2",  "entrada"),
    "172.18.10.7":  ("Sala 1",     "presenca_sala"),
    "172.18.10.8":  ("Sala 2",     "presenca_sala"),
    "172.18.10.9":  ("Sala 3",     "presenca_sala"),
    "172.18.10.10": ("Sala 4",     "presenca_sala"),
    "172.18.10.11": ("Sala 5 AEE", "presenca_sala"),
    "172.18.10.13": ("Saida 2",    "saida"),
}

class EventoHikvision(BaseModel):
    nome: str
    id_cartao: Optional[str] = None
    horario: Optional[str] = None
    tipo_evento: Optional[str] = "entrada"
    terminal_ip: Optional[str] = None
    terminal_nome: Optional[str] = None

async def buscar_aluno(nome: str):
    partes = nome.strip().split()
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT a.id, a.nome, a.escola_id, a.turma_id, t.nome as turma, t.turno
            FROM aluno a
            LEFT JOIN turma t ON t.id = a.turma_id
            WHERE a.nome LIKE :nome AND a.ativo = 1
            LIMIT 1
        """), {"nome": f"%{nome}%"})
        aluno = result.fetchone()
        if not aluno and partes:
            result = await db.execute(sa.text("""
                SELECT a.id, a.nome, a.escola_id, a.turma_id, t.nome as turma, t.turno
                FROM aluno a
                LEFT JOIN turma t ON t.id = a.turma_id
                WHERE a.nome LIKE :nome AND a.ativo = 1
                LIMIT 1
            """), {"nome": f"%{partes[0]}%"})
            aluno = result.fetchone()
    return aluno

async def buscar_aluno_por_matricula(matricula: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT a.id, a.nome, a.escola_id, a.turma_id, t.nome as turma, t.turno
            FROM aluno a
            LEFT JOIN turma t ON t.id = a.turma_id
            WHERE a.matricula = :matricula AND a.ativo = 1
            LIMIT 1
        """), {"matricula": matricula})
        return result.fetchone()

async def registrar_acesso(aluno_id, escola_id, dispositivo_nome, tipo_evento, confianca=1.0):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT id FROM dispositivo WHERE nome LIKE :nome LIMIT 1
        """), {"nome": f"%{dispositivo_nome}%"})
        disp = result.fetchone()
        dispositivo_id = disp.id if disp else None
        registro_id = str(uuid.uuid4())
        await db.execute(sa.text("""
            INSERT INTO registro_acesso
                (id, aluno_id, dispositivo_id, escola_id, tipo_evento, confianca)
            VALUES
                (:id, :aluno_id, :dispositivo_id, :escola_id, :tipo_evento, :confianca)
        """), {
            "id": registro_id,
            "aluno_id": aluno_id,
            "dispositivo_id": dispositivo_id,
            "escola_id": escola_id,
            "tipo_evento": tipo_evento,
            "confianca": confianca,
        })
        await db.commit()
        print(f"[ISUP] Acesso registrado — {tipo_evento} — {registro_id}")
        return registro_id

async def enviar_whatsapp(numero, mensagem):
    try:
        numero = numero.replace("+", "").replace("-", "").replace(" ", "")
        if not numero.startswith("55"):
            numero = "55" + numero
        partes = numero[2:]
        if len(partes) == 10:
            partes = partes[:2] + "9" + partes[2:]
            numero = "55" + partes
        print(f"[WhatsApp] Enviando para {numero}")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://localhost:8080/message/sendText/Escola-Principal",
                headers={"Content-Type": "application/json", "apikey": "3zxy3t1vcvnxlphq2hvvoc"},
                json={"number": numero, "options": {"delay": 0}, "textMessage": {"text": mensagem}},
                timeout=10,
            )
        print(f"[WhatsApp] Resposta: {resp.status_code}")
    except Exception as e:
        print(f"[WhatsApp] Erro: {e}")

async def notificar_responsaveis(aluno_id, nome_aluno, mensagem):
    print(f"[ISUP] Buscando responsaveis do aluno {aluno_id}")
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT nome, telefone_whatsapp
            FROM responsavel
            WHERE aluno_id = :aluno_id AND notificacoes_ativas = 1
        """), {"aluno_id": aluno_id})
        responsaveis = result.fetchall()
    print(f"[ISUP] Responsaveis encontrados: {len(responsaveis)}")
    for r in responsaveis:
        msg = mensagem.replace("{responsavel}", r.nome).replace("{aluno}", nome_aluno)
        await enviar_whatsapp(r.telefone_whatsapp, msg)
        print(f"[WhatsApp] Enviado para {r.nome}")

async def processar_evento(nome_aluno: str, matricula: str, terminal_ip: str, confianca: float = 1.0, tipo_evento_override: str = None):
    horario = datetime.now().strftime("%H:%M")
    data    = datetime.now().strftime("%d/%m/%Y")
    terminal_nome, tipo_evento = TERMINAIS_MAP.get(terminal_ip, ("Terminal", "entrada"))

    if tipo_evento_override:
        tipo_evento = tipo_evento_override

    aluno = None
    if matricula:
        aluno = await buscar_aluno_por_matricula(matricula)
    if not aluno and nome_aluno:
        aluno = await buscar_aluno(nome_aluno)

    if not aluno:
        print(f"[ISUP] Aluno nao encontrado — matricula: {matricula} nome: {nome_aluno}")
        return

    print(f"[ISUP] {aluno.nome} — {tipo_evento} — {terminal_nome}")
    await registrar_acesso(aluno.id, aluno.escola_id, terminal_nome, tipo_evento, confianca)

    if tipo_evento == "entrada":
        mensagem = (
            f"✅ *Entrada registrada!*\n\n"
            f"👤 *Aluno:* {aluno.nome}\n"
            f"🏫 *Turma:* {aluno.turma or 'N/A'}\n"
            f"🚪 *Terminal:* {terminal_nome}\n"
            f"🕐 *Horário:* {horario} de {data}\n\n"
            f"Seu filho entrou na escola!\n"
            f"_Mensagem automatica — Escola Inteligente_ 🏫"
        )
    elif tipo_evento == "saida":
        mensagem = (
            f"🚶 *Saída registrada!*\n\n"
            f"👤 *Aluno:* {aluno.nome}\n"
            f"🏫 *Turma:* {aluno.turma or 'N/A'}\n"
            f"🚪 *Terminal:* {terminal_nome}\n"
            f"🕐 *Horário:* {horario} de {data}\n\n"
            f"Seu filho saiu da escola!\n"
            f"_Mensagem automatica — Escola Inteligente_ 🏫"
        )
    else:
        mensagem = (
            f"📚 *Presença em sala registrada!*\n\n"
            f"👤 *Aluno:* {aluno.nome}\n"
            f"🏫 *Turma:* {aluno.turma or 'N/A'}\n"
            f"🚪 *Sala:* {terminal_nome}\n"
            f"🕐 *Horário:* {horario} de {data}\n\n"
            f"Seu filho está em sala de aula!\n"
            f"_Mensagem automatica — Escola Inteligente_ 🏫"
        )

    print(f"[ISUP] Notificando responsaveis do aluno {aluno.id}")
    await notificar_responsaveis(aluno.id, aluno.nome, mensagem)

@router.post("/eventos")
async def receber_evento(request: Request):
    try:
        corpo = await request.body()
        terminal_ip = request.client.host if request.client else ""
        content_type = request.headers.get("content-type", "")

        print(f"[ISUP] Evento recebido de {terminal_ip} — {len(corpo)} bytes")

        if not corpo:
            return {"result": "success"}

        corpo_str = corpo.decode("utf-8", errors="ignore")

        if "multipart" in content_type:
            matches = re.finditer(r'\{', corpo_str)
            processados = set()
            for m in matches:
                try:
                    decoder = json.JSONDecoder()
                    dados, _ = decoder.raw_decode(corpo_str, m.start())

                    evento = dados
                    for chave in ['AccessControllerEvent', 'Event', 'event']:
                        if chave in dados:
                            evento = dados[chave]
                            break

                    nome      = str(evento.get('employeeName') or evento.get('name') or evento.get('label') or evento.get('userName') or "")
                    matricula = str(evento.get('employeeNoString') or evento.get('employeeNo') or evento.get('cardNo') or "")

                    print(f"[ISUP] Candidato — nome: '{nome}' matricula: '{matricula}'")

                    if not nome and not matricula:
                        continue
                    if nome.lower() in ['admin', 'undefined', ''] and matricula.lower() in ['admin', '']:
                        continue

                    chave_unica = f"{matricula}_{nome}"
                    if chave_unica in processados:
                        continue
                    processados.add(chave_unica)

                    sim = evento.get('similarity') or evento.get('score') or 100
                    try:
                        confianca = float(sim) / 100.0
                    except:
                        confianca = 1.0

                    print(f"[ISUP] nome: '{nome}' matricula: '{matricula}' confianca: {confianca}")
                    await processar_evento(nome, matricula, terminal_ip, confianca)
                    break

                except Exception as ex:
                    print(f"[ISUP] Excecao: {ex}")
                    continue

            if not processados:
                print(f"[ISUP] Evento sem aluno — ignorado")

            return {"result": "success"}

        if "heartbeat" in corpo_str.lower():
            print(f"[ISUP] Heartbeat de {terminal_ip} — ignorado")
            return {"result": "success"}

        try:
            xml_str = corpo_str.replace(' xmlns="http://www.isapi.org/ver20/XMLSchema"', '')
            xml_str = xml_str.replace(' xmlns="http://www.hikvision.com/ver10/XMLSchema"', '')
            root = ET.fromstring(xml_str)
            nome = ""
            matricula = ""
            for tag in ['name', 'Name', 'employeeName', 'userName']:
                el = root.find(f".//{tag}")
                if el is not None and el.text:
                    nome = el.text.strip()
                    break
            for tag in ['employeeNo', 'cardNo', 'CardNo']:
                el = root.find(f".//{tag}")
                if el is not None and el.text:
                    matricula = el.text.strip()
                    break
            print(f"[ISUP] XML — nome: '{nome}' matricula: '{matricula}'")
            if nome or matricula:
                await processar_evento(nome, matricula, terminal_ip, 1.0)
        except Exception as e:
            print(f"[ISUP] Erro XML: {e}")

        return {"result": "success"}

    except Exception as e:
        print(f"[ISUP] Erro geral: {e}")
        return {"result": "success"}

@router.post("/evento-hikvision")
async def receber_evento_hikvision(evento: EventoHikvision):
    print(f"[ISUP] Evento manual: {evento.nome} — {evento.tipo_evento} — {evento.terminal_nome}")
    await processar_evento(evento.nome, "", evento.terminal_ip or "", 1.0, tipo_evento_override=evento.tipo_evento)
    return {"status": "ok"}