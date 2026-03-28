from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClienteCreate(BaseModel):
    nombre_razon_social: str
    nit_cedula: Optional[str] = None
    nombre_contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    observaciones: Optional[str] = None


class ClienteUpdate(BaseModel):
    nombre_razon_social: Optional[str] = None
    nit_cedula: Optional[str] = None
    nombre_contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    observaciones: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    tipo_cliente: str
    nombre_razon_social: str
    nit_cedula: Optional[str] = None
    nombre_contacto: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True