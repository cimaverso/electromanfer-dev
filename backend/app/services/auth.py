from app.core.security import verify_password, create_access_token
from app.services.usuarios import UsuariosService
from sqlalchemy.orm import Session

class auth_service:

    @staticmethod
    def auth_me(user_id: int, db: Session):
        return UsuariosService.buscar_por_id(db, user_id)

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

        return {"access_token": access_token, "token_type": "bearer", "user": user}