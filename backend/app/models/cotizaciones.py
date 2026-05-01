from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, ForeignKey, Text
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models.usuarios import Usuarios
    from backend.app.models.clientes import Clientes
    from backend.app.models.cotizaciones_item import CotizacionesItem
    
class Cotizaciones(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    consecutivo: Mapped[str] = mapped_column(
        String(50), 
        nullable=False, 
        unique=True
    )

    # Claves foráneas (Relaciones se revisan al final como acordamos)
    cliente_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, 
        ForeignKey("clientes.id"), 
        nullable=True
    )
    
    usuario_id: Mapped[int] = mapped_column(
        BigInteger, 
        ForeignKey("usuarios.id"), # Ajustado a usu_id según tu modelo de Usuario
        nullable=False
    )

    estado: Mapped[str] = mapped_column(
        String(30), 
        nullable=False, 
        default='GENERADA'
    )
    
    # Valores Financieros con precisión de 14,2
    subtotal: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    descuento: Mapped[float] = mapped_column(
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

    notas: Mapped[Optional[str]] = mapped_column(      # ← agregar
        Text, 
        nullable=True
    )

    observaciones_pdf: Mapped[Optional[str]] = mapped_column(  # ← agregar
        Text, 
        nullable=True
    )

    fecha_envio: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
        nullable=True
    )

    email_thread_id: Mapped[Optional[str]] = mapped_column(  # agrega esto
        String(255), 
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

    # Relaciones hacia arriba (Padres)
    usuarios: Mapped["Usuarios"] = relationship("Usuarios", back_populates="cotizaciones")
    clientes: Mapped[Optional["Clientes"]] = relationship("Clientes", back_populates="cotizaciones")

    # Relaciones hacia abajo (Hijos)
    cotizaciones_items: Mapped[list["CotizacionesItem"]] = relationship(
        "CotizacionesItem", 
        back_populates="cotizaciones",
        cascade="all, delete-orphan"
    )

    