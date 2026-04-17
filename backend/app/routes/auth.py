from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.auth import Token, TokenData
from app.schemas.usuarios import UsuariosAuthMe
from app.services.auth import auth_service
from app.core.security import get_current_user_data, create_access_token
from app.models.usuarios import Usuarios

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.get("/me", response_model=UsuariosAuthMe)
def get_me(current_user: TokenData = Depends(get_current_user_data), db: Session = Depends(get_db)):
    user = auth_service.auth_me(current_user.user_id, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )
    
    return user

@router.post("/login", response_model=Token)
async def login(
    request: Request, 
    db: Session = Depends(get_db)
):
    
    try:
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
    except Exception:
        form_data = await request.form()
        email = form_data.get("username") 
        password = form_data.get("password")

    if not email or not password:
        raise HTTPException(status_code=422, detail="Email y password son requeridos")

    token_response = auth_service.autheticate_user(email, password, db)
    
    if not token_response:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    return token_response

@router.post("/logout")
def logout(
    current_user: TokenData = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    user = db.query(Usuarios).filter(Usuarios.id == current_user.user_id).first()
    if user:
        user.session_token = None
        db.commit()
    return {"ok": True}


@router.post("/refresh")
def refresh_token(
    current_user: TokenData = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    token_data = {
        "user_name": current_user.name,
        "sub": current_user.email,
        "user_id": current_user.user_id,
        "role": current_user.role
    }
    access_token, session_token = create_access_token(data=token_data)
    
    user = db.query(Usuarios).filter(Usuarios.id == current_user.user_id).first()
    if user:
        user.session_token = session_token
        db.commit()
    
    return {"access_token": access_token}