# Schema para Usuarios, solo registro de ADMIN
# app/schemas/usuario.py

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

# Base 
class UsuariosBase(BaseModel):
    email: EmailStr
    usuario: str = Field(..., max_length=50)
    nombre_completo: str = Field(..., max_length=100)
    cedula_ciudadania: Optional[str] = Field(None, max_length=12)

# Lectura 
class UsuariosRead(UsuariosBase):
    id: int
    rol: str
    activo: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Auth /me 
class UsuariosAuthMe(BaseModel):
    id: int
    usuario: str
    email: EmailStr
    nombre_completo: str
    cedula_ciudadania: Optional[str] = None
    rol: str
    activo: bool

    class Config:
        from_attributes = True

# Crear
class UsuariosCreate(UsuariosBase):
    clave: str = Field(..., max_length=255)
    rol: str = Field(default="ADMINISTRADOR", max_length=50)

    class Config:
        from_attributes = True

# Actualización perfil propio 

class UsuariosUpdatePerfil(BaseModel):
    email: Optional[EmailStr] = None
    nombre_completo: Optional[str] = Field(None, max_length=100)
    cedula_ciudadania: Optional[str] = Field(None, max_length=12)
    clave: Optional[str] = Field(None, max_length=255)

    class Config:
        from_attributes = True

# Actualización 

class UsuariosUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    usuario: Optional[str] = Field(None, max_length=50)
    nombre_completo: Optional[str] = Field(None, max_length=100)
    cedula_ciudadania: Optional[str] = Field(None, max_length=12)
    rol: Optional[str] = Field(None, max_length=50)
    activo: Optional[bool] = None

    class Config:
        from_attributes = True