import os
import json
import base64
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.utils import parsedate_to_datetime

TOKEN_PATH = os.path.join(os.path.dirname(__file__), "..", "gmail_token.json")

METADATA_HEADERS = ["From", "To", "Subject", "Date", "Message-ID", "In-Reply-To", "References"]


# ─── Autenticación ────────

def _get_service():
    with open(TOKEN_PATH, "r") as f:
        token_data = json.load(f)

    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_data["token"] = creds.token
        with open(TOKEN_PATH, "w") as f:
            json.dump(token_data, f)

    return build("gmail", "v1", credentials=creds)

# ─── Parseo ─────

def _decode_body(part):
    data = part.get("body", {}).get("data", "")
    if data:
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    return ""

def _limpiar_cuerpo(texto: str) -> str:
    if not texto:
        return ""
    lineas = texto.split('\n')
    limpias = []
    for linea in lineas:
        linea_limpia = linea.strip()
        if linea_limpia.startswith('>'):
            continue
        if 'escribió:' in linea_limpia or 'wrote:' in linea_limpia:
            break
        if linea_limpia.startswith('On ') and ('<' in linea_limpia or 'wrote:' in linea_limpia or 'PM ' in linea_limpia or 'AM ' in linea_limpia):
            break
        limpias.append(linea)
    return '\n'.join(limpias).strip()

def _headers_dict(msg):
    return {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}

def _parsear_completo(msg):
    """Headers + cuerpo + adjuntos — para vista de hilo."""
    headers = _headers_dict(msg)
    label_ids = msg.get("labelIds", [])
    in_reply_to = headers.get("In-Reply-To", "").strip()

    cuerpo_plain = ""
    cuerpo_html = ""
    adjuntos = []

    def recorrer_partes(parts):
        nonlocal cuerpo_plain, cuerpo_html
        for part in parts:
            mime = part.get("mimeType", "")
            filename = part.get("filename", "")
            if filename and filename != "noname" and "." in filename:
                size = part.get("body", {}).get("size", 0)
                adjuntos.append({
                    "nombre": filename,
                    "tipo": mime,
                    "tamanio": f"{round(size / 1024, 1)} KB",
                })
            elif mime == "text/plain" and not cuerpo_plain:
                cuerpo_plain = _decode_body(part)
            elif mime == "text/html" and not cuerpo_html:
                cuerpo_html = _decode_body(part)
            if "parts" in part:
                recorrer_partes(part["parts"])

    payload = msg["payload"]
    if "parts" in payload:
        recorrer_partes(payload["parts"])
    else:
        mime = payload.get("mimeType", "")
        if mime == "text/plain":
            cuerpo_plain = _decode_body(payload)
        elif mime == "text/html":
            cuerpo_html = _decode_body(payload)

    es_enviado = "SENT" in label_ids

    return {
        "id": msg["id"],
        "thread_id": msg.get("threadId", ""),
        "remitente": headers.get("From", ""),
        "destinatario": headers.get("To", ""),
        "asunto": headers.get("Subject", ""),
        "fecha": headers.get("Date", ""),
        "message_id": headers.get("Message-ID", "").strip(),
        "in_reply_to": in_reply_to,
        "leido": "UNREAD" not in label_ids,
        "direccion": "enviado" if es_enviado else "recibido",
        "cuerpo": _limpiar_cuerpo(cuerpo_plain),
        "cuerpo_html": cuerpo_html if es_enviado else "",
        "adjuntos": adjuntos,
    }


# ─── Endpoints ─────

def get_inbox(limit: int = 10) -> list[dict]:
    """Lista hilos de inbox usando threads.list — nativo y rápido."""
    service = _get_service()

    result = service.users().threads().list(
        userId="me", labelIds=["INBOX"], maxResults=limit
    ).execute()

    threads = result.get("threads", [])
    hilos = []

    for t in threads:
        # Solo metadata del hilo — el último mensaje define el preview
        thread = service.users().threads().get(
            userId="me", id=t["id"], format="metadata",
            metadataHeaders=METADATA_HEADERS
        ).execute()

        msgs = thread.get("messages", [])
        if not msgs:
            continue

        ultimo = msgs[-1]
        primero = msgs[0]
        headers_ultimo = _headers_dict(ultimo)
        headers_primero = _headers_dict(primero)

        tiene_no_leido = any("UNREAD" in m.get("labelIds", []) for m in msgs)
        es_enviado = "SENT" in primero.get("labelIds", [])

        hilos.append({
            "id": t["id"],
            "thread_id": t["id"],
            "hilo_root_id": t["id"],
            "remitente": headers_primero.get("From", "") if not es_enviado else headers_primero.get("To", ""),
            "destinatario": headers_primero.get("To", ""),
            "asunto": headers_primero.get("Subject", ""),
            "fecha": headers_ultimo.get("Date", ""),
            "message_id": headers_primero.get("Message-ID", "").strip(),
            "leido": not tiene_no_leido,
            "mensajes_count": len(msgs),
            "preview": t.get("snippet", ""),
            "direccion": "recibido",
            "cotizacion_consecutivo": None,
        })

    return hilos

def get_sent(limit: int = 10) -> list[dict]:
    """Lista hilos de enviados."""
    service = _get_service()

    result = service.users().threads().list(
        userId="me", labelIds=["SENT"], maxResults=limit
    ).execute()

    threads = result.get("threads", [])
    hilos = []

    for t in threads:
        thread = service.users().threads().get(
            userId="me", id=t["id"], format="metadata",
            metadataHeaders=METADATA_HEADERS
        ).execute()

        msgs = thread.get("messages", [])
        if not msgs:
            continue

        ultimo = msgs[-1]
        primero = msgs[0]
        headers_primero = _headers_dict(primero)
        headers_ultimo = _headers_dict(ultimo)

        hilos.append({
            "id": t["id"],
            "thread_id": t["id"],
            "hilo_root_id": t["id"],
            "remitente": headers_primero.get("From", ""),
            "destinatario": headers_primero.get("To", ""),
            "asunto": headers_primero.get("Subject", ""),
            "fecha": headers_ultimo.get("Date", ""),
            "message_id": headers_primero.get("Message-ID", "").strip(),
            "leido": True,
            "mensajes_count": len(msgs),
            "preview": t.get("snippet", ""),
            "direccion": "enviado",
            "cotizacion_consecutivo": None,
        })

    return hilos

def get_hilo(thread_id: str) -> list[dict]:
    service = _get_service()
    thread = service.users().threads().get(
        userId="me", id=thread_id, format="full"
    ).execute()

    mensajes = []
    msgs = thread.get("messages", [])
    for i, msg in enumerate(msgs):
        parsed = _parsear_completo(msg)
        mensajes.append(parsed)

    def parse_fecha(m):
        try:
            return parsedate_to_datetime(m["fecha"])
        except Exception:
            return m["fecha"]

    return sorted(mensajes, key=parse_fecha)

def marcar_leido(thread_id: str) -> dict:
    service = _get_service()
    service.users().threads().modify(
        userId="me",
        id=thread_id,
        body={"removeLabelIds": ["UNREAD"]}
    ).execute()
    return {"ok": True}