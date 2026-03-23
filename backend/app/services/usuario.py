# Servicio para modelo Usuarios, solo registro de ADMIN
# app/services/usuario.py

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate
from app.enums import RoleEnum

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UsuarioService:

    @staticmethod
    def buscar_por_email(db: Session, usu_email: str) -> Optional[Usuario]:
        stmt = select(Usuario).where(Usuario.usu_email == usu_email)
        resultado = db.execute(stmt)
        return resultado.scalar_one_or_none()

    @staticmethod
    def crear_usuario_admin(db: Session, usu_data: UsuarioCreate) -> Usuario:
        usu_encontrado = UsuarioService.buscar_por_email(db, usu_data.usu_email)
        if usu_encontrado:
            return None
        
        hashed_password = pwd_context.hash(usu_data.usu_password[:72])

        nuevo_admin = Usuario(
            usu_nombre = usu_data.usu_nombre,
            usu_email = usu_data.usu_email,
            usu_password = hashed_password,
            usu_role =  RoleEnum.ASESOR# ADMIN
        )

        db.add(nuevo_admin)
        db.commit()
        db.refresh(nuevo_admin)
        return nuevo_admin