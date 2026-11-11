import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
    GMAIL_USER: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    CIMAPI_BASE_URL: str 
    CIMAPI_API_KEY: str
    CIMAPI_WS_URL: str = ""
    ANTHROPIC_API_KEY: str = ""
    API_BASE_URL: str = ""
    LOGO_URL: str = ""
    MEDIA_BASE: str = os.path.join(BASE_DIR, "media")

    # El chat de WhatsApp en tablas propias (cimapi ya no guarda conversaciones).
    # 1) CHAT_GUARDAR_LOCAL: guarda lo que llega por eventos, sin cambiar lo que ve
    #    el usuario (sigue leyendo de la API). 2) CHAT_LEER_LOCAL: las pantallas y el
    #    asistente leen de las tablas propias. Los dos apagados = como siempre.
    CHAT_GUARDAR_LOCAL: bool = False
    CHAT_LEER_LOCAL: bool = False
    # Carpeta de los archivos del chat (fotos, audios, documentos), en el servidor.
    # En produccion necesita un volumen propio en Dokploy. Vacio = no guarda archivos.
    WHATSAPP_ARCHIVOS_DIR: str = os.path.join(BASE_DIR, "whatsapp_archivos")


settings = Settings()