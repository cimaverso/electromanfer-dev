import httpx
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.models.clientes import Clientes
from app.core.config import settings
from app.core.db import SessionLocal

logger = logging.getLogger(__name__)


class ClientesService:

    @staticmethod
    def buscar_clientes(db: Session, q: str = "") -> list[Clientes]:
        stmt = select(Clientes)
        if q:
            termino = f"%{q.lower()}%"
            stmt = stmt.where(
                or_(
                    Clientes.nombre_razon_social.ilike(termino),
                    Clientes.nit_cedula.ilike(termino),
                )
            ).limit(20)
        else:
            stmt = stmt.limit(20)
        return db.execute(stmt).scalars().all()

    @staticmethod
    def _fetch_externos() -> list[dict]:
        try:
            with httpx.Client(timeout=60) as client:
                response = client.get(
                    settings.EXTERNAL_API_CLIENTES,
                    headers={"x-api-key": settings.EXTERNAL_API_KEY},
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error al consumir API clientes: {e}")
            return []

    @staticmethod
    def sincronizar() -> None:
        logger.info("Iniciando sincronización de clientes...")
        externos = ClientesService._fetch_externos()

        if not externos:
            logger.warning("Sin datos de clientes, se omite la sincronización.")
            return

        db: Session = SessionLocal()
        try:
            insertados = actualizados = 0

            for item in externos:
                nit = item.get("cod_ter", "").strip()
                if not nit:
                    continue

                stmt = select(Clientes).where(Clientes.nit_cedula == nit)
                cliente = db.execute(stmt).scalar_one_or_none()

                if cliente is None:
                    db.add(Clientes(
                        nit_cedula=nit,
                        nombre_razon_social=item.get("nom_ter", ""),
                        email=item.get("email") or None,
                        telefono=item.get("cel") or item.get("tell") or None,
                        ciudad=item.get("ciudad") or None,
                        direccion=item.get("dir") or None,
                    ))
                    insertados += 1
                else:
                    cliente.nombre_razon_social = item.get("nom_ter", cliente.nombre_razon_social)
                    cliente.email = item.get("email") or cliente.email
                    cliente.telefono = item.get("cel") or item.get("tell") or cliente.telefono
                    cliente.ciudad = item.get("ciudad") or cliente.ciudad
                    cliente.direccion = item.get("dir") or cliente.direccion
                    actualizados += 1

            db.commit()
            logger.info(f"Clientes — insertados: {insertados}, actualizados: {actualizados}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error sincronizando clientes: {e}")
        finally:
            db.close()