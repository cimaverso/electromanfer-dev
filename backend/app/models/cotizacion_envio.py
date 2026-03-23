from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, BigInteger, Text, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional

class CotizacionEnvio(Base):
    __tablename__ = "cotizacion_envios"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    # FK con eliminación en cascada (si se borra la cotización, se borra el registro de envío)
    cotizacion_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("cotizaciones.id", ondelete="CASCADE"), 
        nullable=False
    )

    # Tipo: 'email', 'whatsapp'
    tipo_envio: Mapped[str] = mapped_column(
        String(30), 
        nullable=False
    )
    
    # Correo electrónico o número de teléfono
    destino: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )
    
    asunto: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )
    
    mensaje: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    # Estados: 'pendiente', 'enviado', 'fallido'
    estado: Mapped[str] = mapped_column(
        String(30), 
        nullable=False, 
        default='pendiente'
    )
    
    enviado_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
        nullable=True
    )
    
    # Respuesta del servidor de correo o API de WhatsApp (logs de error o IDs de mensaje)
    respuesta: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )