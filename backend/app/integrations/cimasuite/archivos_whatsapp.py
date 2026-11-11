"""Archivos del chat de WhatsApp (fotos, audios, documentos), en el servidor de Electromanfer.

Cimapi no guarda archivos y Meta los borra a los 30 días: cada archivo que llega o se
envía se copia aquí. Solo para el chat; los archivos de productos (MEDIA_BASE) son aparte.

Todo vive bajo settings.WHATSAPP_ARCHIVOS_DIR, que NO se expone como estático: los
archivos solo salen por el endpoint del chat. En producción esa carpeta necesita un
volumen propio en Dokploy, o se pierde en cada despliegue. En la base se guarda la
clave relativa (whatsapp/<conversación>/<archivo>), nunca la ruta.
"""
import mimetypes
import os
import uuid
from pathlib import Path

from app.core.config import settings

PREFIJO = "whatsapp/"


def _raiz() -> Path:
    return Path(settings.WHATSAPP_ARCHIVOS_DIR)


def configurado() -> bool:
    """Hay carpeta configurada y se puede escribir en ella."""
    if not settings.WHATSAPP_ARCHIVOS_DIR:
        return False
    raiz = _raiz()
    try:
        raiz.mkdir(parents=True, exist_ok=True)
    except OSError:
        return False
    return os.access(raiz, os.W_OK)


def clave_archivo(conversacion_id: int, whatsapp_message_id: str, mime: str | None, nombre: str | None = None) -> str:
    """Clave estable por mensaje: repetir la copia pisa el mismo archivo."""
    ext = ""
    if nombre and "." in nombre:
        ext = "." + "".join(c for c in nombre.rsplit(".", 1)[1].lower() if c.isalnum())[:10]
    elif mime:
        ext = mimetypes.guess_extension(mime.split(";")[0].strip()) or ""
    return f"{PREFIJO}{conversacion_id}/{_id_seguro(whatsapp_message_id)}{ext}"


def _id_seguro(whatsapp_message_id: str) -> str:
    seguro = "".join(c for c in whatsapp_message_id if c.isalnum() or c in "._-")
    while ".." in seguro:
        seguro = seguro.replace("..", ".")
    seguro = seguro.strip(".")
    if not seguro:
        raise ValueError("Id de mensaje inválido")
    return seguro


def buscar_existente(conversacion_id: int, whatsapp_message_id: str) -> str | None:
    """Clave de un archivo de este mensaje que ya está en el disco (cualquier extensión), o None.
    Sirve para anotar en la base un archivo ya descargado sin bajarlo otra vez."""
    try:
        seguro = _id_seguro(whatsapp_message_id)
    except ValueError:
        return None
    carpeta = _raiz() / PREFIJO.rstrip("/") / str(conversacion_id)
    if not carpeta.is_dir():
        return None
    for ruta in sorted(carpeta.iterdir()):
        if ruta.is_file() and not ruta.name.startswith(".") and (ruta.name == seguro or ruta.stem == seguro or ruta.name.startswith(seguro + ".")):
            return f"{PREFIJO}{conversacion_id}/{ruta.name}"
    return None


def es_clave(valor: str | None) -> bool:
    return bool(valor) and valor.startswith(PREFIJO)


def _ruta(clave: str) -> Path:
    """Ruta en disco de una clave; nunca sale de la raíz."""
    if not es_clave(clave):
        raise ValueError("Clave inválida")
    raiz = _raiz().resolve()
    ruta = (raiz / clave).resolve()
    if raiz not in ruta.parents:
        raise ValueError("Clave inválida")
    return ruta


def guardar(clave: str, contenido: bytes) -> str:
    ruta = _ruta(clave)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    # Se escribe aparte y se renombra: nunca queda un archivo a medias.
    parcial = ruta.with_name(f".{ruta.name}.{uuid.uuid4().hex}.parcial")
    try:
        parcial.write_bytes(contenido)
        os.replace(parcial, ruta)
    finally:
        parcial.unlink(missing_ok=True)
    return clave


def leer(clave: str) -> tuple[bytes, str] | None:
    """(contenido, tipo) o None si no existe."""
    try:
        ruta = _ruta(clave)
        return ruta.read_bytes(), mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
    except (FileNotFoundError, ValueError):
        return None


def borrar(clave: str) -> None:
    _ruta(clave).unlink(missing_ok=True)
