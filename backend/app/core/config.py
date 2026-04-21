import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    SECRET_KEY: str
    EXTERNAL_API_PRODUCTOS: str
    EXTERNAL_API_CLIENTES: str
    EXTERNAL_API_KEY: str
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = ""
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    API_BASE_URL: str = ""
    LOGO_URL: str = ""
    MEDIA_BASE: str = os.path.join(BASE_DIR, "media")


settings = Settings()