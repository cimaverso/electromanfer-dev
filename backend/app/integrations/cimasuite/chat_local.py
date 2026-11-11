"""Lecturas y acciones del chat de WhatsApp desde las tablas propias (CHAT_LEER_LOCAL).

Devuelven la MISMA forma que antes entregaba la API (conversaciones, mensajes, búsqueda),
así el frontend no cambia. Una "conversación" es un contacto en una línea.
"""
from datetime import datetime, timezone
from math import ceil

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.whatsapp_chat import WhatsAppContacto, WhatsAppConversacion, WhatsAppMensaje

VENTANA_24H_SEGUNDOS = 24 * 3600
FLAGS = ("is_pinned", "is_muted", "is_archived", "is_priority")


def _iso(valor) -> str | None:
    return valor.isoformat() if valor else None


def _contacto_dict(c: WhatsAppContacto) -> dict:
    return {
        "id": c.id, "name": c.nombre, "whatsapp_number": c.telefono,
        "tags": [], "status": None, "notes": None, "email": None,
    }


def _telefono_dict(c: WhatsAppContacto) -> dict:
    return {"id": c.id, "phone": c.telefono, "tags": [], "notes": None}


def _mensaje_dict(m: WhatsAppMensaje) -> dict:
    return {
        "id": m.id, "conversation_id": m.conversacion_id, "direction": m.direccion, "type": m.tipo,
        "content": m.contenido, "data": m.datos, "error": m.error, "media_id": m.media_id,
        "media_filename": m.media_nombre, "template_name": m.plantilla_nombre,
        "template_components": m.plantilla_componentes, "whatsapp_message_id": m.whatsapp_message_id,
        "status": m.estado, "created_at": _iso(m.creado_en), "sent_by_user_id": m.enviado_por_usuario_id,
        "sent_by_name": None, "sent_by_avatar_url": None, "is_edited": False, "is_revoked": False,
        "reaction_emoji": None, "sent_by_bot": m.enviado_por_bot,
    }


def _abierta(conv: WhatsAppConversacion) -> bool:
    """WhatsApp deja escribir libremente solo dentro de las 24 h del último mensaje del cliente."""
    if conv.ultimo_entrante_en is None:
        return False
    return (datetime.now(timezone.utc) - conv.ultimo_entrante_en).total_seconds() < VENTANA_24H_SEGUNDOS


def _ultimo_visible(db: Session, conv: WhatsAppConversacion) -> WhatsAppMensaje | None:
    """El último mensaje, salvo que la conversación se haya vaciado después de él."""
    if conv.ultimo_mensaje_id is None:
        return None
    m = db.get(WhatsAppMensaje, conv.ultimo_mensaje_id)
    if m and conv.vaciada_hasta is not None and m.creado_en <= conv.vaciada_hasta:
        return None
    return m


def _filtros_visibles(conv: WhatsAppConversacion) -> list:
    filtros = [WhatsAppMensaje.conversacion_id == conv.id]
    if conv.vaciada_hasta is not None:
        filtros.append(WhatsAppMensaje.creado_en > conv.vaciada_hasta)
    return filtros


def _paginacion(page: int, limit: int, total: int) -> dict:
    return {"page": page, "limit": limit, "total": total, "pages": max(1, ceil(total / limit)) if limit else 1}


def _conversacion_dict(db: Session, conv: WhatsAppConversacion, contacto: WhatsAppContacto, nombre_linea: str | None) -> dict:
    ultimo = _ultimo_visible(db, conv)
    total = db.scalar(select(func.count()).select_from(WhatsAppMensaje).where(*_filtros_visibles(conv)))
    return {
        "id": conv.id, "is_open": _abierta(conv), "is_archived": conv.is_archived, "is_priority": conv.is_priority,
        "is_pinned": conv.is_pinned, "is_muted": conv.is_muted, "ai_enabled": False,
        "created_at": _iso(conv.creado_en), "updated_at": _iso(conv.ultimo_mensaje_en or conv.creado_en),
        "contact": _contacto_dict(contacto), "contact_phone": _telefono_dict(contacto),
        "phone_number": {"id": conv.phone_number_id, "display_name": nombre_linea},
        "total_messages": total or 0, "unread_count": conv.no_leidos if ultimo is not None else 0,
        "last_read_at": None,
        "last_message": None if ultimo is None else {
            "content": ultimo.contenido, "media_id": ultimo.media_id, "media_filename": ultimo.media_nombre,
            "message_type": ultimo.tipo, "template_name": ultimo.plantilla_nombre,
            "direction": ultimo.direccion, "status": ultimo.estado, "created_at": _iso(ultimo.creado_en),
        },
    }


