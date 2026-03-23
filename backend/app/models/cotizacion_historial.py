from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, BigInteger, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, Any

class CotizacionHistorial(Base):
    __tablename__ = "cotizacion_historial"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    # FK con eliminación en cascada para no dejar rastro si se borra la cotización
    cotizacion_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("cotizaciones.id", ondelete="CASCADE"), 
        nullable=False
    )

    # El usuario que generó el evento (puede ser NULL si es un evento automático del sistema)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        ForeignKey("usuarios.usu_id"), 
        nullable=True
    )

    # Ejemplos de eventos: 'creacion', 'cambio_estado', 'envio_email', 'descarga_pdf'
    evento: Mapped[str] = mapped_column(
        String(50), 
        nullable=False
    )
    
    detalle: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    # Canal por el que ocurrió el evento (web, móvil, whatsapp, api)
    canal: Mapped[Optional[str]] = mapped_column(
        String(30), 
        nullable=True
    )

    # Datos técnicos del evento (IP, User-Agent, errores técnicos, etc.)
    meta_data: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "metadata", # <-- Nombre real en la base de datos
        JSONB, 
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )