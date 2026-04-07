from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, Text, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models.cotizaciones import Cotizaciones
    
class CotizacionesItem(Base):
    __tablename__ = "cotizaciones_items"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    # FK con eliminación en cascada
    cotizacion_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("cotizaciones.id", ondelete="CASCADE"), 
        nullable=False
    )

    # Datos persistidos (Snapshots) para integridad histórica
    cod_ref: Mapped[str] = mapped_column(String(80), nullable=False)
    nom_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    cod_tip: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    nom_tip: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Cálculos y Cantidades
    cantidad: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=1.00
    )
    
   
    # Valores de la línea con precisión decimal
    precio_unitario: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    descuento_unitario: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    subtotal: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    iva: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    total: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )

    # Multimedia persistida
    imagen_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ficha_tecnica_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )

    cotizaciones: Mapped["Cotizaciones"] = relationship(
    "Cotizaciones",
    back_populates="cotizaciones_items"
    )