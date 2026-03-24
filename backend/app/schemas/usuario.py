# Schema para Usuarios, solo registro de ADMIN
# app/schemas/usuario.py

from pydantic import BaseModel, Field
from datetime import datetime

class UsuarioBase(BaseModel):
    usu_email: str

class UsuarioRead(UsuarioBase):
    usu_nombre: str
    usu_role: str

class UsuarioAuthMe(UsuarioRead):
    usu_id: int

class UsuarioCreate(UsuarioBase):
    usu_nombre: str = Field(..., max_length=120)
    usu_password: str = Field(..., max_length=72)
    usu_role: str = Field(..., max_length=15)


class Config:
    from_attributes = True