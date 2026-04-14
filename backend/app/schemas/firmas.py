from pydantic import BaseModel, computed_field
from typing import Optional

class FirmaOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    archivo: str

    @computed_field
    @property
    def url(self) -> str:
        return f"/media/firmas/{self.archivo}"

    model_config = {"from_attributes": True}