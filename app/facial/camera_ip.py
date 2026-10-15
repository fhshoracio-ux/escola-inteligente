import cv2
import threading
import time
import numpy as np
from app.core.logging_config import logger

class CameraIP:
    """
    Lê o stream RTSP de uma câmera IP em thread separada.
    Mantém sempre o frame mais recente disponível.
    """

    def __init__(self, url_rtsp: str, reconectar_apos: int = 5):
        self.url_rtsp = url_rtsp
        self.reconectar_apos = reconectar_apos
        self.frame_atual = None
        self.rodando = False
        self._thread = None
        self._lock = threading.Lock()

    def iniciar(self):
        self.rodando = True
        self._thread = threading.Thread(target=self._loop_captura, daemon=True)
        self._thread.start()

    def parar(self):
        self.rodando = False

    def get_frame(self) -> np.ndarray | None:
        with self._lock:
            return self.frame_atual.copy() if self.frame_atual is not None else None

    def _loop_captura(self):
        while self.rodando:
            cap = cv2.VideoCapture(self.url_rtsp)
            if not cap.isOpened():
                logger.warning(f"[Camera] Não conectou em {self.url_rtsp} — tentando em {self.reconectar_apos}s")
                time.sleep(self.reconectar_apos)
                continue

            logger.info(f"[Camera] Conectada: {self.url_rtsp}")
            while self.rodando:
                ok, frame = cap.read()
                if not ok:
                    logger.warning("[Camera] Stream perdido — reconectando...")
                    break
                with self._lock:
                    self.frame_atual = frame

            cap.release()
            time.sleep(self.reconectar_apos)


def montar_url_rtsp(ip: str, usuario: str = "admin", senha: str = "admin", canal: int = 1) -> str:
    """
    Monta a URL RTSP para os modelos mais comuns de câmera IP.
    Ajuste o padrão conforme o fabricante da sua câmera.
    """
    # Hikvision / Dahua (mais comuns no Brasil)
    return f"rtsp://{usuario}:{senha}@{ip}:554/Streaming/Channels/{canal}01"

    # Intelbras — descomente se for Intelbras
    # return f"rtsp://{usuario}:{senha}@{ip}:554/cam/realmonitor?channel={canal}&subtype=0"

    # Genérico
    # return f"rtsp://{usuario}:{senha}@{ip}:554/stream1"