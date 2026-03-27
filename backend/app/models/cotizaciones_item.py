from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models.cotizaciones import Cotizaciones
    from backend.app.models.productos import Productos

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
    
    unidad_medida: Mapped[Optional[str]] = mapped_column(
        String(30), 
        nullable=True
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
    
    subtotal_linea: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    iva_linea: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    total_linea: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )

    # Valores de referencia al momento de cotizar
    saldo_referencia: Mapped[Optional[float]] = mapped_column(
        Numeric(14, 2), 
        nullable=True
    )
    
    valor_web_referencia: Mapped[Optional[float]] = mapped_column(
        Numeric(14, 2), 
        nullable=True
    )

    # Multimedia persistida
    imagen_url_snapshot: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    ficha_tecnica_url_snapshot: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )

    # Datos adicionales en formato JSON
    metadata_snapshot: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB, 
        nullable=True
    )

    orden: Mapped[int] = mapped_column(
        Integer, 
        nullable=False, 
        default=0
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )

    
    # Referencia opcional al producto original (puede ser NULL si el producto se borra del catálogo)
    producto_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        ForeignKey("productos.id"), 
        nullable=True
    )

    productos: Mapped[Optional["Productos"]] = relationship(
    "Productos",
    back_populates="cotizaciones_items"
    )

    cotizaciones: Mapped["Cotizaciones"] = relationship(
    "Cotizaciones",
    back_populates="cotizaciones_items"
    )