# Schema para Usuarios, solo registro de ADMIN
# app/schemas/usuario.py

from pydantic import BaseModel, Field

class UsuariosBase(BaseModel):
    usu_email: str

class UsuariosRead(UsuariosBase):
    usu_nombre: str
    usu_role: str

class UsuariosAuthMe(UsuariosRead):
    usu_id: int

class UsuariosCreate(UsuariosBase):
    usu_nombre: str = Field(..., max_length=120)
    usu_password: str = Field(..., max_length=72)
    usu_role: str = Field(..., max_length=15)


class Config:
    from_attributes = True