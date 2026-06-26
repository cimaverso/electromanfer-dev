from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String
from app.core.db import Base


class Firmas(Base):
    __tablename__ = "firmas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    