from app.core.security import verify_password, create_access_token
from app.services.usuarios import UsuariosService
from app.models.asesor_lineas import AsesorLinea
from app.enums import RoleEnum
from sqlalchemy.orm import Session


class auth_service:

    @staticmethod
    def _tiene_whatsapp(user, db: Session) -> bool:
        """
        VENDEDOR: solo True si tiene una línea asignada en asesor_lineas.
        Cualquier otro rol (GERENCIA, ADMINISTRADOR): siempre True, sin filtro.
        """
        if user.rol != RoleEnum.VENDEDOR.value:
            return True
        existe = db.query(AsesorLinea).filter(AsesorLinea.usuario_id == user.id).first()
        return existe is not None

    @staticmethod
    def auth_me(user_id: int, db: Session):
        user = UsuariosService.buscar_por_id(db, user_id)
        if user:
            setattr(user, "tiene_whatsapp", auth_service._tiene_whatsapp(user, db))
        return user

    @staticmethod
    def autheticate_user(email_or_username: str, password: str, db: Session):
        if "@" in email_or_username:
            user = UsuariosService.buscar_por_email(db, email_or_username)
        else:
            user = UsuariosService.buscar_por_usuario(db, email_or_username)

        if not user or not verify_password(password, user.clave):
            return None

        token_data = {
            "user_name": user.nombre_completo,
            "sub": user.email,
            "user_id": user.id,
            "role": user.rol
        }

        access_token, session_token = create_access_token(data=token_data)
        user.session_token = session_token  # siempre sobreescribe
        db.commit()

        setattr(user, "tiene_whatsapp", auth_service._tiene_whatsapp(user, db))

        return {"access_token": access_token, "token_type": "bearer", "user": user}
