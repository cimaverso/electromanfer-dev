import imaplib
import email
import re
import base64
from email.header import decode_header
from email.utils import parsedate_to_datetime
from app.core.config import settings


def decode_str(value):
    if value is None:
        return ""
    decoded = decode_header(value)
    parts = []
    for part, enc in decoded:
        if isinstance(part, bytes):
            parts.append(part.decode(enc or "utf-8", errors="replace"))
        else:
            parts.append(part)
    return "".join(parts)

def _limpiar_preview(texto: str) -> str:
    # Quitar bloques de CSS/style
    texto = re.sub(r'\{[^}]+\}', '', texto)  # agrega esta línea
    texto = re.sub(r'\[https?://[^\]]+\]', '', texto)
    texto = re.sub(r'https?://\S+', '', texto)
    texto = re.sub(r'<[^>]+>', '', texto)
    texto = re.sub(r'\b(Image|Facebook|Instagram|Youtube)\b', '', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto[:120]

def get_inbox(limit: int = 20) -> list[dict]:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    mail.select("inbox")

    _, data = mail.search(None, "ALL")
    ids = data[0].split()
    ids = ids[-limit:][::-1]

    correos = []
    for uid in ids:
        _, msg_data = mail.fetch(uid, "(RFC822)")
        raw = msg_data[0][1]

        # Obtener flags para saber si está leído
        _, flags_data = mail.fetch(uid, "(FLAGS)")
        flags = flags_data[0].decode() if flags_data[0] else ""
        leido = "\\Seen" in flags

        msg = email.message_from_bytes(raw)
        remitente = decode_str(msg.get("From", ""))
        asunto = decode_str(msg.get("Subject", ""))
        fecha_raw = msg.get("Date", "")

        try:
            fecha = parsedate_to_datetime(fecha_raw).isoformat()
        except Exception:
            fecha = fecha_raw

        cuerpo = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                    cuerpo = part.get_payload(decode=True).decode("utf-8", errors="replace")
                    break
        else:
            cuerpo = msg.get_payload(decode=True).decode("utf-8", errors="replace")

        correos.append({
            "id": uid.decode(),
            "remitente": remitente,
            "asunto": asunto,
            "fecha": fecha,
            "preview": _limpiar_preview(cuerpo),
            "leido": leido,
        })

    mail.logout()
    return correos

def get_sent(limit: int = 20) -> list[dict]:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    mail.select('"[Gmail]/Enviados"')

    _, data = mail.search(None, "ALL")
    ids = data[0].split()
    ids = ids[-limit:][::-1]

    correos = []
    for uid in ids:
        _, msg_data = mail.fetch(uid, "(RFC822)")
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)

        destinatario = decode_str(msg.get("To", ""))
        asunto = decode_str(msg.get("Subject", ""))
        fecha_raw = msg.get("Date", "")

        try:
            fecha = parsedate_to_datetime(fecha_raw).isoformat()
        except Exception:
            fecha = fecha_raw

        cuerpo = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                    cuerpo = part.get_payload(decode=True).decode("utf-8", errors="replace")
                    break
        else:
            cuerpo = msg.get_payload(decode=True).decode("utf-8", errors="replace")

        correos.append({
            "id": uid.decode(),
            "destinatario": destinatario,
            "asunto": asunto,
            "fecha": fecha,
            "preview": _limpiar_preview(cuerpo),
        })

    mail.logout()
    return correos

def get_email_by_id(email_id: str, bandeja: str = "inbox") -> dict:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)

    if bandeja == "sent":
        mail.select('"[Gmail]/Enviados"')
    else:
        mail.select("inbox")

    _, msg_data = mail.fetch(email_id.encode(), "(RFC822)")
    raw = msg_data[0][1]
    msg = email.message_from_bytes(raw)

    remitente = decode_str(msg.get("From", ""))
    destinatario = decode_str(msg.get("To", ""))
    asunto = decode_str(msg.get("Subject", ""))
    message_id = msg.get("Message-ID", "")
    fecha_raw = msg.get("Date", "")

    try:
        fecha = parsedate_to_datetime(fecha_raw).isoformat()
    except Exception:
        fecha = fecha_raw

    cuerpo_plain = ""
    cuerpo_html = ""
    adjuntos = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))

            if "attachment" in content_disposition:
                nombre = decode_str(part.get_filename() or "archivo")
                contenido = part.get_payload(decode=True)
                adjuntos.append({
                    "nombre": nombre,
                    "tipo": content_type,
                    "tamanio": f"{round(len(contenido) / 1024, 1)} KB",
                    "base64": base64.b64encode(contenido).decode("utf-8"),
                })
            elif content_type == "text/plain" and not cuerpo_plain:
                cuerpo_plain = part.get_payload(decode=True).decode("utf-8", errors="replace")
            elif content_type == "text/html" and not cuerpo_html:
                cuerpo_html = part.get_payload(decode=True).decode("utf-8", errors="replace")
    else:
        cuerpo_plain = msg.get_payload(decode=True).decode("utf-8", errors="replace")

    # Si no se detectó cuerpo_html pero el cuerpo_plain parece HTML, moverlo
    if not cuerpo_html and cuerpo_plain.strip().startswith('<'):
        cuerpo_html = cuerpo_plain
        cuerpo_plain = ""

    mail.logout()

    return {
        "id": email_id,
        "remitente": remitente,
        "destinatario": destinatario,
        "asunto": asunto,
        "fecha": fecha,
        "cuerpo": cuerpo_plain,
        "cuerpo_html": cuerpo_html,
        "adjuntos": adjuntos,
        "message_id": message_id,
    }

def marcar_leido(email_id: str) -> dict:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    mail.select("inbox")
    mail.store(email_id.encode(), '+FLAGS', '\\Seen')
    mail.logout()
    return { "ok": True }