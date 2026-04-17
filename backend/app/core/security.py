from datetime import datetime, timedelta, UTC
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.schemas.auth import TokenData
from app.enums import RoleEnum
import secrets
from app.core.db import SessionLocal
from app.models.usuarios import Usuarios

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=30))
    session_token = secrets.token_hex(16)
    to_encode.update({"exp": expire, "session_token": session_token})
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded, session_token


def get_current_user_data(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        nombre: str = payload.get("user_name")
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        session_token: str = payload.get("session_token")

        if email is None or user_id is None:
            raise credentials_exception

        # Verificar session_token en BD
        db = SessionLocal()
        try:
            # Después
            user = db.query(Usuarios).filter(Usuarios.id == user_id).first()
            if not user:
                raise credentials_exception
            if user.session_token and user.session_token != session_token:
                raise credentials_exception
        finally:
            db.close()

        return TokenData(name=nombre, email=email, user_id=user_id, role=role)
    except JWTError:
        raise credentials_exception


def require_admin(token_data: TokenData = Depends(get_current_user_data)):
    if token_data.role not in (RoleEnum.ADMINISTRADOR, RoleEnum.GERENTE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción",
        )
    return token_data

def require_auth(token_data: TokenData = Depends(get_current_user_data)):
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
        )
    return token_data