# app/services/productos_service.py

from typing import List, Dict, Optional
import httpx
from app.core.config import settings


class ProductosService:

    @staticmethod
    async def obtener_productos_externos() -> List[Dict]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    settings.EXTERNAL_API_PRODUCTOS,
                    headers={
                        "x-api-key": settings.EXTERNAL_API_KEY
                    },
                    timeout=10
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print("Error consumiendo API externa:", e)
            return []

    @staticmethod
    async def buscar_productos(query: str) -> List[Dict]:
        data = await ProductosService.obtener_productos_externos()

        q = query.lower().strip()
        resultados = []

        for p in data:
            if (
                q in p["nom_ref"].lower()
                or q in p["cod_ref"].lower()
                or q in p["nom_tip"].lower()
            ):
                resultados.append(p)

        return resultados[:50]

    @staticmethod
    async def obtener_producto_detalle(cod_ref: str) -> Optional[Dict]:
        data = await ProductosService.obtener_productos_externos()

        producto = next(
            (p for p in data if p["cod_ref"].lower() == cod_ref.lower()),
            None
        )

        return producto