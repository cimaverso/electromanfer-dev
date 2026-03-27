from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models.productos_multimedia import ProductosMultimedia
    from backend.app.models.cotizaciones_item import CotizacionesItem

class Productos(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    cod_ref: Mapped[str] = mapped_column(
        String(80), 
        nullable=False, 
        unique=True
    )
    
    nom_ref: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )
    
    cod_tip: Mapped[Optional[str]] = mapped_column(
        String(80), 
        nullable=True
    )
    
    nom_tip: Mapped[Optional[str]] = mapped_column(
        String(150), 
        nullable=True
    )

    # Uso de Numeric(14,2) para precisión financiera
    saldo: Mapped[Optional[float]] = mapped_column(
        Numeric(14, 2), 
        nullable=True
    )
    
    valor_web: Mapped[Optional[float]] = mapped_column(
        Numeric(14, 2), 
        nullable=True
    )

   
    sincronizado_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
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

    # Relación: Un producto tiene muchas imágenes/manuales
    productos_multimedia: Mapped[list["ProductosMultimedia"]] = relationship(
        "ProductosMultimedia", 
        back_populates="productos",
        cascade="all, delete-orphan"
    )

    # Relación opcional: El producto puede aparecer en muchos ítems de cotizaciones
    cotizaciones_items: Mapped[list["CotizacionesItem"]] = relationship(
        "CotizacionesItem", 
        back_populates="productos"
    )