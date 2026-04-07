from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.db import get_db
from typing import Optional
from datetime import date
from app.services.cotizaciones import CotizacionesService
from app.schemas.cotizaciones import CotizacionCreate, CotizacionResponse

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


@router.post("/", response_model=CotizacionResponse)
def crear_cotizacion(
    data: CotizacionCreate,
    db: Session = Depends(get_db),
):
    return CotizacionesService.crear(db, data, usuario_id=1)


@router.get("/", response_model=list[CotizacionResponse])
def listar_cotizaciones(
    db: Session = Depends(get_db),
    cliente: Optional[str] = Query(None),
    consecutivo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    return CotizacionesService.listar(
        db,
        cliente=cliente,
        consecutivo=consecutivo,
        estado=estado,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )

@router.get("/{cotizacion_id}", response_model=CotizacionResponse)
def detalle_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
):
    cotizacion = CotizacionesService.obtener_por_id(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion