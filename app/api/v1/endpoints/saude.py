from fastapi import APIRouter

router = APIRouter()

@router.get("/saude", tags=["Sistema"])
async def verificar_saude():
    return {"api": "ok"}