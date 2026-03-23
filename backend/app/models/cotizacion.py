from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, Text, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.cliente import Cliente
    from app.models.cotizacion_item import CotizacionItem
    from app.models.cotizacion_historial import CotizacionHistorial
    from app.models.cotizacion_envio import CotizacionEnvio

class Cotizacion(Base):
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
        ForeignKey("usuarios.usu_id"), # Ajustado a usu_id según tu modelo de Usuario
        nullable=False
    )

    estado: Mapped[str] = mapped_column(
        String(30), 
        nullable=False, 
        default='generada'
    )
    
    canal_envio: Mapped[Optional[str]] = mapped_column(
        String(30), 
        nullable=True
    )

    notas: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    observaciones_pdf: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    condiciones_comerciales: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )

    # Valores Financieros con precisión de 14,2
    subtotal: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    descuento_total: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    base_gravable: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    iva_total: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )
    
    total: Mapped[float] = mapped_column(
        Numeric(14, 2), 
        nullable=False, 
        default=0.00
    )

    moneda: Mapped[str] = mapped_column(
        String(10), 
        nullable=False, 
        default='COP'
    )
    
    porcentaje_iva: Mapped[float] = mapped_column(
        Numeric(6, 2), 
        nullable=False, 
        default=19.00
    )

    pdf_url: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    pdf_nombre: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )

    fecha_generacion: Mapped[datetime] = mapped_column(
        DateTime, 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    fecha_envio: Mapped[Optional[datetime]] = mapped_column(
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

    # Relaciones hacia arriba (Padres)
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="cotizaciones")
    cliente: Mapped[Optional["Cliente"]] = relationship("Cliente", back_populates="cotizaciones")

    # Relaciones hacia abajo (Hijos)
    items: Mapped[list["CotizacionItem"]] = relationship(
        "CotizacionItem", 
        back_populates="cotizacion",
        cascade="all, delete-orphan"
    )
    historial: Mapped[list["CotizacionHistorial"]] = relationship(
        "CotizacionHistorial", 
        back_populates="cotizacion",
        cascade="all, delete-orphan"
    )
    envios: Mapped[list["CotizacionEnvio"]] = relationship(
        "CotizacionEnvio", 
        back_populates="cotizacion",
        cascade="all, delete-orphan"
    )