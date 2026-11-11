"""Copia el historial de WhatsApp que CimaSuite guarda a las tablas propias de Electromanfer.

Conserva el id de cada conversación de CimaSuite, para que `bot_chats_desactivados` y el
frontend sigan funcionando con los mismos números. Si un cliente quedó partido en dos
conversaciones de la misma línea (pasaba con el "+" del teléfono), se unen en la primera y
el resumen lo avisa. Se puede repetir sin duplicar nada: cada mensaje se identifica por su
id de WhatsApp y por su id en CimaSuite.

Solo LEE de CimaSuite. Escribe únicamente en las tablas whatsapp_* y en la carpeta de
archivos de Electromanfer. Uso: app/scripts/copiar_historial_cimasuite.py
"""
import logging
from dataclasses import dataclass, field

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.integrations.cimasuite import almacen_chat, archivos_whatsapp
from app.models.whatsapp_chat import WhatsAppConversacion, WhatsAppMensaje

logger = logging.getLogger(__name__)
POR_PAGINA_CONVERSACIONES = 100
POR_PAGINA_MENSAJES = 200


@dataclass
class Resumen:
    conversaciones: int = 0
    mensajes_leidos: int = 0
    mensajes_nuevos: int = 0
    archivos_copiados: int = 0
    archivos_fallidos: int = 0
    # id de CimaSuite -> id local, solo de las conversaciones que se unieron a otra
    unidas: dict[int, int] = field(default_factory=dict)
    # id local -> (mensajes que CimaSuite dice tener, mensajes guardados aquí)
    conteos: dict[int, tuple[int, int]] = field(default_factory=dict)

    def diferencias(self) -> dict[int, tuple[int, int]]:
        return {i: c for i, c in self.conteos.items() if c[0] != c[1]}


def _todas_las_conversaciones(cliente) -> list[dict]:
    primera = cliente.listar_conversaciones(page=1, limit=POR_PAGINA_CONVERSACIONES)
    conversaciones = list(primera["data"])
    for pagina in range(2, primera["pagination"]["pages"] + 1):
        conversaciones += cliente.listar_conversaciones(page=pagina, limit=POR_PAGINA_CONVERSACIONES)["data"]
    return conversaciones


def _mensajes_de(cliente, conversation_id: int) -> list[dict]:
    primera = cliente.obtener_mensajes(conversation_id, page=1, limit=POR_PAGINA_MENSAJES)
    mensajes = list(primera["messages"])
    for pagina in range(2, primera["pagination"]["pages"] + 1):
        mensajes += cliente.obtener_mensajes(conversation_id, page=pagina, limit=POR_PAGINA_MENSAJES)["messages"]
    return mensajes


def _conversacion_local(db: Session, c: dict, solo_verificar: bool) -> tuple[WhatsAppConversacion | None, bool]:
    """(conversación local, se unió a otra). Con el mismo id si es posible."""
    existente = db.get(WhatsAppConversacion, c["id"])
    telefono = almacen_chat.solo_digitos(c["contact"]["whatsapp_number"])
    linea = int((c.get("phone_number") or {}).get("id"))
    if existente is not None:
        return existente, False
    contacto = None
    if solo_verificar:
        from app.models.whatsapp_chat import WhatsAppContacto
        contacto = db.execute(select(WhatsAppContacto).where(WhatsAppContacto.telefono == telefono)).scalar_one_or_none()
        if contacto is None:
            return None, False
    else:
        contacto = almacen_chat.obtener_o_crear_contacto(db, telefono, c["contact"].get("name"))
    mismo_par = db.execute(
        select(WhatsAppConversacion).where(
            WhatsAppConversacion.contacto_id == contacto.id, WhatsAppConversacion.phone_number_id == linea
        )
    ).scalar_one_or_none()
    if mismo_par is not None:
        return mismo_par, True
    if solo_verificar:
        return None, False
    db.execute(
        insert(WhatsAppConversacion).values(
            id=c["id"], contacto_id=contacto.id, phone_number_id=linea,
            is_pinned=bool(c.get("is_pinned")), is_muted=bool(c.get("is_muted")),
            is_archived=bool(c.get("is_archived")), is_priority=bool(c.get("is_priority")),
        )
    )
    return db.get(WhatsAppConversacion, c["id"]), False


def _insertar(db: Session, conversacion_id: int, m: dict) -> int | None:
    saliente = m.get("direction") != "inbound"
    creado = almacen_chat._fecha(m.get("created_at"))
    wamid = m.get("whatsapp_message_id")
    existente = None
    if wamid:
        existente = db.scalar(select(WhatsAppMensaje.id).where(WhatsAppMensaje.whatsapp_message_id == wamid))
    if existente is None:
        existente = db.scalar(select(WhatsAppMensaje.id).where(WhatsAppMensaje.cimasuite_mensaje_id == m.get("id")))
    if existente is not None:
        # Anota el id de CimaSuite en el que llegó por evento, para poder cruzarlos.
        db.execute(
            text("UPDATE whatsapp_mensajes SET cimasuite_mensaje_id = :c WHERE id = :i AND cimasuite_mensaje_id IS NULL"),
            {"c": m.get("id"), "i": existente},
        )
        return None
    return db.execute(
        insert(WhatsAppMensaje).values(
            conversacion_id=conversacion_id, whatsapp_message_id=wamid, cimasuite_mensaje_id=m.get("id"),
            direccion="outbound" if saliente else "inbound", tipo=m.get("type") or m.get("message_type") or "text",
            contenido=m.get("content"), datos=m.get("data"), media_id=m.get("media_id"),
            media_nombre=m.get("media_filename"), plantilla_nombre=m.get("template_name"),
            plantilla_componentes=m.get("template_components"),
            estado=m.get("status") if saliente else None, error=m.get("error"),
            creado_en=creado, leido_en=creado,  # lo entrante sin leer se ajusta al final
            enviado_por_usuario_id=None, enviado_por_bot=False,
        ).returning(WhatsAppMensaje.id)
    ).scalar_one()


