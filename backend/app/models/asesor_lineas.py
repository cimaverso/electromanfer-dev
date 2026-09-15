# app/models/asesor_lineas.py

from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from app.core.db import Base

if TYPE_CHECKING:
    from app.models.usuarios import Usuarios


class AsesorLinea(Base):
    """
    Mapeo 1:1 vendedor -> línea de WhatsApp (phone_number_id de CimAPI).
    Equivalente conceptual a `user_phone_numbers` en CimSuite.
    unique=True en usuario_id refleja la regla actual (1 vendedor = 1 línea);
    Gerencia no tiene fila aquí y por eso no se filtra (ve ambas líneas).
    """

    __tablename__ = "asesor_lineas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    phone_number_id: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    usuario: Mapped["Usuarios"] = relationship("Usuarios")
