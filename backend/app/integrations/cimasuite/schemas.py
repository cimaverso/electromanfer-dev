from typing import Optional, Any
from pydantic import BaseModel


class ConectarNumeroRequest(BaseModel):
    code: str
    display_name: str


class ConectarNumeroResponse(BaseModel):
    status: str
    phone_number_id: str
    waba_id: str
    connection_type: Optional[str] = None


class ConversacionesResponse(BaseModel):
    data: list[dict[str, Any]]
    pagination: dict[str, Any]


class MensajesResponse(BaseModel):
    conversation_id: int
    is_open: bool
    contact: dict[str, Any]
    contact_phone: dict[str, Any]
    messages: list[dict[str, Any]]
    pagination: dict[str, Any]


class EnviarTextoRequest(BaseModel):
    to: str
    message: str
    conversation_id: Optional[int] = None


class EnviarMensajeResponse(BaseModel):
    class Config:
        extra = "allow"


class ActualizarFlagsRequest(BaseModel):
    is_pinned: Optional[bool] = None
    is_muted: Optional[bool] = None
    is_archived: Optional[bool] = None
    is_priority: Optional[bool] = None


class CrearPlantillaRequest(BaseModel):
    name: str
    language: str = "es"
    category: str  # MARKETING | UTILITY
    components: list[dict[str, Any]]


class EnviarPlantillaRequest(BaseModel):
    to: str
    template_name: str
    language: str = "es"
    components: Optional[list[dict[str, Any]]] = None
    preview_text: Optional[str] = None
    conversation_id: Optional[int] = None
