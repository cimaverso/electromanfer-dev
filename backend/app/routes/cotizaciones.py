from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user_data
from app.models.usuarios import Usuarios
from app.services.cotizaciones import CotizacionesService
from app.schemas.cotizaciones import CotizacionCreate, CotizacionResponse

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


@router.post("/", response_model=CotizacionResponse)
def crear_cotizacion(
    data: CotizacionCreate,
    db: Session = Depends(get_db),
    usuario: Usuarios = Depends(get_current_user_data)
):
    return CotizacionesService.crear(db, data, usuario.user_id)


@router.get("/", response_model=list[CotizacionResponse])
def listar_cotizaciones(
    db: Session = Depends(get_db),
    usuario: Usuarios = Depends(get_current_user_data)
):
    return CotizacionesService.listar(db)

@router.get("/{cotizacion_id}", response_model=CotizacionResponse)
def detalle_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuarios = Depends(get_current_user_data)
):
    cotizacion = CotizacionesService.obtener_por_id(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion