from pydantic import BaseModel
from typing import Optional
from app.core.config import settings

class FirmaOut(BaseModel):
    id: int
    nombre: str
    url: str
    usuario_id: Optional[int] = None

    @property
    def url_absoluta(self) -> str:
        return f"{settings.API_BASE_URL}{self.url}"

    model_config = {"from_attributes": True}