from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.auth import Token, LoginRequest
from app.services.auth import auth_service

router = APIRouter(
    prefix="/login",
    tags=["Login"]
)

@router.post("/", response_model=Token)
async def login(
    request: Request, 
    db: Session = Depends(get_db)
):
    
    try:
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
    except:
        form_data = await request.form()
        email = form_data.get("username") 
        password = form_data.get("password")

    if not email or not password:
        raise HTTPException(status_code=422, detail="Email y password son requeridos")

    token_response = auth_service.autheticate_user(email, password, db)
    
    if not token_response:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    return token_response