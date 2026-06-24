from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, BigInteger, Numeric, Integer, Text, Date, ForeignKey
from app.db.base import Base
from datetime import datetime, date
from typing import Optional
import pytz

BOGOTA_TZ = pytz.timezone("America/Bogota")

def ahora_bogota():
    return datetime.now(BOGOTA_TZ)


class Guia(Base):
    __tablename__ = "guias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    cotizacion_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("cotizaciones.id", ondelete="SET NULL"), nullable=True
    )
    cotizacion_consecutivo: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    transportadora: Mapped[str] = mapped_column(String(100), nullable=False)
    numero_guia: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_despacho: Mapped[date] = mapped_column(Date, nullable=False)
    destinatario: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    direccion_destino: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    ciudad_destino: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefono_destinatario: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    unidades: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    peso_kg: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    valor_declarado: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    valor_recaudo: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    costo_flete: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    referencia_interna: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    foto_guia_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="generada")

    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: ahora_bogota()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: ahora_bogota(),
        onupdate=lambda: ahora_bogota()
    )

    historial: Mapped[list["GuiaHistorial"]] = relationship(
        "GuiaHistorial", back_populates="guia", cascade="all, delete-orphan"
    )


class GuiaHistorial(Base):
    __tablename__ = "guias_historial"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guia_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("guias.id", ondelete="CASCADE"), nullable=False
    )
    estado: Mapped[str] = mapped_column(String(30), nullable=False)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: ahora_bogota()
    )

    guia: Mapped["Guia"] = relationship("Guia", back_populates="historial")