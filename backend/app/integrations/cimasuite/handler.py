"""
Traduce los eventos que llegan por el WS de CimAPI a una señal mínima
para el frontend, vía app.realtime.manager. Electromanfer no tiene
espejo local de leads/contactos -- a diferencia de Hospedia, este
handler no crea ni actualiza ninguna entidad propia, solo decide a
qué usuarios avisar y reenvía el aviso.
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.integrations.cimasuite import almacen_chat
from app.integrations.cimasuite.client import WhatsappService
from app.models.usuarios import Usuarios
from app.models.asesor_lineas import AsesorLinea
from app.enums import RoleEnum
from app.realtime.manager import realtime_manager
from app.integrations.bot.service import procesar_mensaje_entrante

logger = logging.getLogger(__name__)

EVENTOS_RELEVANTES = {"message.received", "conversation.opened"}


def _usuarios_a_notificar(phone_number_id, db: Session) -> list[int]:
    """
    GERENCIA/ADMINISTRADOR: siempre se avisan, sin filtro por línea.
    VENDEDOR: solo si tiene esa línea asignada en asesor_lineas
    (varios vendedores pueden compartir la misma línea).
    """
    sin_filtro = (
        db.query(Usuarios.id)
        .filter(Usuarios.rol != RoleEnum.VENDEDOR.value, Usuarios.activo.is_(True))
        .all()
    )
    ids = [u.id for u in sin_filtro]

    if phone_number_id is not None:
        con_linea = (
            db.query(AsesorLinea.usuario_id)
            .filter(AsesorLinea.phone_number_id == str(phone_number_id))
            .all()
        )
        ids.extend(a.usuario_id for a in con_linea)

    return list(set(ids))


def _guardar_estado(data: dict) -> None:
    db = SessionLocal()
    try:
        almacen_chat.actualizar_estado(db, data)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo guardar el estado del mensaje")
    finally:
        db.close()


async def handle_cimapi_event(event: str, data: dict) -> None:
    if event == "message.status":
        # El estado de un mensaje enviado (entregado, leído, fallido). No hay aviso al
        # frontend: solo se guarda, y solo con el guardado local encendido.
        if settings.CHAT_GUARDAR_LOCAL:
            await asyncio.to_thread(_guardar_estado, data)
        return
    if event not in EVENTOS_RELEVANTES:
        logger.debug("Evento CimAPI no manejado: %s", event)
        return

    phone_number_id = data.get("phone_number_id")
    conversation_id = data.get("conversation_id")

    if settings.CHAT_GUARDAR_LOCAL and event == "message.received":
        # Se guarda en las tablas propias antes de avisar. Aislado: si falla, el aviso y el
        # bot siguen funcionando como siempre. Con CHAT_LEER_LOCAL el id de la conversación
        # es el local, que es el que ven el frontend y el bot.
        local_id = await asyncio.to_thread(_guardar_local, data)
        if settings.CHAT_LEER_LOCAL and local_id is not None:
            conversation_id = local_id

    # BD y bot son síncronos: en un hilo, para que el WebSocket siga leyendo
    # (y respondiendo pings) mientras tanto. Se espera a que terminen: así el
    # cursor solo avanza cuando el bot ya contestó, y dos mensajes seguidos
    # del mismo cliente no generan dos respuestas en paralelo.
    usuario_ids = await asyncio.to_thread(_usuarios_a_notificar_en_sesion, phone_number_id)

    if usuario_ids:
        # Señal mínima -- el frontend dispara un fetch puntual al endpoint
        # REST correspondiente, no se manda el contenido del mensaje por WS.
        payload = {
            "type": event,
            "conversation_id": conversation_id,
        }
        await realtime_manager.send_to_users(usuario_ids, payload)
        logger.info(
            "Evento CimAPI reenviado | event=%s | conversation_id=%s | usuarios=%s",
            event, conversation_id, usuario_ids,
        )

    if event == "message.received" and (data.get("message") or {}).get("direction") == "inbound":
        await asyncio.to_thread(procesar_mensaje_entrante, phone_number_id, conversation_id)


def _guardar_local(data: dict) -> int | None:
    """Guarda el mensaje del evento y devuelve el id local de su conversación."""
    db = SessionLocal()
    try:
        resultado = almacen_chat.guardar_mensaje(db, data)
        db.commit()
        if resultado is None:
            return None
        conversacion, mensaje = resultado
        local_id = conversacion.id
        if mensaje is not None and mensaje.media_id:
            # Copiar el archivo no frena el evento: si falla, queda pendiente.
            almacen_chat.copiar_archivo(db, mensaje.id, WhatsappService.descargar_media)
        return local_id
    except Exception:
        db.rollback()
        logger.exception("No se pudo guardar el mensaje en las tablas propias")
        return None
    finally:
        db.close()


def _usuarios_a_notificar_en_sesion(phone_number_id) -> list[int]:
    db = SessionLocal()
    try:
        return _usuarios_a_notificar(phone_number_id, db)
    finally:
        db.close()
