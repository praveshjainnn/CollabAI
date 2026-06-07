from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("")
async def health_check():
    return {"status": "ok"}
