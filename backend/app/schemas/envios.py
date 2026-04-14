from pydantic import BaseModel
from typing import Optional

class EnviarEmailSchema(BaseModel):
    destino: str
    asunto: str
    cuerpo: str
    firma_url: Optional[str] = None
    pdf_base64: Optional[str] = None
    adjuntos_imagenes: Optional[list] = None
    adjuntos_pdfs: Optional[list] = None

class EnviarWhatsappSchema(BaseModel):
    telefono: str
    mensaje: str