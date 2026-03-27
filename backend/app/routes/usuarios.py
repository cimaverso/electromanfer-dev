# Controller para Usuarios, solo registro de ADMIN
# app/routes/usuario.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.usuarios import UsuariosCreate, UsuariosRead
from app.services.usuarios import UsuariosService

from app.schemas.auth import TokenData
from app.core.security import require_admin

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.get("/")
def hello(db: Session = Depends(get_db), admin: TokenData = Depends(require_admin)):
    return "Hello world"

@router.post("/", response_model=UsuariosRead)
def registrar_admin(admin_data: UsuariosCreate, db: Session = Depends(get_db)):
    usuario = UsuariosService.crear_usuario_admin(db, admin_data)
    if not usuario:
        raise HTTPException(
            status_code=400,
            detail="Error, el email ya existe"
        )
    return usuario