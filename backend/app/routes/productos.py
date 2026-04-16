# app/routes/productos.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.productos import ProductosService
from app.schemas.auth import TokenData
from app.core.security import require_auth
from app.schemas.productos import ProductoInternoCreate, ProductoResponse, ProductoInternoUpdate

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/")
def buscar_productos(
    q: str = "",
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.buscar_productos(db, q)

@router.get("/internos/", response_model=list[ProductoResponse])
def listar_internos(
    q: str = "",
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.listar_internos(db, q)

@router.post("/internos/", response_model=ProductoResponse)
def crear_interno(
    data: ProductoInternoCreate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.crear_interno(db, data)

@router.delete("/internos/{cod_ref}")
def eliminar_interno(
    cod_ref: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.eliminar_interno(db, cod_ref)

@router.patch("/internos/{cod_ref}", response_model=ProductoResponse)
def actualizar_interno(
    cod_ref: str,
    data: ProductoInternoUpdate,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.actualizar_interno(db, cod_ref, data)

@router.get("/{cod_ref}")
def detalle_producto(
    cod_ref: str,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    return ProductosService.buscar_por_cod_ref(db, cod_ref)