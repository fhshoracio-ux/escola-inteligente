import socket
import serial
from app.core.config import settings
from app.core.logging_config import logger

def liberar_via_serial() -> bool:
    try:
        with serial.Serial(settings.CATRACA_PORTA, settings.CATRACA_BAUD, timeout=1) as s:
            s.write(b"\x55")
            resposta = s.read(1)
            return resposta == b"\xAA"
    except Exception as e:
        logger.error(f"[Catraca serial] Erro: {e}")
        return False

def liberar_via_tcp(ip: str, porta: int = 4370) -> bool:
    try:
        with socket.create_connection((ip, porta), timeout=2) as s:
            s.sendall(b"\x55")
            resposta = s.recv(1)
            return resposta == b"\xAA"
    except Exception as e:
        logger.error(f"[Catraca TCP] Erro: {e}")
        return False
