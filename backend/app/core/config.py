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


settings = Settings()
    