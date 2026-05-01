import imaplib
import email
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
            "preview": cuerpo[:100],
            "cuerpo": cuerpo,
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
            "preview": cuerpo[:100],
            "cuerpo": cuerpo,
        })

    mail.logout()
    return correos
