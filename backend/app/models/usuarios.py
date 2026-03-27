# app/models/usuario.py

from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Boolean, DateTime
from app.db.base import Base
from app.enums import RoleEnum
from datetime import datetime, timezone

if TYPE_CHECKING:
    from backend.app.models.cotizaciones import Cotizaciones

class Usuarios(Base):

    __tablename__ = "usuarios"
    
    usu_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    usu_nombre: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    usu_email: Mapped[str] = mapped_column(
        String(180),
        nullable=False
    )

    usu_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    usu_role: Mapped[str] = mapped_column(
        String(50),
        default=RoleEnum.ADMINISTRADOR
    )

    usu_activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    usu_created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now(timezone.utc)
    )

    usu_updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now(timezone.utc)
    )

    # Relación: Un usuario puede crear muchas cotizaciones
    cotizaciones: Mapped[list["Cotizaciones"]] = relationship(
        "Cotizaciones", 
        back_populates="usuarios"
    )