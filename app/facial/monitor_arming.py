import asyncio
import httpx
import re
import time
from httpx import DigestAuth
from app.core.logging_config import logger

TERMINAIS = [
    {"ip": "172.18.10.7",  "nome": "Sala 1", "tipo": "presenca_sala"},
    {"ip": "172.18.10.8",  "nome": "Sala 2", "tipo": "presenca_sala"},
    {"ip": "172.18.10.9",  "nome": "Sala 3", "tipo": "presenca_sala"},
    {"ip": "172.18.10.10", "nome": "Sala 4", "tipo": "presenca_sala"},
    {"ip": "172.18.10.11", "nome": "Sala 5", "tipo": "presenca_sala"},
    {"ip": "172.18.10.4",  "nome": "Entrada 1", "tipo": "entrada"},
    {"ip": "172.18.10.6",  "nome": "Entrada 2", "tipo": "entrada"},
    {"ip": "172.18.10.5",  "nome": "Saida 1",   "tipo": "saida"},
    {"ip": "172.18.10.13", "nome": "Saida 2",   "tipo": "saida"},
]

USUARIO = "admin"
SENHA   = "F11h06s1991*"
API_URL = "http://172.18.254.254:9081"
COOLDOWN_SEGUNDOS = 30
ultimo_acesso = {}

async def processar_evento(texto, terminal):
    if len(texto.strip()) < 10:
        return
    nome = None
    match = re.search(r'"name"\s*:\s*"([^"]+)"', texto)
    if match:
        nome = match.group(1).strip()
    if not nome:
        return
    chave = f"{nome}_{terminal['ip']}"
    agora = time.time()
    if chave in ultimo_acesso:
        if agora - ultimo_acesso[chave] < COOLDOWN_SEGUNDOS:
            return
    ultimo_acesso[chave] = agora
    logger.info(f"[{terminal['nome']}] Pessoa: {nome} — Tipo: {terminal['tipo']}")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                f"{API_URL}/api/v1/isup/evento-hikvision",
                json={
                    "nome": nome,
                    "id_cartao": "",
                    "horario": "",
                    "tipo_evento": terminal["tipo"],
                    "terminal_ip": terminal["ip"],
                    "terminal_nome": terminal["nome"],
                }
            )
            logger.info(f"[{terminal['nome']}] API: {res.json()}")
    except Exception as e:
        logger.error(f"[{terminal['nome']}] Erro: {e}")

async def monitorar_terminal(terminal):
    url  = f"https://{terminal['ip']}/ISAPI/Event/notification/alertStream"
    auth = DigestAuth(USUARIO, SENHA)
    logger.info(f"[{terminal['nome']}] Conectando em {terminal['ip']}...")
    while True:
        try:
            async with httpx.AsyncClient(
                verify=False, auth=auth,
                timeout=httpx.Timeout(None, connect=10)
            ) as client:
                async with client.stream(
                    "GET", url,
                    headers={"Connection": "keep-alive"}
                ) as response:
                    if response.status_code == 200:
                        logger.info(f"[{terminal['nome']}] Conectado!")
                        buffer = ""
                        async for chunk in response.aiter_text():
                            buffer += chunk
                            if "--" in buffer:
                                partes = buffer.split("--")
                                for parte in partes[:-1]:
                                    await processar_evento(parte, terminal)
                                buffer = partes[-1]
                    else:
                        logger.warning(f"[{terminal['nome']}] Status: {response.status_code}")
                        await asyncio.sleep(10)
        except Exception as e:
            logger.error(f"[{terminal['nome']}] Erro: {e} — Reconectando em 10s...")
            await asyncio.sleep(10)

async def main():
    logger.info(f"[Monitor] Iniciando monitoramento de {len(TERMINAIS)} terminais...")
    tarefas = [monitorar_terminal(t) for t in TERMINAIS]
    await asyncio.gather(*tarefas)

if __name__ == "__main__":
    asyncio.run(main())