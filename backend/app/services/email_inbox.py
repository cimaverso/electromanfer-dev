import imaplib
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
from app.core.config import settings


# ─── Helpers ──────────────────────────────────────────────────────────────────

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

def _parsear_fecha(fecha_raw):
    try:
        return parsedate_to_datetime(fecha_raw).isoformat()
    except Exception:
        return fecha_raw

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
        if linea_limpia.startswith('El ') and 'escribió' in texto:
            break
        limpias.append(linea)
    return '\n'.join(limpias).strip()

def _parsear_partes(msg):
    cuerpo_plain = ""
    cuerpo_html = ""
    adjuntos = []

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if "attachment" in cd:
                nombre = decode_str(part.get_filename() or "archivo")
                contenido = part.get_payload(decode=True)
                adjuntos.append({
                    "nombre": nombre,
                    "tipo": ct,
                    "tamanio": f"{round(len(contenido) / 1024, 1)} KB",
                })
            elif ct == "text/plain" and not cuerpo_plain:
                cuerpo_plain = part.get_payload(decode=True).decode("utf-8", errors="replace")
            elif ct == "text/html" and not cuerpo_html:
                cuerpo_html = part.get_payload(decode=True).decode("utf-8", errors="replace")
    else:
        cuerpo_plain = msg.get_payload(decode=True).decode("utf-8", errors="replace")

    if not cuerpo_html and cuerpo_plain.strip().startswith('<'):
        cuerpo_html = cuerpo_plain
        cuerpo_plain = ""

    return cuerpo_plain, cuerpo_html, adjuntos

def _agrupar_hilos(correos: list, limit: int) -> list:
    mapa = {c["message_id"]: c for c in correos if c["message_id"]}
    hilos = {}

    for correo in correos:
        refs = correo["references"].split() if correo["references"] else []
        root = None
        for ref in refs:
            if ref in mapa:
                root = refs[0]
                break
        if not root and correo["in_reply_to"]:
            root = correo["in_reply_to"]
        if not root:
            root = correo["message_id"]
        if not root:
            continue

        if root not in hilos:
            hilos[root] = {
                **correo,
                "mensajes_count": 1,
                "tiene_no_leido": not correo.get("leido", True),
                "hilo_root_id": root,
                "remitente": correo.get("remitente", ""),
                "destinatario": correo.get("destinatario", ""),
            }
        else:
            hilos[root]["mensajes_count"] += 1
            if correo["fecha"] > hilos[root]["fecha"]:
                hilos[root]["preview"] = correo.get("preview", "")
                hilos[root]["fecha"] = correo["fecha"]
                if correo.get("direccion") == "recibido":
                    hilos[root]["remitente"] = correo.get("remitente", "")
                if correo.get("direccion") == "enviado":
                    hilos[root]["destinatario"] = correo.get("destinatario", "")
            if not correo.get("leido", True):
                hilos[root]["tiene_no_leido"] = True

    for hilo in hilos.values():
        hilo["leido"] = not hilo.pop("tiene_no_leido", False)

    return sorted(hilos.values(), key=lambda x: x["fecha"], reverse=True)[:limit]

def _fetch_headers_bandeja(conn, bandeja_imap, direccion, n):
    conn.select(bandeja_imap)
    _, data = conn.search(None, "ALL")
    ids = data[0].split()
    if not ids:
        return []
    ids = ids[-n:][::-1]

    correos = []
    for uid in ids:
        _, msg_data = conn.fetch(uid, "(BODY.PEEK[HEADER] FLAGS)")
        raw = msg_data[0][1]
        flags_str = msg_data[0][0].decode() if isinstance(msg_data[0][0], bytes) else ""
        msg = email.message_from_bytes(raw)
        correos.append({
            "id": uid.decode(),
            "remitente": decode_str(msg.get("From", "")),
            "destinatario": decode_str(msg.get("To", "")),
            "asunto": decode_str(msg.get("Subject", "")),
            "fecha": _parsear_fecha(msg.get("Date", "")),
            "leido": "\\Seen" in flags_str if direccion == "recibido" else True,
            "message_id": msg.get("Message-ID", "").strip(),
            "in_reply_to": msg.get("In-Reply-To", "").strip(),
            "references": msg.get("References", "").strip(),
            "direccion": direccion,
        })
    return correos


