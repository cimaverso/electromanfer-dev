# app/models/usuario.py

from typing import TYPE_CHECKING, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Boolean, DateTime
from app.db.base import Base
from app.enums import RoleEnum
from datetime import datetime, timezone

if TYPE_CHECKING:
    from backend.app.models.cotizaciones import Cotizaciones

class Usuarios(Base):

    __tablename__ = "usuarios"
    
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    usuario: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    nombre_completo: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    cedula_ciudadania: Mapped[str] = mapped_column(
        String(20),
        nullable=False, 
        unique=True
    )

    clave: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    rol: Mapped[str] = mapped_column(
        String(50),
        default=RoleEnum.ADMINISTRADOR
    )

    session_token: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now(timezone.utc)
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now(timezone.utc)
    )

    # Relación: Un usuario puede crear muchas cotizaciones
    cotizaciones: Mapped[list["Cotizaciones"]] = relationship(
        "Cotizaciones", 
        back_populates="usuarios"
    )