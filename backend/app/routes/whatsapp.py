from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import Response
from app.services.whatsapp import WhatsappService
from app.schemas.whatsapp import (
    ConectarNumeroRequest,
    ConectarNumeroResponse,
    ConversacionesResponse,
    MensajesResponse,
    EnviarTextoRequest,
    ActualizarFlagsRequest,
)
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/onboarding/connect", response_model=ConectarNumeroResponse)
def conectar_numero(
    body: ConectarNumeroRequest,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.conectar_numero(body.code, body.display_name)


@router.get("/conversaciones", response_model=ConversacionesResponse)
def listar_conversaciones(
    page: int = 1,
    limit: int = 20,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.listar_conversaciones(page, limit)


@router.get("/conversaciones/{conversation_id}/mensajes", response_model=MensajesResponse)
def obtener_mensajes(
    conversation_id: int,
    page: int = 1,
    limit: int = 50,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.obtener_mensajes(conversation_id, page, limit)


@router.post("/mensajes/texto")
def enviar_texto(
    body: EnviarTextoRequest,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_texto(body.to, body.message, body.conversation_id)


@router.post("/mensajes/imagen")
def enviar_imagen(
    to: str = Form(...),
    conversation_id: Optional[int] = Form(None),
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_imagen(to, file, conversation_id, caption)


@router.post("/mensajes/documento")
def enviar_documento(
    to: str = Form(...),
    conversation_id: Optional[int] = Form(None),
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_documento(to, file, conversation_id, caption)


@router.post("/mensajes/video")
def enviar_video(
    to: str = Form(...),
    conversation_id: Optional[int] = Form(None),
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_video(to, file, conversation_id, caption)


@router.post("/mensajes/audio")
def enviar_audio(
    to: str = Form(...),
    conversation_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_audio(to, file, conversation_id)


@router.get("/media/{media_id}")
def obtener_media(
    media_id: str,
    _: TokenData = Depends(require_auth),
):
    contenido_bytes, content_type = WhatsappService.descargar_media(media_id)
    return Response(content=contenido_bytes, media_type=content_type)


@router.patch("/conversaciones/{conversation_id}")
def actualizar_flags(
    conversation_id: int,
    body: ActualizarFlagsRequest,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.actualizar_flags(conversation_id, body.model_dump())


@router.delete("/conversaciones/{conversation_id}/mensajes")
def vaciar_conversacion(
    conversation_id: int,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.vaciar_conversacion(conversation_id)


@router.delete("/conversaciones/{conversation_id}")
def eliminar_conversacion(
    conversation_id: int,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.eliminar_conversacion(conversation_id)
