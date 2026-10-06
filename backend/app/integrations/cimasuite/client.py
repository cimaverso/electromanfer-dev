"""
Cliente REST para consumir CimAPI (WhatsApp) -- proxy en vivo, sin espejo.
Electromanfer no guarda copia de conversaciones/mensajes: todo se consulta
en tiempo real contra CimAPI usando la api-key del tenant.
"""
import httpx
from typing import Optional
from fastapi import HTTPException, UploadFile
from app.core.config import settings


def _mensaje_error(respuesta, mensaje_por_defecto: str) -> str:
    """Mensaje legible de un error de CimaSuite: {"error": {"code", "message"}}.
    En datos inválidos el motivo concreto (ej. número mal escrito) va en details."""
    try:
        error = respuesta.json().get("error") or {}
    except ValueError:
        return mensaje_por_defecto
    mensaje = error.get("message") or mensaje_por_defecto
    detalles = error.get("details")
    if error.get("code") == "validation_error" and isinstance(detalles, list) and detalles:
        mensaje = detalles[0].get("message") or mensaje
    return mensaje


def _json_o_error(respuesta, mensaje_por_defecto: str, ok=(200, 201)):
    if respuesta.status_code not in ok:
        raise HTTPException(
            status_code=respuesta.status_code,
            detail=_mensaje_error(respuesta, mensaje_por_defecto),
        )
    return respuesta.json() if respuesta.content else None


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
        return _json_o_error(respuesta, "Error conectando el número en CimAPI")

    @staticmethod
    def listar_conversaciones(page: int = 1, limit: int = 20, phone_number_id: Optional[str] = None):
        params = {"page": page, "limit": limit}
        if phone_number_id is not None:
            params["phone_number_id"] = phone_number_id
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/conversations",
                headers=WhatsappService._headers(),
                params=params,
            )
        return _json_o_error(respuesta, "Error obteniendo conversaciones de CimAPI")

    @staticmethod
    def buscar(q: str, limit: int = 8, phone_number_id: Optional[str] = None):
        """Búsqueda híbrida de CimAPI: contactos + contenido de mensajes."""
        params = {"q": q, "limit": limit}
        if phone_number_id is not None:
            params["phone_number_id"] = phone_number_id
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/contacts/search",
                headers=WhatsappService._headers(),
                params=params,
            )
        return _json_o_error(respuesta, "Error buscando en CimAPI")

    @staticmethod
    def obtener_mensajes(conversation_id: int, page: int = 1, limit: int = 50):
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/conversations/{conversation_id}/messages",
                headers=WhatsappService._headers(),
                params={"page": page, "limit": limit},
            )
        return _json_o_error(respuesta, "Error obteniendo mensajes de CimAPI")

    @staticmethod
    def enviar_texto(to: str, message: str, conversation_id: Optional[int] = None):
        with httpx.Client(timeout=30) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/messages/text",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                json={"to": to, "message": message, "conversation_id": conversation_id},
            )
        return _json_o_error(respuesta, "Error enviando mensaje en CimAPI")

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
        return _json_o_error(respuesta, f"Error enviando {endpoint} en CimAPI")

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
        return _json_o_error(respuesta, "Error enviando audio en CimAPI")

    @staticmethod
    def descargar_media(media_id: str):
        with httpx.Client(timeout=60) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/media/{media_id}/download",
                headers=WhatsappService._headers(),
            )
        if respuesta.status_code != 200:
            raise HTTPException(
                status_code=respuesta.status_code,
                detail=_mensaje_error(respuesta, "Error descargando media de CimAPI"),
            )
        return respuesta.content, respuesta.headers.get("content-type", "application/octet-stream")

    @staticmethod
    def actualizar_flags(conversation_id: int, flags: dict):
        payload = {k: v for k, v in flags.items() if v is not None}
        with httpx.Client(timeout=30) as client:
            respuesta = client.patch(
                f"{settings.CIMAPI_BASE_URL}/conversations/{conversation_id}",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                json=payload,
            )
        return _json_o_error(respuesta, "Error actualizando la conversación en CimAPI")

    @staticmethod
    def vaciar_conversacion(conversation_id: int):
        with httpx.Client(timeout=30) as client:
            respuesta = client.delete(
                f"{settings.CIMAPI_BASE_URL}/conversations/{conversation_id}/messages",
                headers=WhatsappService._headers(),
            )
        _json_o_error(respuesta, "Error vaciando la conversación en CimAPI", ok=(200, 204))
        return {"ok": True}

    @staticmethod
    def eliminar_conversacion(conversation_id: int):
        with httpx.Client(timeout=30) as client:
            respuesta = client.delete(
                f"{settings.CIMAPI_BASE_URL}/conversations/{conversation_id}",
                headers=WhatsappService._headers(),
            )
        _json_o_error(respuesta, "Error eliminando la conversación en CimAPI", ok=(200, 204))
        return {"ok": True}

    # ─── Plantillas ──────────────────────────────────────────────────────────

    @staticmethod
    def listar_plantillas(phone_number_id: int):
        with httpx.Client(timeout=30) as client:
            respuesta = client.get(
                f"{settings.CIMAPI_BASE_URL}/templates",
                headers=WhatsappService._headers(),
                params={"phone_number_id": phone_number_id},
            )
        return _json_o_error(respuesta, "Error obteniendo plantillas de CimAPI")

    @staticmethod
    def crear_plantilla(phone_number_id: int, payload: dict):
        with httpx.Client(timeout=60) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/templates/submit",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                params={"phone_number_id": phone_number_id},
                json=payload,
            )
        return _json_o_error(respuesta, "Error creando la plantilla en CimAPI")

    @staticmethod
    def sincronizar_plantillas(phone_number_id: int):
        with httpx.Client(timeout=60) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/templates/sync",
                headers=WhatsappService._headers(),
                params={"phone_number_id": phone_number_id},
            )
        return _json_o_error(respuesta, "Error sincronizando plantillas con CimAPI")

    @staticmethod
    def enviar_plantilla(
        to: str,
        template_name: str,
        language: str,
        components: Optional[list] = None,
        preview_text: Optional[str] = None,
        conversation_id: Optional[int] = None,
    ):
        with httpx.Client(timeout=30) as client:
            respuesta = client.post(
                f"{settings.CIMAPI_BASE_URL}/messages/template",
                headers={**WhatsappService._headers(), "Content-Type": "application/json"},
                json={
                    "to": to,
                    "template_name": template_name,
                    "language": language,
                    "components": components,
                    "preview_text": preview_text,
                    "conversation_id": conversation_id,
                },
            )
        return _json_o_error(respuesta, "Error enviando la plantilla en CimAPI")
