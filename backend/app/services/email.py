import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def enviar_cotizacion_email(
    destino: str,
    asunto: str,
    cuerpo: str,
    pdf_base64: str = None,
    nombre_pdf: str = "cotizacion.pdf",
    adjuntos_urls: list = None,
    firma_base64: str = None,
) -> bool:
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    # Construir HTML del cuerpo
    cuerpo_html = cuerpo.replace('\n', '<br>')
    if firma_base64:
        cuerpo_html += f'<br><br><img src="{firma_base64}" style="max-width:400px"/>'

    # Adjuntos
    adjuntos = []

    # PDF cotización
    if pdf_base64:
        # Quitar el prefijo data:application/pdf;base64,
        pdf_data = pdf_base64.split(',')[1] if ',' in pdf_base64 else pdf_base64
        adjuntos.append({
            "content": pdf_data,
            "name": nombre_pdf
        })

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": destino}],
        sender={
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL
        },
        subject=asunto,
        html_content=cuerpo_html,
        attachment=adjuntos if adjuntos else None
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        logger.error(f"Error enviando email via Brevo: {e}")
        return False