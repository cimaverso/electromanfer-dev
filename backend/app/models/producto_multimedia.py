from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, BigInteger, Integer, Text, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.producto_catalogo import ProductoCatalogo

class ProductoMultimedia(Base):
    __tablename__ = "productos_multimedia"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    # Relación con el Catálogo de Productos
    producto_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("productos_catalogo.id", ondelete="CASCADE"),
        nullable=False
    )
    
    tipo: Mapped[str] = mapped_column(
        String(30), 
        nullable=False  # imagen, ficha_tecnica, manual, certificacion
    )
    
    titulo: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )
    
    url: Mapped[str] = mapped_column(
        Text, 
        nullable=False
    )
    
    mime_type: Mapped[Optional[str]] = mapped_column(
        String(120), 
        nullable=True
    )
    
    orden: Mapped[int] = mapped_column(
        Integer, 
        default=0
    )
    
    principal: Mapped[bool] = mapped_column(
        Boolean, 
        nullable=False, 
        default=False
    )
    
    activo: Mapped[bool] = mapped_column(
        Boolean, 
        nullable=False, 
        default=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )

    # Relación inversa (Back-reference)
    producto: Mapped["ProductoCatalogo"] = relationship(
        "ProductoCatalogo", 
        back_populates="multimedia"
    )