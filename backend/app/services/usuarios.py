# Servicio para modelo Usuarios, solo registro de ADMIN
# app/services/usuario.py

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuarios import Usuarios
from app.schemas.usuarios import UsuariosCreate, UsuariosUpdateAdmin
from app.enums import RoleEnum

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UsuariosService:

    # Búsquedas

    @staticmethod
    def buscar_por_id(db: Session, usuario_id: int) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.id == usuario_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_por_email(db: Session, email: str) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.email == email)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_por_usuario(db: Session, usuario: str) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.usuario == usuario)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def buscar_por_cedula(db: Session, cedula: str) -> Optional[Usuarios]:
        stmt = select(Usuarios).where(Usuarios.cedula_ciudadania == cedula)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def listar_usuarios(db: Session) -> list[Usuarios]:
        stmt = select(Usuarios).order_by(Usuarios.nombre_completo)
        return db.execute(stmt).scalars().all()

    # Crear
    @staticmethod
    def crear_usuario(db: Session, usu_data: UsuariosCreate) -> Optional[Usuarios]:
        email_clean = usu_data.email.strip().lower()

        # Verificar duplicados
        if UsuariosService.buscar_por_email(db, email_clean):
            return None
        if usu_data.cedula_ciudadania and UsuariosService.buscar_por_cedula(db, usu_data.cedula_ciudadania):
            return None

        nuevo_usuario = Usuarios(
            usuario=usu_data.usuario,
            nombre_completo=usu_data.nombre_completo,
            email=email_clean,
            cedula_ciudadania=usu_data.cedula_ciudadania,
            clave=pwd_context.hash(usu_data.clave[:72]),
            rol=usu_data.rol or RoleEnum.ADMINISTRADOR,
            activo=True
        )

        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario


    # Actualizar por admin 

    @staticmethod
    def actualizar_por_admin(db: Session, usuario_id: int, data: UsuariosUpdateAdmin) -> Optional[Usuarios]:
        usuario = UsuariosService.buscar_por_id(db, usuario_id)
        if not usuario:
            return None

        if data.email:
            usuario.email = data.email.strip().lower()
        if data.usuario:
            usuario.usuario = data.usuario
        if data.nombre_completo:
            usuario.nombre_completo = data.nombre_completo
        if data.cedula_ciudadania:
            usuario.cedula_ciudadania = data.cedula_ciudadania
        if data.rol:
            usuario.rol = data.rol
        if data.activo is not None:
            usuario.activo = data.activo

        db.commit()
        db.refresh(usuario)
        return usuario


    # Utilidades

    @staticmethod
    def verificar_clave(clave_plana: str, clave_hash: str) -> bool:
        return pwd_context.verify(clave_plana, clave_hash)