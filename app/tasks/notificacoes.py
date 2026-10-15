import httpx
from celery import Celery
from app.core.config import settings
from app.core.logging_config import logger

celery = Celery("escola", broker=settings.REDIS_URL)

EVOLUTION_URL = "http://localhost:8080"
EVOLUTION_KEY = "escola-api-key-2024"
EVOLUTION_INSTANCE = "Escola-Principal"

async def enviar_whatsapp_evolution(telefone: str, mensagem: str) -> bool:
    numero = telefone.replace("+", "").replace("-", "").replace(" ", "")
    if not numero.startswith("55"):
        numero = "55" + numero
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCE}",
                headers={
                    "Content-Type": "application/json",
                    "apikey": EVOLUTION_KEY,
                },
                json={
                    "number": numero,
                    "options": {"delay": 1200},
                    "textMessage": {"text": mensagem},
                },
                timeout=15,
            )
            return r.status_code == 201
    except Exception as e:
        logger.error(f"[WhatsApp] Erro: {e}")
        return False

@celery.task(bind=True, max_retries=3, default_retry_delay=30)
def enviar_whatsapp(self, registro_id: str, telefone: str, nome_aluno: str, hora: str):
    import asyncio
    mensagem = f"Ola! Seu filho(a) *{nome_aluno}* entrou na escola as *{hora}*. Tudo bem por aqui!"
    try:
        sucesso = asyncio.run(enviar_whatsapp_evolution(telefone, mensagem))
        if sucesso:
            logger.info(f"[WhatsApp] Mensagem enviada para {telefone}")
            return {"status": "enviado"}
        else:
            raise Exception("Falha no envio")
    except Exception as exc:
        raise self.retry(exc=exc)