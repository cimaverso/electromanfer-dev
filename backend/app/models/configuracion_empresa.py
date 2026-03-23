from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, BigInteger, Numeric, Text
from app.db.base import Base
from datetime import datetime, timezone
from typing import Optional

class ConfiguracionEmpresa(Base):
    __tablename__ = "configuracion_empresa"

    id: Mapped[int] = mapped_column(
        BigInteger, 
        primary_key=True, 
        autoincrement=True
    )
    
    nombre_empresa: Mapped[str] = mapped_column(
        String(180), 
        nullable=False
    )
    
    nit: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True
    )
    
    direccion: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    telefono: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True
    )
    
    email: Mapped[Optional[str]] = mapped_column(
        String(180), 
        nullable=True
    )
    
    sitio_web: Mapped[Optional[str]] = mapped_column(
        String(180), 
        nullable=True
    )

    logo_url: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    logo_blanco_url: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )

    pie_pdf: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )
    
    terminos_pdf: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
    )

    porcentaje_iva_defecto: Mapped[float] = mapped_column(
        Numeric(6, 2), 
        default=19.00
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