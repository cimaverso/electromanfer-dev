# app/schemas/auth.py

from pydantic import BaseModel
from app.schemas.usuarios import UsuariosRead


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UsuariosRead

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenData(BaseModel):
    name: str
    email: str | None = None
    user_id: int | None = None
    role: str | None = None