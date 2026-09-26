# app/models/bot_chat_desactivado.py
"""
Un chat de WhatsApp con el bot desactivado puntualmente. No hay espejo
local de conversaciones (igual que el resto del proyecto, ver
app/integrations/cimasuite/client.py), así que `conversation_id` es el id
de CimAPI sin FK. La sola presencia de la fila indica "bot desactivado en
este chat".
"""
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, DateTime, ForeignKey, func
from app.core.db import Base

if TYPE_CHECKING:
    from app.models.usuarios import Usuarios


class BotChatDesactivado(Base):
    __tablename__ = "bot_chats_desactivados"

    conversation_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    desactivado_por_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    desactivado_por: Mapped[Optional["Usuarios"]] = relationship("Usuarios")
