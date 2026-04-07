import os
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.productos import Productos
from app.models.productos_multimedia import ProductosMultimedia
from app.schemas.multimedia import ArchivoResponse, MultimediaResponse
from app.core.config import settings

MEDIA_BASE = settings.MEDIA_BASE
ALLOWED_IMAGES = {"image/jpeg", "image/png"}
ALLOWED_PDFS = {"application/pdf"}
MAX_SIZE = 10 * 1024 * 1024

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
        folder = os.path.join(MEDIA_BASE, subfolder, cod_ref)
        os.makedirs(folder, exist_ok=True)
        return folder

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
        if len(contents) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10MB.")
        producto = MultimediaService._get_producto(db, cod_ref)
        ext = file.filename.split(".")[-1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        folder = MultimediaService._get_folder(cod_ref, "imagen")

        with open(os.path.join(folder, filename), "wb") as f:
            f.write(contents)
        url = f"/media/imagenes/{cod_ref}/{filename}"

        # Si no hay ninguna principal, esta será la principal
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
            url=url,
            principal=hay_principal is None
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
        return registro
    
    @staticmethod
    def marcar_principal(db: Session, archivo_id: int) -> ArchivoResponse:
        # Busca el archivo
        stmt = select(ProductosMultimedia).where(ProductosMultimedia.id == archivo_id)
        archivo = db.execute(stmt).scalar_one_or_none()
        if not archivo:
            raise HTTPException(status_code=404, detail="Archivo no encontrado.")
        
        # Quita principal de todas las imágenes del producto
        stmt_reset = select(ProductosMultimedia).where(
            ProductosMultimedia.producto_id == archivo.producto_id,
            ProductosMultimedia.tipo == "imagen"
        )
        todas = db.execute(stmt_reset).scalars().all()
        for img in todas:
            img.principal = False
        
        # Marca la seleccionada como principal
        archivo.principal = True
        db.commit()
        db.refresh(archivo)
        return archivo

    @staticmethod
    async def subir_pdf(db: Session, cod_ref: str, file: UploadFile) -> ArchivoResponse:
        if file.content_type not in ALLOWED_PDFS:
            raise HTTPException(status_code=400, detail="Solo se permiten PDFs.")
        contents = await file.read()
        if len(contents) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10MB.")
        producto = MultimediaService._get_producto(db, cod_ref)
        filename = f"{uuid.uuid4().hex}.pdf"
        folder = MultimediaService._get_folder(cod_ref, "pdf")
        with open(os.path.join(folder, filename), "wb") as f:
            f.write(contents)
        url = f"/media/fichas/{cod_ref}/{filename}"
        registro = ProductosMultimedia(
            producto_id=producto.id,
            tipo="ficha_tecnica",
            titulo=file.filename,
            url=url,
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
        filepath = os.path.join(MEDIA_BASE, archivo.url.lstrip("/media/"))
        if os.path.exists(filepath):
            os.remove(filepath)
        db.delete(archivo)
        db.commit()
        return {"ok": True}
