import httpx
from typing import Optional
from fastapi import HTTPException, UploadFile
from app.core.config import settings


class WhatsappService:

    @staticmethod
    def _headers() -> dict:
        return {"api-key": settings.CIMAPI_API_KEY}

    @staticmethod
    def conectar_numero(code: str, display_name: str):
        with httpx.Client(timeout=30) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/onboarding/connect",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                json={"code": code, "display_name": display_name},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", "Error conectando el número en CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def listar_conversaciones(page: int = 1, limit: int = 20):
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/conversations",
                headers=WhatsappService._headers(),
                params={"page": page, "limit": limit},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", "Error obteniendo conversaciones de CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def obtener_mensajes(conversation_id: int, page: int = 1, limit: int = 50):
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/conversations/{conversation_id}/messages",
                headers=WhatsappService._headers(),
                params={"page": page, "limit": limit},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", "Error obteniendo mensajes de CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def enviar_texto(to: str, message: str, conversation_id: Optional[int] = None):
        with httpx.Client(timeout=30) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/messages/text",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                json={"to": to, "message": message, "conversation_id": conversation_id},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", "Error enviando mensaje en CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def _enviar_archivo(endpoint: str, to: str, file: UploadFile, conversation_id: Optional[int], caption: Optional[str]):
        with httpx.Client(timeout=60) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/messages/{endpoint}",
                headers=WhatsappService._headers(),
                data={
                    "to": to,
                    "conversation_id": conversation_id,
                    "caption": caption,
                },
                files={"file": (file.filename, file.file, file.content_type)},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", f"Error enviando {endpoint} en CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def enviar_imagen(to: str, file: UploadFile, conversation_id: Optional[int] = None, caption: Optional[str] = None):
        return WhatsappService._enviar_archivo("image", to, file, conversation_id, caption)

    @staticmethod
    def enviar_documento(to: str, file: UploadFile, conversation_id: Optional[int] = None, caption: Optional[str] = None):
        return WhatsappService._enviar_archivo("document", to, file, conversation_id, caption)

    @staticmethod
    def enviar_video(to: str, file: UploadFile, conversation_id: Optional[int] = None, caption: Optional[str] = None):
        return WhatsappService._enviar_archivo("video", to, file, conversation_id, caption)

    @staticmethod
    def enviar_audio(to: str, file: UploadFile, conversation_id: Optional[int] = None):
        with httpx.Client(timeout=60) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/messages/audio",
                headers=WhatsappService._headers(),
                data={"to": to, "conversation_id": conversation_id},
                files={"file": (file.filename, file.file, file.content_type)},
            )
        if respuesta.status_code != 200:
            detalle = respuesta.json().get("detail", "Error enviando audio en CimAPI")
            raise HTTPException(status_code=respuesta.status_code, detail=detalle)
        return respuesta.json()

    @staticmethod
    def descargar_media(media_id: str):
        with httpx.Client(timeout=60) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/media/{media_id}/download",
                headers=WhatsappService._headers(),
            )
        if respuesta.status_code != 200:
            raise HTTPException(status_code=respuesta.status_code, detail="Error descargando media de CimAPI")
        return respuesta.content, respuesta.headers.get("content-type", "application/octet-stream")
