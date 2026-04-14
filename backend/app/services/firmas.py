import os
import logging
import shutil
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.firmas import Firmas
from app.core.config import settings

logger = logging.getLogger(__name__)

FIRMAS_DIR = os.path.join(settings.MEDIA_BASE, "firmas")
ALLOWED_TYPES = {"image/jpeg", "image/png"}
MAX_FIRMAS = 6

os.makedirs(FIRMAS_DIR, exist_ok=True)


class FirmasService:

    @staticmethod
    def listar(db: Session) -> list[Firmas]:
        stmt = select(Firmas).order_by(Firmas.id)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def subir(nombre: str, descripcion: str | None, archivo: UploadFile, db: Session) -> Firmas:
        total = db.execute(select(func.count()).select_from(Firmas)).scalar()

        if total >= MAX_FIRMAS:
            raise HTTPException(400, f"Máximo {MAX_FIRMAS} firmas permitidas")

        if archivo.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, "Solo se permiten imágenes JPEG o PNG")

        ext = "jpeg" if archivo.content_type == "image/jpeg" else "png"
        filename = f"firma_{uuid.uuid4().hex[:8]}.{ext}"
        dest = os.path.join(FIRMAS_DIR, filename)

        try:
            with open(dest, "wb") as f:
                shutil.copyfileobj(archivo.file, f)
        except Exception as e:
            logger.error(f"Error guardando firma: {e}")
            raise HTTPException(500, "Error al guardar el archivo")

        firma = Firmas(nombre=nombre, descripcion=descripcion, archivo=filename)
        db.add(firma)
        db.commit()
        db.refresh(firma)
        logger.info(f"Firma creada: {filename}")
        return firma

    @staticmethod
    def eliminar(firma_id: int, db: Session) -> dict:
        stmt = select(Firmas).where(Firmas.id == firma_id)
        firma = db.execute(stmt).scalar_one_or_none()

        if not firma:
            raise HTTPException(404, "Firma no encontrada")

        db.delete(firma)
        db.commit()

        path = os.path.join(FIRMAS_DIR, firma.archivo)
        if os.path.exists(path):
            os.remove(path)

        logger.info(f"Firma eliminada: {firma.archivo}")
        return {"success": True}