def listar_conversaciones(
    db: Session, page: int, limit: int, phone_number_id: str | None, nombres_lineas: dict[int, str]
) -> dict:
    filtros = [WhatsAppConversacion.eliminada.is_(False), WhatsAppConversacion.is_archived.is_(False)]
    if phone_number_id is not None:
        filtros.append(WhatsAppConversacion.phone_number_id == int(phone_number_id))
    total = db.scalar(select(func.count()).select_from(WhatsAppConversacion).where(*filtros)) or 0
    filas = db.execute(
        select(WhatsAppConversacion, WhatsAppContacto)
        .join(WhatsAppContacto, WhatsAppContacto.id == WhatsAppConversacion.contacto_id)
        .where(*filtros)
        .order_by(WhatsAppConversacion.ultimo_mensaje_en.desc().nulls_last(), WhatsAppConversacion.id.desc())
        .offset((page - 1) * limit).limit(limit)
    ).all()
    return {
        "data": [_conversacion_dict(db, c, ct, nombres_lineas.get(c.phone_number_id)) for c, ct in filas],
        "pagination": _paginacion(page, limit, total),
    }


def obtener_mensajes(db: Session, conversation_id: int, page: int, limit: int) -> dict | None:
    conv = db.get(WhatsAppConversacion, conversation_id)
    if conv is None:
        return None
    contacto = db.get(WhatsAppContacto, conv.contacto_id)
    filtros = _filtros_visibles(conv)
    total = db.scalar(select(func.count()).select_from(WhatsAppMensaje).where(*filtros)) or 0
    # Página 1 = los más recientes; dentro del bloque, del más antiguo al más nuevo.
    bloque = db.scalars(
        select(WhatsAppMensaje).where(*filtros)
        .order_by(WhatsAppMensaje.creado_en.desc(), WhatsAppMensaje.id.desc())
        .offset((page - 1) * limit).limit(limit)
    ).all()
    return {
        "conversation_id": conv.id, "is_open": _abierta(conv),
        "last_inbound_at": _iso(conv.ultimo_entrante_en),
        "contact": {"id": contacto.id, "name": contacto.nombre, "whatsapp_number": contacto.telefono},
        "contact_phone": _telefono_dict(contacto),
        "messages": [_mensaje_dict(m) for m in reversed(bloque)],
        "pagination": _paginacion(page, limit, total),
    }


