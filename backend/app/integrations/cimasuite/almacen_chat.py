"""Guarda en Electromanfer el chat de WhatsApp que cimapi entrega por eventos.

Cimapi no guarda contactos, conversaciones ni mensajes: cada mensaje llega como
evento y se guarda aquí (contactos, conversaciones y mensajes). Repetir un evento no
duplica nada: el id de WhatsApp es único. El archivo de un mensaje se copia al
servidor de Electromanfer porque Meta lo borra a los 30 días.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.integrations.cimasuite import archivos_whatsapp
from app.models.whatsapp_chat import WhatsAppContacto, WhatsAppConversacion, WhatsAppMensaje

logger = logging.getLogger(__name__)

# Un estado nuevo solo reemplaza a uno anterior si avanza (Meta no garantiza el orden).
RANGO_ESTADO = {"pending": 0, "sent": 1, "failed": 2, "delivered": 3, "read": 4}


def solo_digitos(telefono: str | None) -> str:
    return "".join(c for c in (telefono or "") if c.isdigit())


def _fecha(valor: str | None) -> datetime:
    try:
        f = datetime.fromisoformat(valor) if valor else None
    except ValueError:
        f = None
    if f is None:
        return datetime.now(timezone.utc)
    return f if f.tzinfo else f.replace(tzinfo=timezone.utc)


def obtener_o_crear_contacto(db: Session, telefono: str, nombre: str | None) -> WhatsAppContacto:
    telefono = solo_digitos(telefono)
    db.execute(
        insert(WhatsAppContacto)
        .values(telefono=telefono, nombre=nombre)
        .on_conflict_do_nothing(index_elements=["telefono"])
    )
    contacto = db.execute(select(WhatsAppContacto).where(WhatsAppContacto.telefono == telefono)).scalar_one()
    # El nombre del perfil solo rellena un hueco: no pisa uno ya conocido.
    if nombre and not contacto.nombre:
        contacto.nombre = nombre
    return contacto


def obtener_o_crear_conversacion(db: Session, contacto_id: int, phone_number_id: int) -> WhatsAppConversacion:
    db.execute(
        insert(WhatsAppConversacion)
        .values(contacto_id=contacto_id, phone_number_id=phone_number_id)
        .on_conflict_do_nothing(constraint="uq_whatsapp_conversacion_contacto_linea")
    )
    return db.execute(
        select(WhatsAppConversacion).where(
            WhatsAppConversacion.contacto_id == contacto_id,
            WhatsAppConversacion.phone_number_id == phone_number_id,
        )
    ).scalar_one()


def guardar_mensaje(
    db: Session, data: dict, usuario_id: int | None = None, por_bot: bool = False
) -> tuple[WhatsAppConversacion, WhatsAppMensaje | None] | None:
    """Guarda el mensaje de un evento `message.received` (entrante o saliente) y
    actualiza la conversación. Devuelve (conversación, mensaje nuevo); el mensaje es
    None si ya estaba guardado. None si el evento no trae contacto o línea."""
    m = data.get("message") or {}
    contacto_data = data.get("contact") or {}
    telefono = solo_digitos(contacto_data.get("whatsapp_number"))
    phone_number_id = data.get("phone_number_id")
    if not telefono or phone_number_id is None:
        return None

    contacto = obtener_o_crear_contacto(db, telefono, contacto_data.get("name"))
    conversacion = obtener_o_crear_conversacion(db, contacto.id, int(phone_number_id))

    wamid = m.get("whatsapp_message_id")
    direccion = m.get("direction") or "inbound"
    saliente = direccion != "inbound"
    creado = _fecha(m.get("created_at"))
    valores = {
        "conversacion_id": conversacion.id,
        "whatsapp_message_id": wamid,
        "direccion": "outbound" if saliente else "inbound",
        "tipo": m.get("type") or "text",
        "contenido": m.get("content"),
        "datos": m.get("data"),
        "media_id": m.get("media_id"),
        "media_nombre": m.get("media_filename"),
        "plantilla_nombre": m.get("template_name"),
        "plantilla_componentes": m.get("template_components"),
        "estado": (m.get("status") or "sent") if saliente else None,
        "error": m.get("error"),
        "creado_en": creado,
        # Lo que escribe el equipo no queda "sin leer".
        "leido_en": creado if saliente else None,
        "enviado_por_usuario_id": usuario_id,
        "enviado_por_bot": por_bot,
    }
    stmt = insert(WhatsAppMensaje).values(**valores)
    if wamid:
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["whatsapp_message_id"],
            index_where=text("whatsapp_message_id IS NOT NULL"),
        )
    mensaje_id = db.execute(stmt.returning(WhatsAppMensaje.id)).scalar_one_or_none()
    if mensaje_id is None:
        return conversacion, None

    # El último mensaje solo avanza, nunca retrocede; lo no leído solo cuenta lo entrante.
    db.execute(
        update(WhatsAppConversacion)
        .where(WhatsAppConversacion.id == conversacion.id)
        .values(
            ultimo_mensaje_id=text(
                "CASE WHEN ultimo_mensaje_en IS NULL OR :c >= ultimo_mensaje_en "
                "THEN :m ELSE ultimo_mensaje_id END"
            ).bindparams(c=creado, m=mensaje_id),
            ultimo_mensaje_en=func.greatest(WhatsAppConversacion.ultimo_mensaje_en, creado),
            ultimo_entrante_en=(
                WhatsAppConversacion.ultimo_entrante_en
                if saliente
                else func.greatest(WhatsAppConversacion.ultimo_entrante_en, creado)
            ),
            no_leidos=WhatsAppConversacion.no_leidos + (0 if saliente else 1),
            # Si el contacto vuelve a escribir, una conversación "eliminada" reaparece.
            eliminada=False if not saliente else WhatsAppConversacion.eliminada,
        )
    )
    db.refresh(conversacion)
    return conversacion, db.get(WhatsAppMensaje, mensaje_id)


def actualizar_estado(db: Session, data: dict) -> bool:
    """Evento `message.status`: el mensaje enviado se entregó, se leyó o falló.
    Solo avanza; un aviso tardío no retrocede el estado."""
    wamid = data.get("whatsapp_message_id")
    nuevo = data.get("status")
    if not wamid or nuevo not in RANGO_ESTADO:
        return False
    actual = db.execute(
        select(WhatsAppMensaje.id, WhatsAppMensaje.estado).where(WhatsAppMensaje.whatsapp_message_id == wamid)
    ).first()
    if actual is None or RANGO_ESTADO[nuevo] <= RANGO_ESTADO.get(actual.estado or "pending", 0):
        return False
    db.execute(
        update(WhatsAppMensaje)
        .where(WhatsAppMensaje.id == actual.id)
        .values(estado=nuevo, error=data.get("error") if nuevo == "failed" else None)
    )
    return True


def guardar_archivo(db: Session, mensaje_id: int, contenido: bytes, mime: str, nombre: str | None = None) -> bool:
    """Guarda los bytes de un mensaje en el servidor y anota su clave."""
    if not archivos_whatsapp.configurado():
        return False
    m = db.get(WhatsAppMensaje, mensaje_id)
    if m is None or m.media_clave:
        return False
    mime = (mime or "application/octet-stream").split(";")[0].strip()
    clave = archivos_whatsapp.clave_archivo(
        m.conversacion_id, m.whatsapp_message_id or f"m{m.id}", mime, nombre or m.media_nombre
    )
    archivos_whatsapp.guardar(clave, contenido)
    m.media_clave, m.media_mime = clave, mime
    if nombre and not m.media_nombre:
        m.media_nombre = nombre
    return True


def copiar_archivo(db: Session, mensaje_id: int, descargar) -> bool:
    """Copia el archivo del mensaje al servidor. `descargar(media_id)` baja los bytes
    de cimapi y devuelve (bytes, tipo). Si falla, el mensaje queda sin copia (media_clave
    NULL) y se puede reintentar; nunca rompe el chat."""
    if not archivos_whatsapp.configurado():
        return False
    try:
        m = db.get(WhatsAppMensaje, mensaje_id)
        if m is None or not m.media_id or m.media_clave:
            return False
        contenido, mime = descargar(m.media_id)
        copiado = guardar_archivo(db, mensaje_id, contenido, mime or "")
        db.commit()
        return copiado
    except Exception:
        db.rollback()
        logger.exception("No se pudo copiar el archivo del mensaje %s al servidor", mensaje_id)
        return False


def guardar_envio(
    db: Session, conversation_id: int, respuesta: dict, usuario_id: int | None,
    por_bot: bool = False, archivo: tuple[bytes, str, str] | None = None,
) -> None:
    """Guarda lo que Electromanfer acaba de enviar por cimapi. Cimapi devuelve
    {"status", "message": {...}}. `archivo` = (bytes, tipo, nombre) del adjunto: ya se tiene,
    así que va directo al servidor sin descargarlo. Nunca lanza: el mensaje ya salió y quien lo
    envió no debe ver un error por no poder guardarlo."""
    try:
        conv = db.get(WhatsAppConversacion, conversation_id)
        if conv is None:
            return
        contacto = db.get(WhatsAppContacto, conv.contacto_id)
        data = {
            "phone_number_id": conv.phone_number_id,
            "contact": {"whatsapp_number": contacto.telefono, "name": contacto.nombre},
            "message": {**(respuesta.get("message") or {}), "direction": "outbound"},
        }
        resultado = guardar_mensaje(db, data, usuario_id, por_bot)
        db.commit()
        if resultado is None or resultado[1] is None:
            return
        mensaje = resultado[1]
        if archivo and archivos_whatsapp.configurado():
            contenido, mime, nombre = archivo
            guardar_archivo(db, mensaje.id, contenido, mime, nombre)
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo guardar el mensaje enviado en las tablas propias")
