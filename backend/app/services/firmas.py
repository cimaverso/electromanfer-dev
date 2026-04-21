import os
import logging
import shutil
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.firmas import Firmas
from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png"}


class FirmasService:

    @staticmethod
    def _firmas_dir() -> str:
        path = os.path.join(settings.MEDIA_BASE, "firmas")
        os.makedirs(path, exist_ok=True)
        return path

    @staticmethod
    def listar(db: Session) -> list[Firmas]:
        stmt = select(Firmas).order_by(Firmas.id)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def subir(nombre: str, archivo: UploadFile, db: Session) -> Firmas:
        if archivo.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, "Solo se permiten imágenes JPEG o PNG")

        ext = "jpeg" if archivo.content_type == "image/jpeg" else "png"
        filename = f"{uuid.uuid4().hex}.{ext}"
        dest = os.path.join(FirmasService._firmas_dir(), filename)

        try:
            with open(dest, "wb") as f:
                shutil.copyfileobj(archivo.file, f)
        except Exception as e:
            logger.error(f"Error guardando firma: {e}")
            raise HTTPException(500, "Error al guardar el archivo")

        firma = Firmas(
            nombre=nombre,
            url=f"/media/firmas/{filename}"
        )
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

        ruta_relativa = firma.url.removeprefix("/media/")
        path = os.path.join(settings.MEDIA_BASE, ruta_relativa)
        
        db.delete(firma)
        db.commit()

        if os.path.exists(path):
            os.remove(path)

        logger.info(f"Firma eliminada: {firma.url}")
        return {"success": True}