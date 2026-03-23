# app/schemas/auth.py

from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenData(BaseModel):
    email: str | None = None
    user_id: int | None = None
    role: str | None = None