def _recorte(texto: str, q: str, ancho: int = 120) -> str:
    i = texto.lower().find(q.lower())
    if i < 0 or len(texto) <= ancho:
        return texto[:ancho]
    ini = max(0, i - ancho // 3)
    return ("…" if ini else "") + texto[ini : ini + ancho]


def buscar(db: Session, q: str, limit: int, phone_number_id: str | None) -> dict:
    patron = f"%{q}%"
    base = [WhatsAppConversacion.eliminada.is_(False)]
    if phone_number_id is not None:
        base.append(WhatsAppConversacion.phone_number_id == int(phone_number_id))
    contactos = db.execute(
        select(WhatsAppContacto, WhatsAppConversacion.id)
        .join(WhatsAppConversacion, WhatsAppConversacion.contacto_id == WhatsAppContacto.id)
        .where(*base, (WhatsAppContacto.nombre.ilike(patron)) | (WhatsAppContacto.telefono.like(patron)))
        .order_by(WhatsAppConversacion.ultimo_mensaje_en.desc().nulls_last())
        .limit(limit)
    ).all()
    # Un resultado por conversación: el mensaje más reciente que coincide y cuántos hay.
    filas = db.execute(
        select(WhatsAppMensaje.conversacion_id, func.count().label("n"))
        .join(WhatsAppConversacion, WhatsAppConversacion.id == WhatsAppMensaje.conversacion_id)
        .where(
            *base, WhatsAppMensaje.contenido.ilike(patron),
            (WhatsAppConversacion.vaciada_hasta.is_(None))
            | (WhatsAppMensaje.creado_en > WhatsAppConversacion.vaciada_hasta),
        )
        .group_by(WhatsAppMensaje.conversacion_id)
        .order_by(func.max(WhatsAppMensaje.creado_en).desc())
        .limit(limit)
    ).all()
    mensajes = []
    for f in filas:
        conv = db.get(WhatsAppConversacion, f.conversacion_id)
        contacto = db.get(WhatsAppContacto, conv.contacto_id)
        m = db.scalar(
            select(WhatsAppMensaje)
            .where(*_filtros_visibles(conv), WhatsAppMensaje.contenido.ilike(patron))
            .order_by(WhatsAppMensaje.creado_en.desc()).limit(1)
        )
        mensajes.append({
            "conversation_id": conv.id, "message_id": m.id, "snippet": _recorte(m.contenido or "", q),
            "matches": f.n, "created_at": _iso(m.creado_en),
            "contact": {"id": contacto.id, "name": contacto.nombre, "whatsapp_number": contacto.telefono},
        })
    return {
        "contacts": [{**_contacto_dict(c), "conversation_id": cid} for c, cid in contactos],
        "messages": mensajes,
    }


def actualizar_flags(db: Session, conversation_id: int, flags: dict) -> dict | None:
    conv = db.get(WhatsAppConversacion, conversation_id)
    if conv is None:
        return None
    for nombre in FLAGS:
        if flags.get(nombre) is not None:
            setattr(conv, nombre, bool(flags[nombre]))
    db.commit()
    return {nombre: getattr(conv, nombre) for nombre in FLAGS} | {"id": conv.id}


def vaciar(db: Session, conversation_id: int) -> bool:
    """Oculta los mensajes anteriores a ahora; no borra nada. Si el contacto escribe
    después, esos mensajes nuevos se ven con normalidad."""
    conv = db.get(WhatsAppConversacion, conversation_id)
    if conv is None:
        return False
    conv.vaciada_hasta = datetime.now(timezone.utc)
    conv.no_leidos = 0
    db.commit()
    return True


def eliminar(db: Session, conversation_id: int) -> bool:
    """Como vaciar, y además la saca de la lista hasta que el contacto vuelva a escribir."""
    conv = db.get(WhatsAppConversacion, conversation_id)
    if conv is None:
        return False
    conv.vaciada_hasta = datetime.now(timezone.utc)
    conv.eliminada = True
    conv.is_pinned = False
    conv.no_leidos = 0
    db.commit()
    return True


def marcar_leida(db: Session, conversation_id: int) -> str | None:
    """Pone en cero lo no leído. Devuelve el id de WhatsApp del último entrante que
    estaba sin leer (para el doble check azul), o None."""
    ultimo = db.scalar(
        select(WhatsAppMensaje.whatsapp_message_id)
        .where(
            WhatsAppMensaje.conversacion_id == conversation_id, WhatsAppMensaje.direccion == "inbound",
            WhatsAppMensaje.leido_en.is_(None), WhatsAppMensaje.whatsapp_message_id.isnot(None),
        )
        .order_by(WhatsAppMensaje.creado_en.desc()).limit(1)
    )
    db.execute(
        text(
            "UPDATE whatsapp_mensajes SET leido_en = now() "
            "WHERE conversacion_id = :c AND direccion = 'inbound' AND leido_en IS NULL"
        ),
        {"c": conversation_id},
    )
    db.execute(text("UPDATE whatsapp_conversaciones SET no_leidos = 0 WHERE id = :c"), {"c": conversation_id})
    db.commit()
    return ultimo


def datos_de_envio(db: Session, conversation_id: int) -> tuple[str, int] | None:
    """(teléfono, id de línea) de una conversación: con dos líneas, cimapi necesita saber
    por cuál sale el mensaje."""
    fila = db.execute(
        select(WhatsAppContacto.telefono, WhatsAppConversacion.phone_number_id)
        .join(WhatsAppConversacion, WhatsAppConversacion.contacto_id == WhatsAppContacto.id)
        .where(WhatsAppConversacion.id == conversation_id)
    ).first()
    return (fila[0], fila[1]) if fila else None


def contexto_para_bot(db: Session, conversation_id: int, cantidad: int) -> dict | None:
    """Los últimos mensajes de la conversación, en la forma que lee el asistente."""
    conv = db.get(WhatsAppConversacion, conversation_id)
    if conv is None:
        return None
    contacto = db.get(WhatsAppContacto, conv.contacto_id)
    bloque = db.scalars(
        select(WhatsAppMensaje).where(*_filtros_visibles(conv))
        .order_by(WhatsAppMensaje.creado_en.desc(), WhatsAppMensaje.id.desc()).limit(cantidad)
    ).all()
    return {
        "contact_phone": {"phone": contacto.telefono},
        "messages": [_mensaje_dict(m) for m in reversed(bloque)],
    }


def mensaje_de_media(db: Session, media_id: str) -> WhatsAppMensaje | None:
    return db.scalar(
        select(WhatsAppMensaje).where(WhatsAppMensaje.media_id == media_id)
        .order_by(WhatsAppMensaje.media_clave.is_(None)).limit(1)
    )
