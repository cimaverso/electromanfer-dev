"""
Traduce los eventos que llegan por el WS de CimAPI a una señal mínima
para el frontend, vía app.realtime.manager. Electromanfer no tiene
espejo local de leads/contactos -- a diferencia de Hospedia, este
handler no crea ni actualiza ninguna entidad propia, solo decide a
qué usuarios avisar y reenvía el aviso.
"""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models.usuarios import Usuarios
from app.models.asesor_lineas import AsesorLinea
from app.enums import RoleEnum
from app.realtime.manager import realtime_manager

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


async def handle_cimapi_event(event: str, data: dict) -> None:
    if event not in EVENTOS_RELEVANTES:
        logger.debug("Evento CimAPI no manejado: %s", event)
        return

    phone_number_id = data.get("phone_number_id")
    conversation_id = data.get("conversation_id")

    db = SessionLocal()
    try:
        usuario_ids = _usuarios_a_notificar(phone_number_id, db)
    finally:
        db.close()

    if not usuario_ids:
        return

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
