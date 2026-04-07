from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models.cotizaciones import Cotizaciones
    
class CotizacionesItem(Base):
    __tablename__ = "cotizaciones_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    cotizacion_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("cotizaciones.id", ondelete="CASCADE"), 
        nullable=False
    )

    cod_ref: Mapped[str] = mapped_column(String(80), nullable=False)
    nom_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    cod_tip: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    nom_tip: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    cantidad: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=1.00)
    precio_unitario: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.00)
    descuento_unitario: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.00)
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.00)
    iva: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.00)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.00)

    # Multimedia snapshot
    imagen_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)        # principal para PDF
    imagenes_urls: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)   # seleccionadas para envío
    fichas_urls: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)     # seleccionadas para envío

    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )

    cotizaciones: Mapped["Cotizaciones"] = relationship(
        "Cotizaciones",
        back_populates="cotizaciones_items"
    )