# ─── Endpoints ────────────────────────────────────────────────────────────────

def get_inbox(limit: int = 10) -> list[dict]:
    conn = imaplib.IMAP4_SSL("imap.gmail.com")
    conn.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    recibidos = _fetch_headers_bandeja(conn, "inbox", "recibido", 15)
    enviados = _fetch_headers_bandeja(conn, '"[Gmail]/Enviados"', "enviado", 15)
    conn.logout()
    todos = _agrupar_hilos(recibidos + enviados, limit * 3)
    # Solo mostrar hilos que tienen al menos un mensaje recibido
    return [h for h in todos if h.get("direccion") == "recibido"][:limit]

def get_sent(limit: int = 10) -> list[dict]:
    conn = imaplib.IMAP4_SSL("imap.gmail.com")
    conn.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    enviados = _fetch_headers_bandeja(conn, '"[Gmail]/Enviados"', "enviado", 15)
    recibidos = _fetch_headers_bandeja(conn, "inbox", "recibido", 15)
    conn.logout()
    todos = _agrupar_hilos(enviados + recibidos, limit * 3)
    # Solo mostrar hilos que tienen al menos un mensaje enviado
    return [h for h in todos if h.get("direccion") == "enviado"][:limit]

def get_hilo(message_id: str) -> list[dict]:
    conn = imaplib.IMAP4_SSL("imap.gmail.com")
    conn.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)

    def buscar_en_bandeja(bandeja_imap, direccion):
        conn.select(bandeja_imap)
        _, data = conn.search(None, "ALL")
        ids = data[0].split()
        if not ids:
            return []
        ids = ids[-30:]
        ids_str = b",".join(ids)

        _, results = conn.fetch(ids_str, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID REFERENCES IN-REPLY-TO)])")

        candidatos = []
        id_index = 0
        for item in results:
            if isinstance(item, tuple):
                msg = email.message_from_bytes(item[1])
                uid = ids[id_index].decode()
                mid = msg.get("Message-ID", "").strip()
                refs = msg.get("References", "").strip()
                irt = msg.get("In-Reply-To", "").strip()
                if mid == message_id or message_id in refs or irt == message_id:
                    candidatos.append(uid)
                id_index += 1

        mensajes = []
        for uid in candidatos:
            _, msg_data = conn.fetch(uid.encode(), "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)
            cuerpo_plain, cuerpo_html, adjuntos = _parsear_partes(msg)
            mensajes.append({
                "id": uid,
                "remitente": decode_str(msg.get("From", "")),
                "destinatario": decode_str(msg.get("To", "")),
                "asunto": decode_str(msg.get("Subject", "")),
                "fecha": _parsear_fecha(msg.get("Date", "")),
                "cuerpo": _limpiar_cuerpo(cuerpo_plain),
                "cuerpo_html": cuerpo_html,
                "adjuntos": adjuntos,
                "message_id": msg.get("Message-ID", "").strip(),
                "direccion": direccion,
            })
        return mensajes

    recibidos = buscar_en_bandeja("inbox", "recibido")
    enviados = buscar_en_bandeja('"[Gmail]/Enviados"', "enviado")
    conn.logout()
    return sorted(recibidos + enviados, key=lambda x: x["fecha"])

def marcar_leido(email_id: str) -> dict:
    conn = imaplib.IMAP4_SSL("imap.gmail.com")
    conn.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
    conn.select("inbox")
    conn.store(email_id.encode(), '+FLAGS', '\\Seen')
    conn.logout()
    return {"ok": True}