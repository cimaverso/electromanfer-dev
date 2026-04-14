from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String
from app.db.base import Base

class Firmas(Base):
    __tablename__ = "firmas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=True)
    archivo: Mapped[str] = mapped_column(String(255), nullable=False)