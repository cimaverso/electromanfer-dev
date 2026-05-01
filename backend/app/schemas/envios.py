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

class EnviarWhatsappSchema(BaseModel):
    telefono: str
    mensaje: str