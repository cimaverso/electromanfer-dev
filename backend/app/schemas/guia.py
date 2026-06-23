from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date, datetime

ESTADOS_VALIDOS = {"generada", "despachada", "en_transito", "entregada", "novedad"}


class HistorialItem(BaseModel):
    id: int
    estado: str
    nota: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GuiaOut(BaseModel):
    id: int
    cotizacion_id: Optional[int] = None
    cotizacion_consecutivo: Optional[str] = None
    transportadora: str
    numero_guia: str
    fecha_despacho: date
    destinatario: Optional[str] = None
    direccion_destino: Optional[str] = None
    ciudad_destino: Optional[str] = None
    telefono_destinatario: Optional[str] = None
    unidades: Optional[int] = None
    peso_kg: Optional[float] = None
    valor_declarado: Optional[float] = None
    valor_recaudo: Optional[float] = None
    costo_flete: Optional[float] = None
    referencia_interna: Optional[str] = None
    observaciones: Optional[str] = None
    foto_guia_path: Optional[str] = None
    estado: str
    created_at: datetime
    updated_at: datetime
    historial: List[HistorialItem] = []

    class Config:
        from_attributes = True


class CambioEstadoGuia(BaseModel):
    estado: str
    nota: Optional[str] = None

    @validator("estado")
    def validar_estado(cls, v):
        if v not in ESTADOS_VALIDOS:
            raise ValueError(f"Estado inválido. Valores permitidos: {', '.join(ESTADOS_VALIDOS)}")
        return v