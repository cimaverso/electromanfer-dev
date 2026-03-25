from fastapi import APIRouter
from app.services.productos import ProductosService

router = APIRouter()

router = APIRouter(
    prefix="/productos",
    tags=["Prodcutos"]
)


@router.get("/")
async def buscar_productos(q: str = ""):
    return await ProductosService.buscar_productos(q)


@router.get("/{cod_ref}")
async def detalle_producto(cod_ref: str):
    return await ProductosService.obtener_producto_detalle(cod_ref)