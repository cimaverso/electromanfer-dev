from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, BigInteger, Text, ForeignKey
from app.db.base import Base
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from backend.app.models.productos import Productos


class ProductosMultimedia(Base):
    __tablename__ = "productos_multimedia"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Relación con el Catálogo de Productos
    producto_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(30),
        nullable=False,  # imagen, ficha_tecnica, manual, certificacion
    )

    titulo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    url: Mapped[str] = mapped_column(Text, nullable=False)

    principal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    seleccionada: Mapped[bool] = mapped_column(  # ← agregar
        Boolean, nullable=False, default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relación inversa (Back-reference)
    productos: Mapped["Productos"] = relationship(
        "Productos", back_populates="productos_multimedia"
    )
