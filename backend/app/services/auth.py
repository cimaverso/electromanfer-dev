from app.core.security import verify_password, create_access_token
from app.services.usuario import UsuarioService
from sqlalchemy.orm import Session
from app.core.security import get_current_user_data

class auth_service:

    @staticmethod
    def auth_me(user_id: int, db: Session):
        user = UsuarioService.buscar_por_id(db, user_id)
        if not user:
            return None
        
        return user

    @staticmethod
    def autheticate_user(email_or_username: str, password: str, db: Session):
        if "@" in email_or_username:
            user = UsuarioService.buscar_por_email(db, email_or_username)
        else:
            user = UsuarioService.buscar_por_nombre(db, email_or_username)

        if not user or not verify_password(password, user.usu_password): 
            return None
        
        token_data = {
            "user_name": user.usu_nombre,
            "sub": user.usu_email,
            "user_id": user.usu_id,
            "role": user.usu_role
        }

        acces_token = create_access_token(data=token_data)
        return {"access_token": acces_token, "token_type": "bearer", "user": user}