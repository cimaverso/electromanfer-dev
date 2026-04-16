import httpx
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.models.productos import Productos
from app.core.config import settings
from app.core.db import SessionLocal

logger = logging.getLogger(__name__)


class ProductosService:

    @staticmethod
    def buscar_productos(db: Session, q: str = "") -> list[Productos]:
        stmt = select(Productos)

        if q:
            termino = f"%{q.lower()}%"
            stmt = stmt.where(
                or_(
                    Productos.nom_ref.ilike(termino),
                    Productos.cod_ref.ilike(termino),
                    Productos.nom_tip.ilike(termino),
                )
            )

        resultado = db.execute(stmt.limit(50))
        return resultado.scalars().all()

    @staticmethod
    def buscar_por_cod_ref(db: Session, cod_ref: str) -> Optional[Productos]:
        stmt = select(Productos).where(Productos.cod_ref == cod_ref)
        resultado = db.execute(stmt)
        return resultado.scalar_one_or_none()

    # Sincronización

    @staticmethod
    def _fetch_externos() -> list[dict]:
        """Llama a la API externa de forma síncrona."""
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(
                    settings.EXTERNAL_API_PRODUCTOS,
                    headers={"x-api-key": settings.EXTERNAL_API_KEY},
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error al consumir API externa: {e}")
            return []

    @staticmethod
    def sincronizar() -> None:
        """Upsert de productos desde la API externa. Lo llama el scheduler."""
        logger.info("Iniciando sincronización de productos...")
        externos = ProductosService._fetch_externos()

        if not externos:
            logger.warning("Sin datos de la API externa, se omite la sincronización.")
            return

        db: Session = SessionLocal()
        try:
            insertados = actualizados = 0
            

            for item in externos:
                cod = item.get("cod_ref", "").strip()
                if not cod:
                    continue

                stmt = select(Productos).where(Productos.cod_ref == cod)
                producto = db.execute(stmt).scalar_one_or_none()

                if producto is None:
                    db.add(Productos(
                        cod_ref         = cod,
                        nom_ref         = item.get("nom_ref", ""),
                        cod_tip         = item.get("cod_tip"),
                        nom_tip         = item.get("nom_tip"),
                        saldo           = item.get("saldo"),
                        valor_web       = item.get("valor_web"),
                        
                    ))
                    insertados += 1
                else:
                    producto.nom_ref         = item.get("nom_ref", producto.nom_ref)
                    producto.cod_tip         = item.get("cod_tip", producto.cod_tip)
                    producto.nom_tip         = item.get("nom_tip", producto.nom_tip)
                    producto.saldo           = item.get("saldo", producto.saldo)
                    producto.valor_web       = item.get("valor_web", producto.valor_web)
                    actualizados += 1

            db.commit()
            logger.info(f"Sincronización completa — insertados: {insertados}, actualizados: {actualizados}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error durante la sincronización: {e}")
        finally:
            db.close()

    @staticmethod
    def listar_internos(db: Session, q: str = "") -> list[Productos]:
        stmt = select(Productos).where(Productos.origen == 'interno')
        if q:
            termino = f"%{q.lower()}%"
            stmt = stmt.where(
                or_(
                    Productos.nom_ref.ilike(termino),
                    Productos.cod_ref.ilike(termino),
                )
            )
        return db.execute(stmt.limit(50)).scalars().all()

    @staticmethod
    def crear_interno(db: Session, data) -> Productos:
        # Verificar que no exista el cod_ref
        existe = db.execute(
            select(Productos).where(Productos.cod_ref == data.cod_ref)
        ).scalar_one_or_none()
        if existe:
            from fastapi import HTTPException
            raise HTTPException(400, f"Ya existe un producto con código {data.cod_ref}")
        
        producto = Productos(
            cod_ref   = data.cod_ref,
            nom_ref   = data.nom_ref,
            cod_tip   = data.cod_tip,
            nom_tip   = data.nom_tip,
            saldo     = data.saldo,
            valor_web = data.valor_web,
            origen    = 'interno'
        )
        db.add(producto)
        db.commit()
        db.refresh(producto)
        return producto


    @staticmethod
    def actualizar_interno(db: Session, cod_ref: str, data) -> Productos:
        producto = db.execute(
            select(Productos).where(
                Productos.cod_ref == cod_ref,
                Productos.origen == 'interno'
            )
        ).scalar_one_or_none()
        if not producto:
            from fastapi import HTTPException
            raise HTTPException(404, "Producto interno no encontrado")
        
        producto.nom_ref   = data.nom_ref
        producto.cod_tip   = data.cod_tip
        producto.nom_tip   = data.nom_tip
        producto.saldo     = data.saldo
        producto.valor_web = data.valor_web
        db.commit()
        db.refresh(producto)
        return producto

    @staticmethod
    def eliminar_interno(db: Session, cod_ref: str) -> dict:
        producto = db.execute(
            select(Productos).where(
                Productos.cod_ref == cod_ref,
                Productos.origen == 'interno'
            )
        ).scalar_one_or_none()
        if not producto:
            from fastapi import HTTPException
            raise HTTPException(404, "Producto interno no encontrado")
        db.delete(producto)
        db.commit()
        return {"ok": True}