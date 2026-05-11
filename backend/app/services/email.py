import base64
import logging
import httpx
import uuid
import os
import json
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import settings

logger = logging.getLogger(__name__)
TOKEN_PATH = os.path.join(os.path.dirname(__file__), "..", "gmail_token.json")

def _get_gmail_service():
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

def _url_a_base64(url: str):
    try:
        if url.startswith('/'):
            url = f"{settings.API_BASE_URL}{url}"
        if settings.API_BASE_URL and url.startswith(settings.API_BASE_URL):
            ruta_relativa = url.replace(settings.API_BASE_URL, '').lstrip('/')
            ruta_sin_media = ruta_relativa.removeprefix('media/')
            ruta_disco = os.path.join(settings.MEDIA_BASE, ruta_sin_media)
            if os.path.exists(ruta_disco):
                with open(ruta_disco, 'rb') as f:
                    return f.read(), os.path.basename(ruta_disco)
            logger.warning(f"No encontrado en disco: {ruta_disco}, intentando HTTP...")
        response = httpx.get(url, timeout=10)
        if response.status_code == 200:
            return response.content, url.split('/')[-1]
    except Exception as e:
        logger.error(f"Error descargando {url}: {e}")
    return None

def _construir_html(cuerpo: str, consecutivo: str, firma_url: str = None) -> str:
    cuerpo_html = cuerpo.replace('\n', '<br>')
    logo_url = settings.LOGO_URL
    firma_tag = f'<img src="{firma_url}" style="max-width:380px;margin-top:24px;" />' if firma_url else ''

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#1E2130;padding:28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><img src="{logo_url}" style="max-height:55px;" /></td>
                      <td align="right">
                        <span style="background:#8DAF59;color:#ffffff;padding:6px 16px;border-radius:4px;font-size:13px;font-weight:bold;">{consecutivo}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#E9CF58;padding:8px 32px;">
                  <span style="color:#1E2130;font-size:11px;font-weight:bold;letter-spacing:2px;">COTIZACIÓN</span>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 32px;">
                  <p style="color:#1E2130;font-size:15px;line-height:1.8;margin:0;">
                    {cuerpo_html}
                  </p>
                  {firma_tag}
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px;">
                  <hr style="border:none;border-top:2px solid #E9CF58;margin:0;">
                </td>
              </tr>
              <tr>
                <td style="background:#1E2130;padding:20px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="color:#E9CF58;font-size:12px;font-weight:bold;">ELECTROMANFER LTDA.</span><br>
                        <span style="color:#9aa0a8;font-size:11px;">NIT. 800.250.956-1</span><br>
                        <span style="color:#9aa0a8;font-size:11px;">ventas@electromanfer.com</span>
                      </td>
                      <td align="right">
                        <span style="color:#8DAF59;font-size:11px;">www.electromanfer.com</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

def enviar_cotizacion_email(
    destino: str,
    asunto: str,
    cuerpo: str,
    pdf_base64: str = None,
    pdf_bytes: bytes = None,
    nombre_pdf: str = "cotizacion.pdf",
    adjuntos_urls: list = None,
    firma_url: str = None,
    consecutivo: str = "",
    in_reply_to: str = None,
) -> None:
    try:
        # Resolver URL pública de la firma
        firma_url_publica = None
        if firma_url:
            if firma_url.startswith('/'):
                firma_url_publica = f"{settings.API_BASE_URL}{firma_url}"
            else:
                firma_url_publica = firma_url

        msg = MIMEMultipart('related')
        msg['From'] = f"Electromanfer <{settings.GMAIL_USER}>"
        msg['To'] = destino
        message_id = f"<{uuid.uuid4()}@mail.gmail.com>"
        msg['Message-ID'] = message_id
        msg['Subject'] = asunto

        if in_reply_to:
            reply_id = in_reply_to if in_reply_to.startswith('<') else f"<{in_reply_to}>"
            msg['In-Reply-To'] = reply_id
            msg['References'] = reply_id

        html_content = _construir_html(cuerpo, consecutivo, firma_url=firma_url_publica)
        msg_alt = MIMEMultipart('alternative')
        msg.attach(msg_alt)
        msg_alt.attach(MIMEText(html_content, 'html'))

        # PDF cotización
        pdf_data_final = None
        if pdf_bytes is not None:
            pdf_data_final = pdf_bytes
        elif pdf_base64:
            raw = pdf_base64.split(',')[1] if ',' in pdf_base64 else pdf_base64
            pdf_data_final = base64.b64decode(raw)

        if pdf_data_final is not None:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_data_final)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{nombre_pdf}"')
            msg.attach(part)

        # Imágenes y fichas
        if adjuntos_urls:
            for adj in adjuntos_urls:
                if isinstance(adj, str):
                    url = adj
                    nombre_original = url.split('/')[-1]
                    resultado = _url_a_base64(url)
                    if not resultado:
                        continue
                    data, _ = resultado
                else:
                    nombre_original = adj.get('nombre', 'archivo')
                    data_bytes = adj.get('data', None)
                    b64 = adj.get('base64', '')
                    url = adj.get('url', '')

                    if data_bytes is not None:
                        data = data_bytes
                    elif b64:
                        raw = b64.split(',')[1] if ',' in b64 else b64
                        data = base64.b64decode(raw)
                    elif url:
                        resultado = _url_a_base64(url)
                        if not resultado:
                            continue
                        data, _ = resultado
                    else:
                        continue

                part = MIMEBase('application', 'octet-stream')
                part.set_payload(data)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename="{nombre_original}"')
                msg.attach(part)

        # Enviar via Gmail API (OAuth)
        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        body = {"raw": raw_message}

        service = _get_gmail_service()

        if in_reply_to:
            try:
                if not in_reply_to.startswith('<'):
                    body["threadId"] = in_reply_to
                    logger.info(f"Usando threadId directo: {in_reply_to}")
                else:
                    results = service.users().messages().list(
                        userId="me",
                        q=f"rfc822msgid:{in_reply_to.strip('<>').strip()}"
                    ).execute()
                    msgs = results.get("messages", [])
                    if msgs:
                        body["threadId"] = msgs[0]["threadId"]
                        logger.info(f"ThreadId encontrado: {msgs[0]['threadId']}")
                    else:
                        logger.warning(f"No se encontró threadId para in_reply_to: {in_reply_to}")
            except Exception as e:
                logger.warning(f"No se pudo encontrar threadId: {e}")

        service.users().messages().send(
            userId="me", body=body
        ).execute()

        return message_id

    except Exception as e:
        logger.error(f"Error enviando email via Gmail: {e}")
        return None