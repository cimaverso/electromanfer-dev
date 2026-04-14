from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.core.db import get_db
from app.schemas.firmas import FirmaOut
from app.services.firmas import FirmasService

router = APIRouter(prefix="/firmas", tags=["firmas"])


@router.get("", response_model=list[FirmaOut])
def listar_firmas(db: Session = Depends(get_db)):
    return FirmasService.listar(db)


@router.post("", response_model=FirmaOut)
def subir_firma(
    nombre: str = Form(...),
    descripcion: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return FirmasService.subir(nombre, descripcion, archivo, db)


@router.delete("/{firma_id}")
def eliminar_firma(firma_id: int, db: Session = Depends(get_db)):
    return FirmasService.eliminar(firma_id, db)