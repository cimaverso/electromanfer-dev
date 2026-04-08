from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Busca el .env en el directorio desde donde ejecutes el comando
    model_config = SettingsConfigDict(
        env_file=".env",
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
    API_BASE_URL: str = ""
    LOGO_URL: str = ""
    FIRMA_URL: str = ""
    MEDIA_BASE: str = "/app/media"


settings = Settings()
    