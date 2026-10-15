import asyncio
import hashlib
import hmac
from app.core.logging_config import logger

HOST = "0.0.0.0"
PORT = 7660
CHAVE = "Escola@2024"

def calcular_hmac(dados, chave):
    return hmac.new(chave.encode(), dados, hashlib.sha256).digest()

async def processar_conexao(reader, writer):
    addr = writer.get_extra_info("peername")
    logger.info(f"[ISUP] Conexao de {addr}")
    
    try:
        while True:
            chunk = await asyncio.wait_for(reader.read(4096), timeout=60)
            if not chunk:
                break
            
            logger.info(f"[ISUP] Recebido {len(chunk)} bytes: {chunk.hex()}")
            
            if len(chunk) >= 92 and chunk[0] == 0x10 and chunk[1] == 0x5a:
                # Posicoes fixas baseadas na analise do pacote de 92 bytes:
                # 0-4: cabecalho (10 5a 01 01 00)
                # 5: tamanho do serial (09)
                # 6-14: serial GB6655139
                # 15: tamanho do modelo (0e = 14)
                # 16-29: modelo DS-K1T673DX-BR
                # 30-31: separador (29 26)
                # 32: tamanho device_id (10 = 16)
                # 33-48: device_id catracaprincipal
                # 49-80: challenge (32 bytes)
                # 81: tamanho serial repeat (09)
                # 82-90: serial repeat GB6655139
                
                challenge = chunk[49:81]
                logger.info(f"[ISUP] Challenge (32 bytes): {challenge.hex()}")
                
                mac = calcular_hmac(challenge, CHAVE)
                logger.debug(f"[ISUP] HMAC: {mac.hex()}")
                
                resposta = bytes([0x10, 0x5b, 0x01, 0x01, 0x00, 0x20]) + mac
                writer.write(resposta)
                await writer.drain()
                logger.info(f"[ISUP] Resposta enviada!")
                
    except asyncio.TimeoutError:
        logger.warning(f"[ISUP] Timeout {addr}")
    except Exception as e:
        logger.error(f"[ISUP] Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            writer.close()
        except Exception as e:
            logger.error(f"[ISUP] Erro ao fechar writer: {e}")
        logger.info(f"[ISUP] Desconectado {addr}")

async def main():
    server = await asyncio.start_server(processar_conexao, HOST, PORT)
    logger.info(f"[ISUP] Servidor TCP porta {PORT}")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())
