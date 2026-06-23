from pydantic import BaseModel


class TransportadoraCreate(BaseModel):
    nombre: str


class TransportadoraOut(BaseModel):
    id: int
    nombre: str
    activa: bool

    class Config:
        from_attributes = True