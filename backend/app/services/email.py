import smtplib
import base64
import logging
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import settings

logger = logging.getLogger(__name__)


def _url_a_base64(url: str):
    try:
        if url.startswith('/'):
            url = f"{settings.API_BASE_URL}{url}"
        response = httpx.get(url, timeout=10)
        if response.status_code == 200:
            data = response.content
            nombre = url.split('/')[-1]
            return data, nombre
    except Exception:
        pass
    return None


def _construir_html(cuerpo: str, consecutivo: str) -> str:
    cuerpo_html = cuerpo.replace('\n', '<br>')
    logo_url = settings.LOGO_URL
    firma_url = settings.FIRMA_URL

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
                  <img src="{firma_url}" style="max-width:380px;margin-top:24px;" />
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
    nombre_pdf: str = "cotizacion.pdf",
    adjuntos_urls: list = None,
    firma_base64: str = None,
    consecutivo: str = "",
) -> bool:
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.BREVO_SENDER_NAME} <{settings.GMAIL_USER}>"
        msg['To'] = destino
        msg['Subject'] = asunto

        html_content = _construir_html(cuerpo, consecutivo)
        msg.attach(MIMEText(html_content, 'html'))

        # PDF cotización
        if pdf_base64:
            pdf_data = pdf_base64.split(',')[1] if ',' in pdf_base64 else pdf_base64
            pdf_bytes = base64.b64decode(pdf_data)
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{nombre_pdf}"')
            msg.attach(part)

        # Imágenes y fichas
        if adjuntos_urls:
            for adj in adjuntos_urls:
                url = adj.get('url', '')
                if url:
                    resultado = _url_a_base64(url)
                    if resultado:
                        data, nombre = resultado
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(data)
                        encoders.encode_base64(part)
                        part.add_header('Content-Disposition', f'attachment; filename="{nombre}"')
                        msg.attach(part)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_USER, destino, msg.as_string())

        return True

    except Exception as e:
        logger.error(f"Error enviando email via Gmail: {e}")
        return False