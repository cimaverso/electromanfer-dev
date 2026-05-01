from fastapi import APIRouter, HTTPException
from app.services.email_inbox import get_inbox, get_sent

router = APIRouter(prefix="/emails", tags=["emails"])

@router.get("/inbox")
def inbox(limit: int = 10):
    try:
        return get_inbox(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/sent")
def sent(limit: int = 10):
    try:
        return get_sent(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{email_id}")
def get_email(email_id: str, bandeja: str = "inbox"):
    try:
        from app.services.email_inbox import get_email_by_id
        return get_email_by_id(email_id, bandeja)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.patch("/{email_id}/leido")
def leido(email_id: str):
    try:
        from app.services.email_inbox import marcar_leido
        return marcar_leido(email_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))