from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.logging_config import logger
import numpy as np
import cv2
import uuid
import traceback

router = APIRouter(prefix="/catraca", tags=["Catraca"])

class RespostaEntrada(BaseModel):
    reconhecido: bool
    liberado: bool
    mensagem: str
    aluno_id: Optional[str] = None
    nome: Optional[str] = None
    turma: Optional[str] = None
    confianca: Optional[float] = None
    horario: Optional[str] = None

@router.post("/entrada/{dispositivo_id}", response_model=RespostaEntrada)
async def processar_entrada(dispositivo_id: str, foto: UploadFile = File(...)):
    logger.info(f"[Catraca] Iniciando dispositivo={dispositivo_id}")
    try:
        from app.db.database import SessionLocal
        from app.facial.busca import buscar_rosto
        from app.api.v1.endpoints.facial import extrair_embedding_com_confianca
        import sqlalchemy as sa

        conteudo = await foto.read()
        logger.info(f"[Catraca] Foto: {len(conteudo)} bytes")
        arr = np.frombuffer(conteudo, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return RespostaEntrada(reconhecido=False, liberado=False, mensagem="Imagem invalida")

        logger.info("[Catraca] Extraindo embedding...")
        resultado = extrair_embedding_com_confianca(frame)
        if resultado is None:
            return RespostaEntrada(reconhecido=False, liberado=False, mensagem="Nenhum rosto detectado")

        embedding, _ = resultado
        logger.info("[Catraca] Buscando rosto...")
        match = buscar_rosto(embedding, "rostos_alunos")
        if not match:
            return RespostaEntrada(reconhecido=False, liberado=False, mensagem="Rosto nao reconhecido")

        logger.info(f"[Catraca] Match: {match}")
        confianca = match["confianca"]
        horario = datetime.now().strftime("%H:%M")
        horario_completo = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        async with SessionLocal() as db:
            result = await db.execute(sa.text("""
                SELECT a.id, a.nome, a.matricula, a.escola_id, t.nome as turma
                FROM embedding_ref er
                JOIN aluno a ON a.id = er.entidade_id
                LEFT JOIN turma t ON t.id = a.turma_id
                WHERE er.qdrant_point_id = :point_id AND a.ativo = 1
            """), {"point_id": match["qdrant_point_id"]})
            aluno = result.fetchone()

        if not aluno:
            return RespostaEntrada(reconhecido=False, liberado=False, mensagem="Aluno nao encontrado")

        logger.info(f"[Catraca] Aluno: {aluno.nome}")
        registro_id = str(uuid.uuid4())
        async with SessionLocal() as db:
            await db.execute(sa.text("""
                INSERT INTO registro_acesso (id, aluno_id, dispositivo_id, escola_id, tipo_evento, confianca)
                VALUES (:id, :aluno_id, :dispositivo_id, :escola_id, 'entrada', :confianca)
            """), {"id": registro_id, "aluno_id": aluno.id, "dispositivo_id": dispositivo_id,
                   "escola_id": aluno.escola_id, "confianca": confianca})
            await db.commit()

        logger.info("[Catraca] Entrada registrada!")
        return RespostaEntrada(
            reconhecido=True, liberado=True,
            mensagem=f"Bem-vindo, {aluno.nome.split()[0]}!",
            aluno_id=aluno.id, nome=aluno.nome, turma=aluno.turma,
            confianca=round(confianca, 4), horario=horario_completo,
        )
    except Exception as e:
        logger.error(f"[Catraca] ERRO: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))