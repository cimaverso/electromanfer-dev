# app/models/bot_uso_ia.py
"""
Registro de tokens/costo de cada respuesta que generó el bot de WhatsApp,
para poder mostrar "cuánto hemos gastado en IA" en el frontend. El costo
se calcula y se guarda ya resuelto (no se recalcula al leer) para que un
cambio futuro de tarifa no altere el histórico.
"""
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Numeric, DateTime, func
from app.core.db import Base


class BotUsoIA(Base):
    __tablename__ = "bot_uso_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    conversation_id: Mapped[int] = mapped_column(Integer, nullable=False)
    phone_number_id: Mapped[str] = mapped_column(String(64), nullable=False)
    modelo: Mapped[str] = mapped_column(String(64), nullable=False)

    tokens_entrada: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_salida: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    costo_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
