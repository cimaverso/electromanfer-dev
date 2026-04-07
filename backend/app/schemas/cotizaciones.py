from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.clientes import ClienteCreate, ClienteResponse


class ItemCreate(BaseModel):
    cod_ref: str
    nom_ref: str
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    cantidad: float
    valor_web: float
    descuento_unitario: float = 0.00


class ItemResponse(BaseModel):
    id: int
    cod_ref: str
    nom_ref: str
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    cantidad: float
    precio_unitario: float
    descuento_unitario: float
    subtotal: float
    iva: float
    total: float
    imagen_url: Optional[str] = None
    ficha_tecnica_url: Optional[str] = None

    class Config:
        from_attributes = True


class CotizacionCreate(BaseModel):
    cliente: ClienteCreate
    items: list[ItemCreate]
    notas: Optional[str] = None
    observaciones_pdf: Optional[str] = None


class CotizacionResponse(BaseModel):
    id: int
    consecutivo: str
    estado: str
    subtotal: float
    descuento: float
    iva: float
    total: float
    notas: Optional[str] = None
    observaciones_pdf: Optional[str] = None
    pdf_url: Optional[str] = None
    fecha_envio: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    cliente_id: Optional[int] = None
    usuario_id: int
    clientes: Optional[ClienteResponse] = None
    cotizaciones_items: list[ItemResponse] = []

    class Config:
        from_attributes = True