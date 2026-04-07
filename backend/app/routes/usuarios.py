# app/routes/usuario.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.usuarios import (
    UsuariosCreate,
    UsuariosRead,
    UsuariosUpdateAdmin
)
from app.services.usuarios import UsuariosService
from app.schemas.auth import TokenData
from app.core.security import require_admin

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.get("/", response_model=list[UsuariosRead])
def listar_usuarios(
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin)
):
    return UsuariosService.listar_usuarios(db)

@router.post("/", response_model=UsuariosRead, status_code=201)
def crear_usuario(
    usuario_data: UsuariosCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin)
):
    usuario = UsuariosService.crear_usuario(db, usuario_data)
    if not usuario:
        raise HTTPException(
            status_code=400,
            detail="El email o cédula ya están registrados"
        )
    return usuario

@router.get("/{usuario_id}", response_model=UsuariosRead)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin)
):
    usuario = UsuariosService.buscar_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.patch("/{usuario_id}", response_model=UsuariosRead)
def actualizar_usuario(
    usuario_id: int,
    data: UsuariosUpdateAdmin,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_admin)
):
    usuario = UsuariosService.actualizar_por_admin(db, usuario_id, data)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario