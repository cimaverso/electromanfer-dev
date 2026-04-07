from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ArchivoResponse(BaseModel):
    id: int
    tipo: str
    titulo: Optional[str]
    url: str
    principal: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MultimediaResponse(BaseModel):
    imagenes: list[ArchivoResponse] = []
    pdfs: list[ArchivoResponse] = []
