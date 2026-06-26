from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean
from app.core.db import Base


class Transportadora(Base):
    __tablename__ = "transportadoras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)