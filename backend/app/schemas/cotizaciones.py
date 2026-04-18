from pydantic import BaseModel, model_validator
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
    imagenes_urls: Optional[list] = None
    fichas_urls: Optional[list] = None

    class Config:
        from_attributes = True


class CotizacionCreate(BaseModel):
    cliente: ClienteCreate
    items: list[ItemCreate]
    notas: Optional[str] = None
    observaciones_pdf: Optional[str] = None

class CambiarEstadoSchema(BaseModel):
    estado: str


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
    usuario_nombre: Optional[str] = None  
    clientes: Optional[ClienteResponse] = None
    cotizaciones_items: list[ItemResponse] = []

    @model_validator(mode='before')
    @classmethod
    def poblar_usuario_nombre(cls, data):
        if hasattr(data, 'usuarios') and data.usuarios:
            data.__dict__['usuario_nombre'] = data.usuarios.nombre_completo
        return data

    class Config:
        from_attributes = True