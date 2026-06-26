from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response
from app.services.buzon import get_inbox, get_sent, get_hilo, marcar_leido, responder_hilo, responder_con_adjuntos, eliminar_hilo, eliminar_mensaje, get_attachment, enviar_correo_guia
from app.core.security import require_auth
from app.schemas.auth import TokenData
from app.schemas.envios import ResponderHiloSchema
from typing import Optional, List

router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("/inbox")
def inbox(limit: int = 10, page_token: str = None, _: TokenData = Depends(require_auth)):
    try:
        return get_inbox(limit=limit, page_token=page_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/sent")
def sent(limit: int = 10, page_token: str = None, _: TokenData = Depends(require_auth)):
    try:
        return get_sent(limit=limit, page_token=page_token)
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
            references=data.references,
            firma_url=data.firma_url,
        )
        if not message_id:
            raise HTTPException(status_code=500, detail="Error al enviar")
        return {"ok": True, "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/responder-con-adjuntos")
async def responder_adjuntos(
    thread_id: str = Form(...),
    destino: str = Form(...),
    asunto: str = Form(...),
    cuerpo: str = Form(...),
    in_reply_to: Optional[str] = Form(None),
    references: Optional[str] = Form(None),
    firma_url: Optional[str] = Form(None),
    archivos: List[UploadFile] = File(default=[]),
    _: TokenData = Depends(require_auth),
):
    try:
        archivos_procesados = []
        for archivo in archivos:
            contenido = await archivo.read()
            archivos_procesados.append({
                'nombre': archivo.filename,
                'data': contenido,
            })
        message_id = responder_con_adjuntos(
            destino=destino,
            asunto=asunto,
            cuerpo=cuerpo,
            archivos=archivos_procesados,
            in_reply_to=in_reply_to,
            references=references,
            firma_url=firma_url,
        )
        if not message_id:
            raise HTTPException(status_code=500, detail="Error al enviar")
        return {"ok": True, "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/enviar")
async def enviar(
    destino: str = Form(...),
    asunto: str = Form(...),
    cuerpo: str = Form(...),
    firma_url: Optional[str] = Form(None),
    adjuntos_imagenes_urls: Optional[str] = Form(None),
    archivos_extra: List[UploadFile] = File(default=[]),
    _: TokenData = Depends(require_auth),
):
    try:
        import json
        archivos = []
        for archivo in archivos_extra:
            contenido = await archivo.read()
            archivos.append({'nombre': archivo.filename, 'data': contenido})

        urls = json.loads(adjuntos_imagenes_urls) if adjuntos_imagenes_urls and adjuntos_imagenes_urls.strip() else None

        message_id = enviar_correo_guia(
            destino=destino,
            asunto=asunto,
            cuerpo=cuerpo,
            firma_url=firma_url,
            adjuntos_urls=urls,
            archivos_extra=archivos,
        )
        if not message_id:
            raise HTTPException(status_code=500, detail="Error al enviar")
        return {"ok": True, "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/hilo/{thread_id}")
def borrar_hilo(thread_id: str, _: TokenData = Depends(require_auth)):
    try:
        return eliminar_hilo(thread_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/mensaje/{message_id}")
def borrar_mensaje(message_id: str, _: TokenData = Depends(require_auth)):
    try:
        return eliminar_mensaje(message_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{message_id}/adjunto/{attachment_id}")
def descargar_adjunto(
    message_id: str,
    attachment_id: str,
    nombre: str = "adjunto",
    tipo: str = "application/octet-stream",
    _: TokenData = Depends(require_auth),
):
    try:
        data = get_attachment(message_id, attachment_id)
        return Response(
            content=data,
            media_type=tipo,
            headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))