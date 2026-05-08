import smtplib
import base64
import logging
import httpx
import uuid
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders
from app.core.config import settings

logger = logging.getLogger(__name__)


def _url_a_base64(url: str):
    try:
        # URLs relativas — agregar base
        if url.startswith('/'):
            url = f"{settings.API_BASE_URL}{url}"

        # Intentar leer del disco si es URL local
        if settings.API_BASE_URL and url.startswith(settings.API_BASE_URL):
            ruta_relativa = url.replace(settings.API_BASE_URL, '').lstrip('/')
            ruta_sin_media = ruta_relativa.removeprefix('media/')
            ruta_disco = os.path.join(settings.MEDIA_BASE, ruta_sin_media)
            if os.path.exists(ruta_disco):
                with open(ruta_disco, 'rb') as f:
                    return f.read(), os.path.basename(ruta_disco)
            logger.warning(f"No encontrado en disco: {ruta_disco}, intentando HTTP...")

        # Fallback HTTP
        response = httpx.get(url, timeout=10)
        if response.status_code == 200:
            return response.content, url.split('/')[-1]
    except Exception as e:
        logger.error(f"Error descargando {url}: {e}")
    return None

def _construir_html(cuerpo: str, consecutivo: str, con_firma: bool = False) -> str:
    cuerpo_html = cuerpo.replace('\n', '<br>')
    logo_url = settings.LOGO_URL
    firma_tag = '<img src="cid:firma_image" style="max-width:380px;margin-top:24px;" />' if con_firma else ''

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
        # Descargar firma
        firma_data = None
        if firma_url:
            resultado = _url_a_base64(firma_url)
            if resultado:
                firma_data, _ = resultado

        msg = MIMEMultipart('related')
        msg['From'] = f"Electromanfer <{settings.GMAIL_USER}>"
        msg['To'] = destino
        message_id = f"<{uuid.uuid4()}@electromanfer.com>"
        msg['Message-ID'] = message_id
        msg['Subject'] = asunto

        if in_reply_to:
          msg['In-Reply-To'] = in_reply_to
          msg['References'] = in_reply_to

        html_content = _construir_html(cuerpo, consecutivo, con_firma=firma_data is not None)
        msg_alt = MIMEMultipart('alternative')
        msg.attach(msg_alt)
        msg_alt.attach(MIMEText(html_content, 'html'))

        # Adjuntar firma como inline
        if firma_data:
            img = MIMEImage(firma_data)
            img.add_header('Content-ID', '<firma_image>')
            img.add_header('Content-Disposition', 'inline')
            msg.attach(img)

        # PDF cotización — acepta bytes directos o base64 legacy
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

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_USER, destino, msg.as_string())

        return message_id

    except Exception as e:
        logger.error(f"Error enviando email via Gmail: {e}")
        return None