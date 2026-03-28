import logging
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.clientes import Clientes
from app.schemas.clientes import ClienteCreate
from typing import Optional

logger = logging.getLogger(__name__)


class ClientesService:

    @staticmethod
    def obtener_o_crear(db: Session, data: ClienteCreate) -> Clientes:
        cliente = None

        # Buscar por nit_cedula primero
        if data.nit_cedula:
            cliente = db.execute(
                select(Clientes).where(Clientes.nit_cedula == data.nit_cedula)
            ).scalar_one_or_none()

        # Si no, buscar por email
        if cliente is None and data.email:
            cliente = db.execute(
                select(Clientes).where(Clientes.email == data.email)
            ).scalar_one_or_none()

        if cliente is None:
            cliente = Clientes(
                nombre_razon_social = data.nombre_razon_social,
                nit_cedula          = data.nit_cedula,
                nombre_contacto     = data.nombre_contacto,
                email               = data.email,
                telefono            = data.telefono,
                direccion           = data.direccion,
                ciudad              = data.ciudad,
            )
            db.add(cliente)
            db.flush()
        else:
            cliente.nombre_razon_social = data.nombre_razon_social
            cliente.nombre_contacto     = data.nombre_contacto
            cliente.email               = data.email
            cliente.telefono            = data.telefono
            cliente.direccion           = data.direccion
            cliente.ciudad              = data.ciudad

        return cliente

    @staticmethod
    def buscar_por_nit(db: Session, nit_cedula: str) -> Optional[Clientes]:
        return db.execute(
            select(Clientes).where(Clientes.nit_cedula == nit_cedula)
        ).scalar_one_or_none()

    @staticmethod
    def buscar_por_email(db: Session, email: str) -> Optional[Clientes]:
        return db.execute(
            select(Clientes).where(Clientes.email == email)
        ).scalar_one_or_none()

    @staticmethod
    def listar(db: Session) -> list[Clientes]:
        return db.execute(
            select(Clientes).order_by(Clientes.id.desc())
        ).scalars().all()