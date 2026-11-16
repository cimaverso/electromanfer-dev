"""API de solo lectura para que Siasoft consulte las cotizaciones facturadas.

Protegida con una API key propia (header X-API-Key), con tope de peticiones por
minuto y paginación obligatoria, para que un cliente externo no pueda tumbar la API.
"""
import hmac
import time
from collections import deque
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import settings
from app.core.db import get_db
from app.models.cotizaciones import Cotizaciones

router = APIRouter(prefix="/facturadas", tags=["Facturadas"])

# Esquema de seguridad: hace que /docs muestre el botón Authorize para pegar la clave.
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False, description="Clave entregada por Electromanfer")

LIMITE_MAXIMO = 100
LIMITE_DEFECTO = 50

_peticiones: deque = deque()


def verificar_siasoft(x_api_key: Optional[str] = Depends(api_key_header)) -> None:
    clave = settings.SIASOFT_API_KEY
    if not clave:
        raise HTTPException(status_code=503, detail="Integración con Siasoft desactivada")
    if not x_api_key or not hmac.compare_digest(x_api_key.encode(), clave.encode()):
        raise HTTPException(status_code=401, detail="API key inválida")

    # Ventana deslizante de 60 s. Un solo proceso de uvicorn: basta memoria local.
    ahora = time.monotonic()
    while _peticiones and ahora - _peticiones[0] >= 60:
        _peticiones.popleft()
    if len(_peticiones) >= settings.SIASOFT_RATE_LIMIT_POR_MINUTO:
        espera = max(1, int(60 - (ahora - _peticiones[0])) + 1)
        raise HTTPException(
            status_code=429,
            detail="Demasiadas peticiones, intente más tarde",
            headers={"Retry-After": str(espera)},
        )
    _peticiones.append(ahora)


class ClienteFacturada(BaseModel):
    nit_cedula: Optional[str] = None
    nombre_razon_social: Optional[str] = None
    nombre_contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None

    class Config:
        from_attributes = True


class ItemFacturada(BaseModel):
    cod_ref: str
    nom_ref: str
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    cantidad: float
    precio_unitario: float
    descuento_unitario: float
    por_iva: float
    subtotal: float
    total: float

    class Config:
        from_attributes = True


class CotizacionFacturada(BaseModel):
    consecutivo: str
    estado: str
    numero_factura: Optional[str] = None
    fecha_facturacion: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    vendedor: Optional[str] = None
    subtotal: float
    descuento: float
    total: float
    notas: Optional[str] = None
    cliente: Optional[ClienteFacturada] = None
    items: list[ItemFacturada] = []


class PaginaCotizacionesFacturadas(BaseModel):
    total: int
    limit: int
    offset: int
    data: list[CotizacionFacturada]


def _a_respuesta(c: Cotizaciones) -> CotizacionFacturada:
    return CotizacionFacturada(
        consecutivo=c.consecutivo,
        estado=c.estado,
        numero_factura=c.numero_factura,
        fecha_facturacion=c.fecha_facturacion,
        created_at=c.created_at,
        updated_at=c.updated_at,
        vendedor=c.usuarios.nombre_completo if c.usuarios else None,
        subtotal=c.subtotal,
        descuento=c.descuento,
        total=c.total,
        notas=c.notas,
        cliente=ClienteFacturada.model_validate(c.clientes) if c.clientes else None,
        items=[ItemFacturada.model_validate(i) for i in c.cotizaciones_items],
    )


def _base():
    return (
        select(Cotizaciones)
        .options(
            joinedload(Cotizaciones.clientes),
            joinedload(Cotizaciones.usuarios),
            selectinload(Cotizaciones.cotizaciones_items),
        )
        .where(Cotizaciones.estado == "facturada")
    )


# Responde con y sin barra final (/api/facturadas y /api/facturadas/), sin redirecciones.
@router.get("", response_model=PaginaCotizacionesFacturadas, dependencies=[Depends(verificar_siasoft)], include_in_schema=False)
@router.get("/", response_model=PaginaCotizacionesFacturadas, dependencies=[Depends(verificar_siasoft)])
def listar_facturadas(
    db: Session = Depends(get_db),
    facturadas_desde: Optional[datetime] = Query(None, description="fecha_facturacion >= (ISO 8601)"),
    facturadas_hasta: Optional[datetime] = Query(None, description="fecha_facturacion <= (ISO 8601)"),
    actualizadas_desde: Optional[datetime] = Query(None, description="updated_at >= (ISO 8601), para sincronizar solo lo nuevo"),
    limit: int = Query(LIMITE_DEFECTO, ge=1, le=LIMITE_MAXIMO),
    offset: int = Query(0, ge=0),
):
    filtros = [Cotizaciones.estado == "facturada"]
    if facturadas_desde:
        filtros.append(Cotizaciones.fecha_facturacion >= facturadas_desde)
    if facturadas_hasta:
        filtros.append(Cotizaciones.fecha_facturacion <= facturadas_hasta)
    if actualizadas_desde:
        filtros.append(Cotizaciones.updated_at >= actualizadas_desde)

    total = db.execute(select(func.count()).select_from(Cotizaciones).where(*filtros)).scalar_one()
    filas = (
        db.execute(_base().where(*filtros).order_by(Cotizaciones.id.asc()).limit(limit).offset(offset))
        .unique().scalars().all()
    )
    return PaginaCotizacionesFacturadas(total=total, limit=limit, offset=offset, data=[_a_respuesta(c) for c in filas])


@router.get("/{consecutivo}", response_model=CotizacionFacturada, dependencies=[Depends(verificar_siasoft)])
def detalle_facturada(consecutivo: str, db: Session = Depends(get_db)):
    c = db.execute(_base().where(Cotizaciones.consecutivo == consecutivo)).unique().scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Cotización facturada no encontrada")
    return _a_respuesta(c)