def _recalcular(db: Session, conversacion_id: int, sin_leer: int) -> None:
    """Deja la conversación coherente con sus mensajes: el último, cuándo escribió el
    cliente por última vez y cuántos entrantes siguen sin leer (según CimaSuite)."""
    db.execute(
        text("UPDATE whatsapp_mensajes SET leido_en = creado_en WHERE conversacion_id = :c AND direccion = 'inbound'"),
        {"c": conversacion_id},
    )
    if sin_leer:
        db.execute(
            text(
                "UPDATE whatsapp_mensajes SET leido_en = NULL WHERE id IN ("
                " SELECT id FROM whatsapp_mensajes WHERE conversacion_id = :c AND direccion = 'inbound'"
                " ORDER BY creado_en DESC, id DESC LIMIT :n)"
            ),
            {"c": conversacion_id, "n": sin_leer},
        )
    db.execute(
        text(
            "UPDATE whatsapp_conversaciones SET "
            " ultimo_mensaje_id = (SELECT id FROM whatsapp_mensajes WHERE conversacion_id = :c ORDER BY creado_en DESC, id DESC LIMIT 1), "
            " ultimo_mensaje_en = (SELECT max(creado_en) FROM whatsapp_mensajes WHERE conversacion_id = :c), "
            " ultimo_entrante_en = (SELECT max(creado_en) FROM whatsapp_mensajes WHERE conversacion_id = :c AND direccion = 'inbound'), "
            " no_leidos = (SELECT count(*) FROM whatsapp_mensajes WHERE conversacion_id = :c AND direccion = 'inbound' AND leido_en IS NULL) "
            "WHERE id = :c"
        ),
        {"c": conversacion_id},
    )


def _ajustar_secuencias(db: Session) -> None:
    """Tras insertar ids explícitos, las secuencias deben seguir desde el mayor."""
    for tabla in ("whatsapp_contactos", "whatsapp_conversaciones", "whatsapp_mensajes"):
        db.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{tabla}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM {tabla}), 1))"
        ))


def copiar_historial(
    cliente, fabrica_sesiones, con_archivos: bool = True, solo_verificar: bool = False, conversacion_id: int | None = None
) -> Resumen:
    """`cliente` ofrece listar_conversaciones, obtener_mensajes y descargar_media
    (WhatsappService, sobre la API de CimaSuite)."""
    resumen = Resumen()
    esperados: dict[int, int] = {}
    for c in _todas_las_conversaciones(cliente):
        if conversacion_id is not None and c["id"] != conversacion_id:
            continue
        resumen.conversaciones += 1
        db = fabrica_sesiones()
        try:
            local, unida = _conversacion_local(db, c, solo_verificar)
            mensajes = _mensajes_de(cliente, c["id"])
            resumen.mensajes_leidos += len(mensajes)
            if local is None:  # solo verificar y aún no existe aquí
                resumen.conteos[c["id"]] = (c.get("total_messages") or len(mensajes), 0)
                continue
            if unida:
                resumen.unidas[c["id"]] = local.id
            esperados[local.id] = esperados.get(local.id, 0) + (c.get("total_messages") or len(mensajes))
            if solo_verificar:
                guardados = db.scalar(select(func.count()).select_from(WhatsAppMensaje).where(WhatsAppMensaje.conversacion_id == local.id))
                resumen.conteos[local.id] = (esperados[local.id], guardados or 0)
                continue
            for m in mensajes:
                nuevo = _insertar(db, local.id, m)
                if nuevo is not None:
                    resumen.mensajes_nuevos += 1
            _recalcular(db, local.id, c.get("unread_count") or 0)
            db.commit()
            guardados = db.scalar(select(func.count()).select_from(WhatsAppMensaje).where(WhatsAppMensaje.conversacion_id == local.id))
            resumen.conteos[local.id] = (esperados[local.id], guardados or 0)
        finally:
            db.close()

    if not solo_verificar:
        db = fabrica_sesiones()
        try:
            _ajustar_secuencias(db)
            db.commit()
            if con_archivos and archivos_whatsapp.configurado():
                # Todos los que traen archivo y aún no lo tienen copiado: los de esta corrida y
                # los que quedaron pendientes en una anterior (descarga fallida o sin anotar).
                pendientes = db.execute(
                    select(WhatsAppMensaje.id).where(
                        WhatsAppMensaje.media_id.is_not(None), WhatsAppMensaje.media_clave.is_(None)
                    ).order_by(WhatsAppMensaje.id)
                ).scalars().all()
                for mensaje_id in pendientes:
                    if almacen_chat.copiar_archivo(db, mensaje_id, cliente.descargar_media):
                        resumen.archivos_copiados += 1
                    else:
                        resumen.archivos_fallidos += 1
        finally:
            db.close()
    return resumen
