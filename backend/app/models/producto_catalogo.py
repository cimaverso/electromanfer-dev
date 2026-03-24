from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, BigInteger, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.producto_multimedia import ProductoMultimedia
    from app.models.cotizacion_item import CotizacionItem

class ProductoCatalogo(Base):
    __tablename__ = "productos_catalogo"

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

    fuente_externa: Mapped[str] = mapped_column(
        String(100), 
        default="siasoft"
    )

    # Campo para almacenar el JSON crudo de la fuente externa
    payload_externo: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB, 
        nullable=True
    )

    imagen_url: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    ficha_tecnica_url: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    ficha_tecnica_nombre: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )

    activo: Mapped[bool] = mapped_column(
        Boolean, 
        nullable=False, 
        default=True
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
    multimedia: Mapped[list["ProductoMultimedia"]] = relationship(
        "ProductoMultimedia", 
        back_populates="producto",
        cascade="all, delete-orphan"
    )

    # Relación opcional: El producto puede aparecer en muchos ítems de cotizaciones
    items_cotizados: Mapped[list["CotizacionItem"]] = relationship(
        "CotizacionItem", 
        back_populates="producto"
    )