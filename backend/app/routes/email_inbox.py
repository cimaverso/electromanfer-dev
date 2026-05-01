from fastapi import APIRouter, HTTPException
from app.services.email_inbox import get_inbox

router = APIRouter(prefix="/emails", tags=["emails"])

@router.get("/inbox")
def inbox(limit: int = 20):
    try:
        return get_inbox(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))