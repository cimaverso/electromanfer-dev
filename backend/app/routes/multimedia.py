from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.multimedia import MultimediaService
from app.schemas.multimedia import ArchivoResponse, MultimediaResponse
from app.schemas.auth import TokenData
from app.core.security import require_admin

router = APIRouter(prefix="/multimedia", tags=["Multimedia"])


@router.get("/{cod_ref}", response_model=MultimediaResponse)
def listar_archivos(cod_ref: str, db: Session = Depends(get_db)):
    return MultimediaService.listar(db, cod_ref)


@router.post("/{cod_ref}/imagen", response_model=ArchivoResponse)
async def subir_imagen(cod_ref: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await MultimediaService.subir_imagen(db, cod_ref, file)


@router.post("/{cod_ref}/pdf", response_model=ArchivoResponse)
async def subir_pdf(cod_ref: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await MultimediaService.subir_pdf(db, cod_ref, file)


@router.patch("/{archivo_id}/principal", response_model=ArchivoResponse)
def marcar_principal(archivo_id: int, db: Session = Depends(get_db)):
    return MultimediaService.marcar_principal(db, archivo_id)


@router.delete("/{archivo_id}")
def eliminar_archivo(
    archivo_id: int, 
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin)
):
    return MultimediaService.eliminar(db, archivo_id)