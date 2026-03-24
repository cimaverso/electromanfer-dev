# app/schemas/auth.py

from pydantic import BaseModel
from app.schemas.usuario import UsuarioRead


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UsuarioRead

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenData(BaseModel):
    name: str
    email: str | None = None
    user_id: int | None = None
    role: str | None = None