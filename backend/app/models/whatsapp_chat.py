"""El chat de WhatsApp de Electromanfer, guardado en su propia base.

Cimapi (la API de WhatsApp) no guarda contactos, conversaciones ni mensajes:
Electromanfer los recibe por eventos y los guarda aquí. Una conversación es un
contacto en una línea (Electromanfer tiene dos). Al copiar el historial de
CimaSuite se conserva el id de cada conversación, para que `bot_chats_desactivados`
y el frontend sigan funcionando con los mismos números.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class WhatsAppContacto(Base):
    __tablename__ = "whatsapp_contactos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Solo dígitos, como llega de WhatsApp (ej. 573001112233).
    telefono: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class WhatsAppConversacion(Base):
    __tablename__ = "whatsapp_conversaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contacto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("whatsapp_contactos.id", ondelete="CASCADE"), nullable=False
    )
    # Id de la línea en cimapi (7 y 8), el mismo que usa LINEAS_WHATSAPP.
    phone_number_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Los mismos indicadores que mostraba CimaSuite.
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_muted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_priority: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    # "Vaciar" oculta los mensajes anteriores a este instante; "eliminar" la saca de la
    # lista hasta que el contacto vuelva a escribir. Nada se borra de verdad.
    vaciada_hasta: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    eliminada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    ultimo_mensaje_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("whatsapp_mensajes.id", ondelete="SET NULL", use_alter=True,
                               name="fk_whatsapp_conversacion_ultimo_mensaje"),
        nullable=True,
    )
    ultimo_mensaje_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Cuándo escribió el cliente por última vez (la ventana de 24 h de WhatsApp).
    ultimo_entrante_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    no_leidos: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("contacto_id", "phone_number_id", name="uq_whatsapp_conversacion_contacto_linea"),
        Index("ix_whatsapp_conversacion_linea_ultimo", "phone_number_id", "ultimo_mensaje_en"),
    )


class WhatsAppMensaje(Base):
    __tablename__ = "whatsapp_mensajes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversacion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("whatsapp_conversaciones.id", ondelete="CASCADE"), nullable=False
    )

    # Id del mensaje en WhatsApp: evita guardar dos veces el mismo (un evento puede repetirse).
    whatsapp_message_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    # Id del mismo mensaje en CimaSuite, solo para el historial traído de allá.
    cimasuite_mensaje_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    # "inbound" (del cliente) o "outbound" (nuestro), como lo entrega la API.
    direccion: Mapped[str] = mapped_column(String(10), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'text'"))
    contenido: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Ubicación {latitude, longitude, name, address} o contactos {contacts: [...]}.
    datos: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    media_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    media_nombre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    media_mime: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Clave del archivo en el servidor de Electromanfer; NULL = aún no copiado.
    media_clave: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    plantilla_nombre: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    plantilla_componentes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # pending, sent, delivered, read, failed (solo salientes).
    estado: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Entrantes: cuándo se marcó como leído. NULL = sin leer.
    leido_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Quién lo envió desde Electromanfer; NULL si fue el bot, el teléfono o el cliente.
    enviado_por_usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    # True si lo escribió el asistente de IA (para mostrarlo y para el uso del bot).
    enviado_por_bot: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_whatsapp_mensaje_conv_creado", "conversacion_id", "creado_en"),
        Index("uq_whatsapp_mensaje_wamid", "whatsapp_message_id", unique=True,
              postgresql_where=text("whatsapp_message_id IS NOT NULL")),
        Index("uq_whatsapp_mensaje_cimasuite", "cimasuite_mensaje_id", unique=True,
              postgresql_where=text("cimasuite_mensaje_id IS NOT NULL")),
        Index("ix_whatsapp_mensaje_conv_media", "conversacion_id", "creado_en",
              postgresql_where=text("media_id IS NOT NULL")),
        # El índice de trigramas (búsqueda por contenido) NO se declara aquí: necesita la extensión
        # pg_trgm y main.py hace create_all al arrancar, antes de cualquier migración. Lo crea la
        # migración c5d8e1a4f702, junto con la extensión.
    )
