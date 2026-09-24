from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.integrations.cimasuite.client import WhatsappService
from app.integrations.bot.schedule import esta_en_horario_bot
from app.integrations.cimasuite.schemas import (
    ConectarNumeroRequest,
    ConectarNumeroResponse,
    ConversacionesResponse,
    MensajesResponse,
    EnviarTextoRequest,
    ActualizarFlagsRequest,
    CrearPlantillaRequest,
    EnviarPlantillaRequest,
)
from app.schemas.auth import TokenData
from app.core.security import require_auth
from app.core.db import get_db
from app.models.asesor_lineas import AsesorLinea
from app.enums import RoleEnum

# Líneas de WhatsApp disponibles para el selector de GERENCIA/ADMINISTRADOR
# (Harvey y Cimaverso Tech). Los vendedores no usan esta lista: ellos ya
# tienen su línea fija en `asesor_lineas`.
#
# `id` = el id INTERNO de `phone_numbers` en CimAPI (el mismo que espera
# el filtro `phone_number_id` de CimAPI) -- NO el whatsapp_phone_number_id
# (el string largo tipo "724029521785193").
#
# Cuando conectes la línea de Wilson, solo agrega una entrada aquí.
LINEAS_WHATSAPP = [
    {"id": 7, "nombre": "Ferretería 2"},
    {"id": 8, "nombre": "Ferretería 1"},
]

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def _phone_number_id_para(token: TokenData, db: Session, linea_id: Optional[int] = None) -> Optional[str]:
    """
    VENDEDOR -> devuelve su phone_number_id asignado (o 403 si no tiene línea).
        Ignora `linea_id` si lo mandan: un vendedor no elige, ya tiene su línea fija.
    GERENCIA / ADMINISTRADOR -> filtra por `linea_id` si lo mandan (selector de
        línea en el frontend); sin `linea_id`, None = sin filtro (todas mezcladas,
        comportamiento previo, por si algo más del backend sigue llamando esto
        sin pasar línea).
    """
    if token.role == RoleEnum.VENDEDOR.value:
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

    if linea_id is None:
        return None

    linea = next((l for l in LINEAS_WHATSAPP if l["id"] == linea_id), None)
    if not linea:
        raise HTTPException(status_code=400, detail="Línea de WhatsApp no válida")
    return str(linea["id"])


def _linea_para_plantillas(token: TokenData, db: Session, linea_id: Optional[int]) -> int:
    """Las plantillas viven a nivel de línea: siempre se necesita una concreta."""
    phone_number_id = _phone_number_id_para(token, db, linea_id)
    if phone_number_id is None:
        raise HTTPException(status_code=400, detail="Selecciona una línea de WhatsApp")
    return int(phone_number_id)


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
    linea_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    phone_number_id = _phone_number_id_para(token, db, linea_id)
    return WhatsappService.listar_conversaciones(page, limit, phone_number_id)


@router.get("/buscar")
def buscar(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(20, ge=1, le=25),
    linea_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    """Búsqueda híbrida (contactos + texto de mensajes) acotada a la línea del usuario."""
    phone_number_id = _phone_number_id_para(token, db, linea_id)
    return WhatsappService.buscar(q, limit, phone_number_id)


@router.get("/lineas")
def listar_lineas(token: TokenData = Depends(require_auth)):
    """
    Líneas de WhatsApp disponibles para el selector -- solo GERENCIA/ADMINISTRADOR.
    Los vendedores no lo necesitan: ya tienen su línea fija.
    """
    if token.role == RoleEnum.VENDEDOR.value:
        raise HTTPException(status_code=403, detail="No tienes acceso al selector de líneas")
    return {"lineas": LINEAS_WHATSAPP}


@router.get("/bot/estado")
def estado_bot(_: TokenData = Depends(require_auth)):
    """Si el bot de saludo/consultas fuera de horario está activo ahora
    mismo (mismo horario para las dos líneas, ver integrations/bot/schedule.py)."""
    return {"activo": esta_en_horario_bot()}


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


# ─── Plantillas ──────────────────────────────────────────────────────────────

@router.get("/plantillas")
def listar_plantillas(
    linea_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    return WhatsappService.listar_plantillas(_linea_para_plantillas(token, db, linea_id))


@router.post("/plantillas", status_code=201)
def crear_plantilla(
    body: CrearPlantillaRequest,
    linea_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    return WhatsappService.crear_plantilla(
        _linea_para_plantillas(token, db, linea_id), body.model_dump()
    )


@router.post("/plantillas/sincronizar")
def sincronizar_plantillas(
    linea_id: Optional[int] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    return WhatsappService.sincronizar_plantillas(_linea_para_plantillas(token, db, linea_id))


@router.post("/mensajes/plantilla")
def enviar_plantilla(
    body: EnviarPlantillaRequest,
    _: TokenData = Depends(require_auth),
):
    return WhatsappService.enviar_plantilla(**body.model_dump())
