# app/models/cimasuite_cursor.py
"""
Id del último evento de CimaSuite procesado (una sola fila). Al reconectar
se le pide a CimaSuite todo lo posterior, así un redeploy no deja mensajes
sin que el bot los vea (ver app/integrations/cimasuite/ws_client.py).
"""
from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class CimaSuiteCursor(Base):
    __tablename__ = "cimasuite_cursor"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)

    ultimo_evento_id: Mapped[str] = mapped_column(String(32), nullable=False)

    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
