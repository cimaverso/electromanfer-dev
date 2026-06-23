import os
import time
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.models.guia import Guia, GuiaHistorial

MEDIA_BASE = os.getenv("MEDIA_BASE", "/app/media")


class GuiaService:

    @staticmethod
    def _guardar_foto(foto: UploadFile, numero_guia: str) -> str:
        ext = foto.filename.rsplit(".", 1)[-1] if "." in foto.filename else "jpg"
        numero_limpio = numero_guia.replace("-", "").replace("/", "")
        nombre_archivo = f"foto_{numero_limpio}_{int(time.time())}.{ext}"
        carpeta = os.path.join(MEDIA_BASE, "guias")
        os.makedirs(carpeta, exist_ok=True)
        ruta = os.path.join(carpeta, nombre_archivo)
        with open(ruta, "wb") as f:
            f.write(foto.file.read())
        return f"media/guias/{nombre_archivo}"

    @staticmethod
    def crear(db: Session, datos: dict, usuario_id: int, foto: Optional[UploadFile] = None):
        foto_path = None
        if foto and foto.filename:
            foto_path = GuiaService._guardar_foto(foto, datos.get("numero_guia", "guia"))

        guia = Guia(
            cotizacion_id=datos.get("cotizacion_id"),
            cotizacion_consecutivo=datos.get("cotizacion_consecutivo"),
            transportadora=datos["transportadora"],
            numero_guia=datos["numero_guia"],
            fecha_despacho=datos["fecha_despacho"],
            destinatario=datos.get("destinatario"),
            direccion_destino=datos.get("direccion_destino"),
            ciudad_destino=datos.get("ciudad_destino"),
            telefono_destinatario=datos.get("telefono_destinatario"),
            unidades=datos.get("unidades"),
            peso_kg=datos.get("peso_kg"),
            valor_declarado=datos.get("valor_declarado"),
            valor_recaudo=datos.get("valor_recaudo"),
            costo_flete=datos.get("costo_flete"),
            referencia_interna=datos.get("referencia_interna"),
            observaciones=datos.get("observaciones"),
            foto_guia_path=foto_path,
            estado="generada",
            usuario_id=usuario_id,
        )
        db.add(guia)
        db.flush()

        db.add(GuiaHistorial(
            guia_id=guia.id,
            estado="generada",
            nota=None,
            usuario_id=usuario_id,
        ))
        db.commit()
        db.refresh(guia)
        return guia

    @staticmethod
    def listar(
        db: Session,
        estado: Optional[str] = None,
        transportadora: Optional[str] = None,
        fecha_inicio=None,
        fecha_fin=None,
        buscar: Optional[str] = None,
    ):
        consulta = db.query(Guia)
        if estado:
            consulta = consulta.filter(Guia.estado == estado)
        if transportadora:
            consulta = consulta.filter(Guia.transportadora == transportadora)
        if fecha_inicio:
            consulta = consulta.filter(Guia.fecha_despacho >= fecha_inicio)
        if fecha_fin:
            consulta = consulta.filter(Guia.fecha_despacho <= fecha_fin)
        if buscar:
            like = f"%{buscar}%"
            consulta = consulta.filter(
                Guia.numero_guia.ilike(like) |
                Guia.destinatario.ilike(like) |
                Guia.ciudad_destino.ilike(like)
            )
        return consulta.order_by(Guia.created_at.desc()).all()

    @staticmethod
    def obtener_por_id(db: Session, guia_id: int):
        return db.query(Guia).filter(Guia.id == guia_id).first()

    @staticmethod
    def editar(db: Session, guia: Guia, datos: dict, foto: Optional[UploadFile] = None):
        if foto and foto.filename:
            datos["foto_guia_path"] = GuiaService._guardar_foto(foto, guia.numero_guia)
        for campo, valor in datos.items():
            if hasattr(guia, campo):
                setattr(guia, campo, valor)
        guia.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(guia)
        return guia

    @staticmethod
    def cambiar_estado(db: Session, guia: Guia, estado: str, nota: Optional[str], usuario_id: int):
        guia.estado = estado
        guia.updated_at = datetime.now(timezone.utc)
        db.add(GuiaHistorial(
            guia_id=guia.id,
            estado=estado,
            nota=nota,
            usuario_id=usuario_id,
        ))
        db.commit()
        db.refresh(guia)
        return guia