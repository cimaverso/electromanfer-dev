from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, DateTime, BigInteger
from app.db.base import Base
from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from app.enums import TipoCliente

if TYPE_CHECKING:
    from app.models.cotizacion import Cotizacion

class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    tipo_cliente: Mapped[str] = mapped_column(
        String(30), 
        default=TipoCliente.empresa
    )
    
    nombre_razon_social: Mapped[str] = mapped_column(
        String(180), 
        nullable=False
    )
    
    nit_cedula: Mapped[str] = mapped_column(
        String(50), 
        nullable=True
    )
    
    nombre_contacto: Mapped[str] = mapped_column(
        String(150), 
        nullable=True
    )
    
    email: Mapped[str] = mapped_column(
        String(180), 
        nullable=True
    )
    
    telefono: Mapped[str] = mapped_column(
        String(50), 
        nullable=True
    )
    
    direccion: Mapped[str] = mapped_column(
        Text, 
        nullable=True
    )
    
    ciudad: Mapped[str] = mapped_column(
        String(120), 
        nullable=True
    )
    
    observaciones: Mapped[str] = mapped_column(
        Text, 
        nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relación: Un cliente puede tener múltiples cotizaciones
    cotizaciones: Mapped[list["Cotizacion"]] = relationship(
        "Cotizacion", 
        back_populates="cliente"
    )