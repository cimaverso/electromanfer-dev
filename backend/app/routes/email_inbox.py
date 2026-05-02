from fastapi import APIRouter, HTTPException
from app.services.email_inbox import get_inbox, get_sent, get_hilo, marcar_leido


router = APIRouter(prefix="/emails", tags=["Emails"])

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
    
@router.get("/hilo/{message_id:path}")
def hilo(message_id: str):
    try:
        return get_hilo(message_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.patch("/{email_id}/leido")
def leido(email_id: str):
    try:
        return marcar_leido(email_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

