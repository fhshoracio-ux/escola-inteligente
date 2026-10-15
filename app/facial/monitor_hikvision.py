import asyncio
import httpx
import base64
from datetime import datetime, timedelta
from app.core.logging_config import logger

DISPOSITIVO_IP = "172.18.10.10"
DISPOSITIVO_USUARIO = "admin"
DISPOSITIVO_SENHA = "F11h06s1991*"
API_URL = "http://172.18.254.254:9081"
DISPOSITIVO_ID = "06115652-5d93-11f1-86a7-0250a682958e"

ultimo_evento = {}

def get_auth():
    credenciais = f"{DISPOSITIVO_USUARIO}:{DISPOSITIVO_SENHA}"
    encoded = base64.b64encode(credenciais.encode()).decode()
    return {"Authorization": f"Basic {encoded}"}

async def buscar_eventos():
    url = f"https://{DISPOSITIVO_IP}/ISAPI/AccessControl/AcsEvent?format=json"
    agora = datetime.now()
    inicio = (agora - timedelta(seconds=10)).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    fim = agora.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    
    payload = {
        "AcsEventCond": {
            "searchID": "1",
            "searchResultPosition": 0,
            "maxResults": 10,
            "major": 5,
            "minor": 75,
            "startTime": inicio,
            "endTime": fim
        }
    }
    
    try:
        async with httpx.AsyncClient(verify=False, timeout=5) as client:
            res = await client.post(url, json=payload, headers=get_auth())
            if res.status_code == 200:
                dados = res.json()
                eventos = dados.get("AcsEvent", {}).get("InfoList", [])
                return eventos
    except Exception as e:
        logger.error(f"[Hikvision] Erro ao buscar eventos: {e}")
    return []

async def processar_evento(evento):
    nome = evento.get("name", "Desconhecido")
    id_cartao = evento.get("cardNo", "")
    horario = evento.get("time", "")
    
    chave = f"{id_cartao}_{horario}"
    if chave in ultimo_evento:
        return
    ultimo_evento[chave] = True
    
    logger.info(f"[Hikvision] Acesso: {nome} — {horario}")
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"{API_URL}/api/v1/isup/evento-hikvision",
                json={"nome": nome, "id_cartao": id_cartao, "horario": horario},
            )
            logger.info(f"[Hikvision] Registrado: {res.json()}")
    except Exception as e:
        logger.error(f"[Hikvision] Erro ao registrar: {e}")

async def main():
    logger.info(f"[Hikvision] Monitorando dispositivo {DISPOSITIVO_IP}...")
    while True:
        eventos = await buscar_eventos()
        for evento in eventos:
            await processar_evento(evento)
        await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(main())
