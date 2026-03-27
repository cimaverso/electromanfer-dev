# Servicio para modelo Usuarios, solo registro de ADMIN
# app/services/usuario.py

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuarios import Usuarios
from app.schemas.usuarios import UsuariosCreate
from app.enums import RoleEnum

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UsuariosService:

    @staticmethod
    def buscar_por_id(db: Session, usu_id: int) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.usu_id == usu_id)
        resultado = db.execute(stmt)
        return resultado.scalar_one_or_none()

    @staticmethod
    def buscar_por_email(db: Session, usu_email: str) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.usu_email == usu_email)
        resultado = db.execute(stmt)
        return resultado.scalar_one_or_none()
    
    @staticmethod
    def buscar_por_nombre(db: Session, usu_nombre: str) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.usu_nombre == usu_nombre)
        resultado = db.execute(stmt)
        return resultado.scalar_one_or_none()

    @staticmethod
    def crear_usuario_admin(db: Session, usu_data: UsuariosCreate) -> Usuarios:
        email_clean = usu_data.usu_email.strip().lower()
        usu_encontrado = UsuariosService.buscar_por_email(db, email_clean)
        if usu_encontrado:
            return None
        
        hashed_password = pwd_context.hash(usu_data.usu_password[:72])

        nuevo_admin = Usuarios(
            usu_nombre = usu_data.usu_nombre,
            usu_email = email_clean,
            usu_password = hashed_password,
            usu_role = getattr(usu_data, "usu_role", None) or RoleEnum.ASESOR
        )

        db.add(nuevo_admin)
        db.commit()
        db.refresh(nuevo_admin)
        return nuevo_admin