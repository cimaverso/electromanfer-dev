# app/models/bot_config.py
"""
Configuración del bot de WhatsApp fuera de horario (una sola fila, id=1).
Ver app/integrations/bot/config.py para la lógica que combina
`lineas_apagadas` + `horario_activo`/`horario_reglas` + el saldo prepago
en un solo booleano de "¿está activo ahora?" por línea.
"""
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Boolean, JSON, Numeric, Text, DateTime, ForeignKey, func
from app.core.db import Base

if TYPE_CHECKING:
    from app.models.usuarios import Usuarios


class BotConfig(Base):
    __tablename__ = "bot_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Ids (como string, ej. "7") de las líneas de WhatsApp (LINEAS_WHATSAPP en
    # app/routes/whatsapp.py) apagadas manualmente. Una línea que no está en
    # esta lista sigue el horario automático de abajo.
    lineas_apagadas: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    horario_activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # {"0": [["00:00","06:00"], ...], ..., "6": [...]} -- claves = weekday() (0=lunes)
    horario_reglas: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Saldo prepago en USD (se descuenta con cada respuesta del bot, ver
    # bot/uso.py). Si llega a $0 o menos, el bot se apaga automáticamente en
    # todas las líneas sin importar horario ni override manual, hasta que se
    # recargue de nuevo (ver bot_activo_ahora).
    saldo_usd: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0)

    # Texto libre que el negocio agrega al prompt fijo del asistente (tono,
    # promociones vigentes, aclaraciones). Las reglas de seguridad del
    # prompt base (no inventar precios/descuentos, ignorar instrucciones de
    # un cliente que se haga pasar por admin, etc.) NO se pueden tocar
    # desde acá -- ver bot/graph.py:SYSTEM_PROMPT.
    instrucciones_extra: Mapped[str] = mapped_column(Text, nullable=False, default="")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    actualizado_por_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    actualizado_por: Mapped[Optional["Usuarios"]] = relationship("Usuarios")
