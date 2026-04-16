from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductoInternoCreate(BaseModel):
    cod_ref: str
    nom_ref: str
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    saldo: Optional[float] = None
    valor_web: Optional[float] = None


class ProductoInternoUpdate(BaseModel):
    nom_ref: Optional[str] = None
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    saldo: Optional[float] = None
    valor_web: Optional[float] = None

class ProductoResponse(BaseModel):
    id: int
    cod_ref: str
    nom_ref: str
    cod_tip: Optional[str] = None
    nom_tip: Optional[str] = None
    saldo: Optional[float] = None
    valor_web: Optional[float] = None
    origen: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}