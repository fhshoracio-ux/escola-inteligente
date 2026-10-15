from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import subprocess
import os
import sqlalchemy as sa
from app.db.database import SessionLocal
from app.core.logging_config import logger
from app.core.config import settings

router = APIRouter(prefix="/cameras", tags=["Cameras"])

FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")
HLS_DIR = settings.HLS_DIR
os.makedirs(HLS_DIR, exist_ok=True)

processos_ativos = {}

async def iniciar_hls(camera_id: str, rtsp_url: str):
    pasta = os.path.join(HLS_DIR, camera_id)
    os.makedirs(pasta, exist_ok=True)
    m3u8 = os.path.join(pasta, "stream.m3u8")

    if camera_id in processos_ativos:
        try:
            processos_ativos[camera_id].terminate()
        except Exception as e:
            logger.error(f"[HLS] Erro ao terminar processo: {e}")

    cmd = [
        FFMPEG, "-y",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-vf", "scale=640:-2",
        "-b:v", "500k",
        "-maxrate", "500k",
        "-bufsize", "1000k",
        "-an",
        "-hls_time", "1",
        "-hls_list_size", "2",
        "-hls_flags", "delete_segments+append_list",
        "-f", "hls",
        m3u8
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    processos_ativos[camera_id] = proc
    logger.info(f"[HLS] Stream iniciado para camera {camera_id}")
    return m3u8

@router.post("/iniciar/{turma_id}")
async def iniciar_camera(turma_id: str):
    async with SessionLocal() as db:
        result = await db.execute(sa.text("""
            SELECT c.id, c.rtsp_url, c.nome
            FROM camera c
            WHERE c.turma_id = :turma_id AND c.ativa = 1
            LIMIT 1
        """), {"turma_id": turma_id})
        camera = result.fetchone()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera nao encontrada para esta turma")

    await iniciar_hls(camera.id, camera.rtsp_url)
    return {"stream_url": f"/api/v1/cameras/stream/{camera.id}/stream.m3u8"}

@router.get("/stream/{camera_id}/{arquivo}")
async def servir_hls(camera_id: str, arquivo: str):
    caminho = os.path.join(HLS_DIR, camera_id, arquivo)
    if not os.path.exists(caminho):
        raise HTTPException(status_code=404, detail="Stream nao disponivel")
    return FileResponse(caminho)