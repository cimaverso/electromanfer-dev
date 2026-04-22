import os
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.productos import Productos
from app.models.productos_multimedia import ProductosMultimedia
from app.schemas.multimedia import ArchivoResponse, MultimediaResponse
from app.core.config import settings

ALLOWED_IMAGES = {"image/jpeg", "image/png"}
ALLOWED_PDFS = {"application/pdf"}


MAX_SIZE_IMAGE = 15 * 1024 * 1024  # 10MB
MAX_SIZE_PDF = 30 * 1024 * 1024    # 30MB

class MultimediaService:

    @staticmethod
    def _get_producto(db: Session, cod_ref: str) -> Productos:
        stmt = select(Productos).where(Productos.cod_ref == cod_ref)
        producto = db.execute(stmt).scalar_one_or_none()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado.")
        return producto

    @staticmethod
    def _get_folder(cod_ref: str, tipo: str) -> str:
        subfolder = "imagenes" if tipo == "imagen" else "fichas"
        path = os.path.join(settings.MEDIA_BASE, subfolder, cod_ref)
        os.makedirs(path, exist_ok=True)
        return path

    @staticmethod
    def listar(db: Session, cod_ref: str) -> MultimediaResponse:
        producto = MultimediaService._get_producto(db, cod_ref)
        stmt = select(ProductosMultimedia).where(
            ProductosMultimedia.producto_id == producto.id
        )
        archivos = db.execute(stmt).scalars().all()
        imagenes = [a for a in archivos if a.tipo == "imagen"]
        pdfs = [a for a in archivos if a.tipo == "ficha_tecnica"]
        return MultimediaResponse(imagenes=imagenes, pdfs=pdfs)

    @staticmethod
    async def subir_imagen(db: Session, cod_ref: str, file: UploadFile) -> ArchivoResponse:
        if file.content_type not in ALLOWED_IMAGES:
            raise HTTPException(status_code=400, detail="Formato no permitido.")
        contents = await file.read()
        if len(contents) > MAX_SIZE_IMAGE:
            raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10MB.")
        producto = MultimediaService._get_producto(db, cod_ref)
        ext = file.filename.split(".")[-1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        folder = MultimediaService._get_folder(cod_ref, "imagen")

        with open(os.path.join(folder, filename), "wb") as f:
            f.write(contents)

        stmt_principal = select(ProductosMultimedia).where(
            ProductosMultimedia.producto_id == producto.id,
            ProductosMultimedia.tipo == "imagen",
            ProductosMultimedia.principal.is_(True)
        )
        hay_principal = db.execute(stmt_principal).scalar_one_or_none()

        registro = ProductosMultimedia(
            producto_id=producto.id,
            tipo="imagen",
            titulo=file.filename,
            url=f"/media/imagenes/{cod_ref}/{filename}",
            principal=hay_principal is None
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro

    @staticmethod
    def marcar_principal(db: Session, archivo_id: int) -> ArchivoResponse:
        stmt = select(ProductosMultimedia).where(ProductosMultimedia.id == archivo_id)
        archivo = db.execute(stmt).scalar_one_or_none()
        if not archivo:
            raise HTTPException(status_code=404, detail="Archivo no encontrado.")

        stmt_reset = select(ProductosMultimedia).where(
            ProductosMultimedia.producto_id == archivo.producto_id,
            ProductosMultimedia.tipo == "imagen"
        )
        todas = db.execute(stmt_reset).scalars().all()
        for img in todas:
            img.principal = False

        archivo.principal = True
        db.commit()
        db.refresh(archivo)
        return archivo

    @staticmethod
    def toggle_seleccionada(db: Session, archivo_id: int, seleccionada: bool) -> ArchivoResponse:
        stmt = select(ProductosMultimedia).where(ProductosMultimedia.id == archivo_id)
        archivo = db.execute(stmt).scalar_one_or_none()
        if not archivo:
            raise HTTPException(status_code=404, detail="Archivo no encontrado.")
        archivo.seleccionada = seleccionada
        db.commit()
        db.refresh(archivo)
        return archivo

    @staticmethod
    async def subir_pdf(db: Session, cod_ref: str, file: UploadFile) -> ArchivoResponse:
        if file.content_type not in ALLOWED_PDFS:
            raise HTTPException(status_code=400, detail="Solo se permiten PDFs.")
        contents = await file.read()
        if len(contents) > MAX_SIZE_PDF:
            raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10MB.")
        producto = MultimediaService._get_producto(db, cod_ref)
        filename = f"{uuid.uuid4().hex}.pdf"
        folder = MultimediaService._get_folder(cod_ref, "pdf")

        with open(os.path.join(folder, filename), "wb") as f:
            f.write(contents)

        registro = ProductosMultimedia(
            producto_id=producto.id,
            tipo="ficha_tecnica",
            titulo=file.filename,
            url=f"/media/fichas/{cod_ref}/{filename}",
            principal=False,
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro

    @staticmethod
    def eliminar(db: Session, archivo_id: int) -> dict:
        stmt = select(ProductosMultimedia).where(ProductosMultimedia.id == archivo_id)
        archivo = db.execute(stmt).scalar_one_or_none()
        if not archivo:
            raise HTTPException(status_code=404, detail="Archivo no encontrado.")
        
        ruta_relativa = archivo.url.removeprefix("/media/")
        filepath = os.path.join(settings.MEDIA_BASE, ruta_relativa)
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        db.delete(archivo)
        db.commit()
        return {"ok": True}