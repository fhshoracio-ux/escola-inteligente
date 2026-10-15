import asyncio
import time
import httpx
import cv2
import numpy as np
from app.facial.camera_ip import CameraIP, montar_url_rtsp
from app.core.logging_config import logger
from app.facial.motor import extrair_embedding
from app.facial.busca import buscar_rosto

CAMERA_IP = "172.18.10.10"
CAMERA_USUARIO = "admin"
CAMERA_SENHA = "F11h06s1991*"
DISPOSITIVO_ID = "06115652-5d93-11f1-86a7-0250a682958e"
API_URL = "http://172.18.254.254:9081"
INTERVALO_ENTRE_CAPTURAS = 2
COOLDOWN_MESMO_ALUNO = 30

ultimo_reconhecido = {}

async def processar_frame(frame: np.ndarray):
    embedding = extrair_embedding(frame)
    if embedding is None:
        logger.debug("[Monitor] Nenhum rosto detectado no frame")
        return

    match = buscar_rosto(embedding, "rostos_alunos")
    if not match:
        logger.debug("[Monitor] Rosto detectado mas nao reconhecido")
        return

    aluno_id = match["payload"].get("entidade_id")
    agora = time.time()

    if aluno_id in ultimo_reconhecido:
        if agora - ultimo_reconhecido[aluno_id] < COOLDOWN_MESMO_ALUNO:
            return

    ultimo_reconhecido[aluno_id] = agora

    _, buffer = cv2.imencode(".jpg", frame)
    foto_bytes = buffer.tobytes()

    async with httpx.AsyncClient() as client:
        resposta = await client.post(
            f"{API_URL}/api/v1/catraca/entrada/{DISPOSITIVO_ID}",
            files={"foto": ("frame.jpg", foto_bytes, "image/jpeg")},
            timeout=10,
        )
        dados = resposta.json()
        if dados.get("reconhecido"):
            logger.info(f"[Catraca] {dados['nome']} — confianca {dados['confianca']}")
        else:
            logger.info(f"[Catraca] {dados['mensagem']}")

async def main():
    url_rtsp = montar_url_rtsp(CAMERA_IP, CAMERA_USUARIO, CAMERA_SENHA)
    logger.info(f"[Monitor] Conectando: {url_rtsp}")
    camera = CameraIP(url_rtsp)
    camera.iniciar()
    logger.info("[Monitor] Monitorando catraca... pressione CTRL+C para parar")
    while True:
        frame = camera.get_frame()
        if frame is not None:
            await processar_frame(frame)
        await asyncio.sleep(INTERVALO_ENTRE_CAPTURAS)

if __name__ == "__main__":
    asyncio.run(main())
