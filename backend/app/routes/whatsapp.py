from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.integrations.cimasuite.client import WhatsappService
from app.integrations.cimasuite.schemas import (
    ConectarNumeroRequest,
    ConectarNumeroResponse,
    ConversacionesResponse,
    MensajesResponse,
    EnviarTextoRequest,
    ActualizarFlagsRequest,
)
from app.schemas.auth import TokenData
from app.core.security import require_auth
from app.core.db import get_db
from app.models.asesor_lineas import AsesorLinea
from app.enums import RoleEnum

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def _phone_number_id_para(token: TokenData, db: Session) -> Optional[str]:
    """
    VENDEDOR -> devuelve su phone_number_id asignado (o 403 si no tiene línea).
    GERENCIA / ADMINISTRADOR -> None (sin filtro, ve todas las líneas).
    """
    if token.role != RoleEnum.VENDEDOR.value:
        return None

    asignacion = (
        db.query(AsesorLinea)
        .filter(AsesorLinea.usuario_id == token.user_id)
        .first()
    )
    if not asignacion:
        raise HTTPException(
            status_code=403,
            detail="No tienes una línea de WhatsApp asignada",
        )
    return asignacion.phone_number_id


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
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    phone_number_id = _phone_number_id_para(token, db)
    return WhatsappService.listar_conversaciones(page, limit, phone_number_id)


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
