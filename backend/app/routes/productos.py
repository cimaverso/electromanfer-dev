# app/routes/productos.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.productos import ProductosService
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/")
def buscar_productos(
    q: str = "", 
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.buscar_productos(db, q)


@router.get("/{cod_ref}")
def detalle_producto(
    cod_ref: str, 
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.buscar_por_cod_ref(db, cod_ref)