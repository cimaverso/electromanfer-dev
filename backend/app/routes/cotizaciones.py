from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from typing import Optional
from datetime import date
from app.services.cotizaciones import CotizacionesService
from app.schemas.cotizaciones import CotizacionCreate, CotizacionResponse
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


@router.get("/", response_model=list[CotizacionResponse])
def listar_cotizaciones(
    db: Session = Depends(get_db),
    cliente: Optional[str] = Query(None),
    consecutivo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    _: TokenData = Depends(require_auth)
):
    return CotizacionesService.listar(
        db,
        cliente=cliente,
        consecutivo=consecutivo,
        estado=estado,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )


@router.post("/", response_model=CotizacionResponse)
def crear_cotizacion(
    data: CotizacionCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return CotizacionesService.crear(db, data, usuario_id=1)


@router.get("/{cotizacion_id}", response_model=CotizacionResponse)
def detalle_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    cotizacion = CotizacionesService.obtener_por_id(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion