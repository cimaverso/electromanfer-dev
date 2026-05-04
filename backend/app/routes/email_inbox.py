from fastapi import APIRouter, HTTPException, Depends
from app.services.email_inbox import get_inbox, get_sent, get_hilo, marcar_leido, responder_hilo
from app.core.security import require_auth
from app.schemas.auth import TokenData
from app.schemas.envios import ResponderHiloSchema

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("/inbox")
def inbox(limit: int = 10, _: TokenData = Depends(require_auth)):
    try:
        return get_inbox(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sent")
def sent(limit: int = 10, _: TokenData = Depends(require_auth)):
    try:
        return get_sent(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hilo/{message_id:path}")
def hilo(message_id: str, _: TokenData = Depends(require_auth)):
    try:
        return get_hilo(message_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{email_id}/leido")
def leido(email_id: str, _: TokenData = Depends(require_auth)):
    try:
        return marcar_leido(email_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/responder")
def responder(data: ResponderHiloSchema, _: TokenData = Depends(require_auth)):
    try:
        message_id = responder_hilo(
            destino=data.destino,
            asunto=data.asunto,
            cuerpo=data.cuerpo,
            in_reply_to=data.in_reply_to,
        )
        if not message_id:
            raise HTTPException(status_code=500, detail="Error al enviar")
        return {"ok": True, "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))