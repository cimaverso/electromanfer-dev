# Creacion y deco del token
# app/core/security.py

from datetime import datetime, timedelta, UTC
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.schemas.auth import TokenData

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=30))

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_data(token: str = Depends(oauth2_scheme)) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        nombre: str = payload.get("user_name")
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: id = payload.get("role")

        if email is None or user_id is None:
            return None
        
        return TokenData(name=nombre,email=email, user_id=user_id, role=role)
    except JWTError:
        return None
    

def require_admin(token_data: TokenData = Depends(get_current_user_data)):
    if token_data.role != "ADMINISTRADOR":
        return None
    return token_data