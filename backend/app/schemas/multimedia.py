from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ArchivoResponse(BaseModel):
    id: int
    tipo: str
    titulo: Optional[str] = None
    url: str
    principal: bool
    seleccionada: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class MultimediaResponse(BaseModel):
    imagenes: list[ArchivoResponse] = []
    pdfs: list[ArchivoResponse] = []

class SeleccionadaPayload(BaseModel):
    seleccionada: bool