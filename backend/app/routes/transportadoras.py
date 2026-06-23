from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.transportadora import TransportadoraService
from app.schemas.transportadora import TransportadoraCreate, TransportadoraOut
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/transportadoras", tags=["Transportadoras"])


@router.get("/", response_model=list[TransportadoraOut])
def listar_transportadoras(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth),
):
    return TransportadoraService.listar(db)


@router.post("/", response_model=TransportadoraOut, status_code=201)
def crear_transportadora(
    body: TransportadoraCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth),
):
    transportadora, error = TransportadoraService.crear(db, body.nombre)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return transportadora