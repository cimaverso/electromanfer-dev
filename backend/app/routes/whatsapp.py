from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.integrations.cimasuite.client import WhatsappService
from app.integrations.bot.config import (
    actualizar_config,
    bot_activo_ahora,
    cambiar_override_linea,
    modo_linea,
    obtener_config,
    recargar_saldo,
)
from app.integrations.bot.uso import resumen_uso
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
from app.schemas.bot import (
    BotChatFlagRequest,
    BotConfigResponse,
    BotConfigUpdate,
    BotLineaOverrideRequest,
    BotRecargaRequest,
    BotUsoResponse,
)
from app.core.security import require_auth
from app.core.db import get_db
from app.models.asesor_lineas import AsesorLinea
from app.models.bot_chat_desactivado import BotChatDesactivado
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


def _requerir_gerencia_o_admin(token: TokenData) -> None:
    """Control del asistente de IA y sus créditos: mismo criterio que el
    selector de líneas, solo GERENCIA/ADMINISTRADOR."""
    if token.role == RoleEnum.VENDEDOR.value:
        raise HTTPException(status_code=403, detail="No tienes acceso al asistente de IA")


def _config_a_response(db: Session, config) -> BotConfigResponse:
    lineas = [
        {
            "id": linea["id"],
            "nombre": linea["nombre"],
            "modo": modo_linea(config, str(linea["id"])),
            "activo_ahora": bot_activo_ahora(db, str(linea["id"])),
        }
        for linea in LINEAS_WHATSAPP
    ]
    return BotConfigResponse(
        horario_activo=config.horario_activo,
        horario_reglas=config.horario_reglas,
        saldo_usd=float(config.saldo_usd or 0),
        instrucciones_extra=config.instrucciones_extra or "",
        lineas=lineas,
    )


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
    resultado = WhatsappService.listar_conversaciones(page, limit, phone_number_id)

    ids = [c["id"] for c in resultado.get("data", []) if "id" in c]
    desactivados = set()
    if ids:
        desactivados = {
            fila.conversation_id
            for fila in db.query(BotChatDesactivado.conversation_id)
            .filter(BotChatDesactivado.conversation_id.in_(ids))
            .all()
        }
    for conversacion in resultado.get("data", []):
        conversacion["bot_desactivado"] = conversacion.get("id") in desactivados

    return resultado


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
def estado_bot(db: Session = Depends(get_db), _: TokenData = Depends(require_auth)):
    """Si el bot de saludo/consultas fuera de horario está activo ahora mismo
    en AL MENOS UNA línea (el horario y el saldo son compartidos; el apagado
    manual es por línea, ver integrations/bot/config.py). `saldo_agotado`
    avisa que el asistente está apagado por falta de saldo prepago."""
    config = obtener_config(db)
    activo = any(bot_activo_ahora(db, str(linea["id"])) for linea in LINEAS_WHATSAPP)
    saldo_agotado = float(config.saldo_usd or 0) <= 0
    return {"activo": activo, "saldo_agotado": saldo_agotado}


@router.get("/bot/config", response_model=BotConfigResponse)
def obtener_config_bot(db: Session = Depends(get_db), token: TokenData = Depends(require_auth)):
    _requerir_gerencia_o_admin(token)
    return _config_a_response(db, obtener_config(db))


@router.put("/bot/config", response_model=BotConfigResponse)
def actualizar_config_bot(
    body: BotConfigUpdate,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    _requerir_gerencia_o_admin(token)
    try:
        config = actualizar_config(
            db,
            horario_activo=body.horario_activo,
            horario_reglas=body.horario_reglas,
            instrucciones_extra=body.instrucciones_extra,
            actualizado_por_id=token.user_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return _config_a_response(db, config)


@router.patch("/bot/lineas/{linea_id}/override", response_model=BotConfigResponse)
def cambiar_override_linea_bot(
    linea_id: int,
    body: BotLineaOverrideRequest,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    """Prende/apaga el asistente manualmente para una línea puntual (badge
    "Control del asistente" en la pantalla de Asistente de IA)."""
    _requerir_gerencia_o_admin(token)
    linea = next((l for l in LINEAS_WHATSAPP if l["id"] == linea_id), None)
    if not linea:
        raise HTTPException(status_code=400, detail="Línea de WhatsApp no válida")
    config = cambiar_override_linea(db, str(linea_id), body.modo, actualizado_por_id=token.user_id)
    return _config_a_response(db, config)


@router.post("/bot/saldo/recargar", response_model=BotConfigResponse)
def recargar_saldo_bot(
    body: BotRecargaRequest,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    """Acredita saldo prepago al asistente (representa una plata que ya
    recibieron por fuera, ej. una transferencia). No toca la cuenta de
    Anthropic -- esto es un saldo interno que controla si el bot puede
    seguir respondiendo, ver bot/config.py:bot_activo_ahora."""
    _requerir_gerencia_o_admin(token)
    try:
        config = recargar_saldo(db, body.monto, actualizado_por_id=token.user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    return _config_a_response(db, config)


@router.get("/bot/uso", response_model=BotUsoResponse)
def obtener_uso_bot(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    _requerir_gerencia_o_admin(token)
    hasta = hasta or date.today()
    desde = desde or (hasta - timedelta(days=29))
    return resumen_uso(db, desde, hasta)


@router.patch("/conversaciones/{conversation_id}/bot")
def actualizar_bot_chat(
    conversation_id: int,
    body: BotChatFlagRequest,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    _requerir_gerencia_o_admin(token)
    fila = db.get(BotChatDesactivado, conversation_id)
    if body.desactivado and fila is None:
        db.add(BotChatDesactivado(conversation_id=conversation_id, desactivado_por_id=token.user_id))
        db.commit()
    elif not body.desactivado and fila is not None:
        db.delete(fila)
        db.commit()
    return {"conversation_id": conversation_id, "bot_desactivado": body.desactivado}


@router.get("/conversaciones/{conversation_id}/mensajes", response_model=MensajesResponse)
def obtener_mensajes(
    conversation_id: int,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth),
):
    resultado = WhatsappService.obtener_mensajes(conversation_id, page, limit)
    resultado["bot_desactivado"] = db.get(BotChatDesactivado, conversation_id) is not None
    return resultado


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
