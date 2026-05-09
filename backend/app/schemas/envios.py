from pydantic import BaseModel
from typing import Optional

class EnviarEmailSchema(BaseModel):
    destino: str
    asunto: str
    cuerpo: str
    firma_url: Optional[str] = None
    firma_id: Optional[int] = None
    pdf_base64: Optional[str] = None
    adjuntos_imagenes: Optional[list] = None
    adjuntos_pdfs: Optional[list] = None
    in_reply_to: Optional[str] = None
    references: Optional[str] = None

class EnviarWhatsappSchema(BaseModel):
    telefono: str
    mensaje: str

class ResponderHiloSchema(BaseModel):
    thread_id: str
    destino: str
    asunto: str
    cuerpo: str
    in_reply_to: str | None = None
    references: str | None = None
    firma_url: Optional[str] = None

class ResponderConAdjuntosSchema(BaseModel):
    thread_id: str
    destino: str
    asunto: str
    cuerpo: str
    in_reply_to: Optional[str] = None
    references: Optional[str] = None
    archivos: Optional[list] = None
    firma_url: Optional[str] = None