from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.core.db import get_db
from app.schemas.firmas import FirmaOut
from app.services.firmas import FirmasService
from app.schemas.auth import TokenData
from app.core.security import require_auth, require_admin

router = APIRouter(prefix="/firmas", tags=["firmas"])


@router.get("", response_model=list[FirmaOut])
def listar_firmas(db: Session = Depends(get_db), token : TokenData = Depends(require_auth)):
    return FirmasService.listar(db, usuario_id=token.user_id)


@router.post("", response_model=FirmaOut)
def subir_firma(
    nombre: str = Form(...),
    descripcion: Optional[str] = Form(None),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return FirmasService.subir(nombre, descripcion, archivo, db)


@router.delete("/{firma_id}")
def eliminar_firma(firma_id: int, db: Session = Depends(get_db),  _: TokenData = Depends(require_admin)):
    return FirmasService.eliminar(firma_id, db)