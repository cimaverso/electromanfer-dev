from app.core.security import verify_password, create_access_token
from app.services.usuarios import UsuariosService
from sqlalchemy.orm import Session


class auth_service:

    @staticmethod
    def auth_me(user_id: int, db: Session):
        user = UsuariosService.buscar_por_id(db, user_id)
        if not user:
            return None
        return user

    @staticmethod
    def autheticate_user(email_or_username: str, password: str, db: Session):
        if "@" in email_or_username:
            user = UsuariosService.buscar_por_email(db, email_or_username)
        else:
            user = UsuariosService.buscar_por_usuario(db, email_or_username)  # ← corregido

        if not user or not verify_password(password, user.clave):  # ← corregido
            return None

        token_data = {
            "user_name": user.nombre_completo,   
            "sub": user.email,                   
            "user_id": user.id,                  
            "role": user.rol                     
        }

        acces_token = create_access_token(data=token_data)
        return {"access_token": acces_token, "token_type": "bearer", "user": user}