# Endpoint: POST /cotizaciones/:id/enviar-email

## Payload que envía el frontend

```json
{
  "destino": "cliente@empresa.com",
  "asunto": "Cotización COT-2026-000090 - ELECTROMANFER LTDA.",
  "cuerpo": "Estimado Cliente Juan:\n\nReciba un cordial saludo...\n\nAtentamente,",
  "firma_base64": "data:image/png;base64,iVBORw0KGgo...",
  "pdf_base64": "data:application/pdf;base64,JVBERi0x...",
  "adjuntos_imagenes": [
    { "nombre": "foto_producto.jpg", "url": "http://...", "base64": "data:image/jpeg;base64,..." }
  ],
  "adjuntos_pdfs": [
    { "nombre": "ficha_tecnica.pdf", "url": "http://..." }
  ]
}
```

## Lo que debe hacer el backend (FastAPI + fastapi-mail)

1. Armar el cuerpo HTML embebiendo `firma_base64` como imagen inline:

```python
html_body = f"""
<html><body>
<p style="font-family: Arial, sans-serif; font-size: 14px; white-space: pre-line;">{payload.cuerpo}</p>
<img src="{payload.firma_base64}" alt="Firma" style="max-width: 600px;" />
</body></html>
"""
```

2. Adjuntar el PDF de cotización desde `pdf_base64`
3. Adjuntar imágenes y fichas PDF adicionales
4. Enviar desde `gerencia@electromanfer.com` vía SMTP Google Workspace

## Configuración SMTP recomendada

```python
# .env
MAIL_USERNAME=gerencia@electromanfer.com
MAIL_PASSWORD=app_password_google   # Contraseña de aplicación de Google
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM=gerencia@electromanfer.com
MAIL_FROM_NAME=ELECTROMANFER LTDA.
```

```python
# FastAPI con fastapi-mail
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME   = settings.MAIL_USERNAME,
    MAIL_PASSWORD   = settings.MAIL_PASSWORD,
    MAIL_FROM       = settings.MAIL_FROM,
    MAIL_FROM_NAME  = settings.MAIL_FROM_NAME,
    MAIL_PORT       = 587,
    MAIL_SERVER     = "smtp.gmail.com",
    MAIL_STARTTLS   = True,
    MAIL_SSL_TLS    = False,
    USE_CREDENTIALS = True,
)

@router.post("/cotizaciones/{id}/enviar-email")
async def enviar_email(id: int, payload: EmailPayload):
    message = MessageSchema(
        subject    = payload.asunto,
        recipients = [payload.destino],
        body       = html_body,  # HTML con firma embebida
        subtype    = "html",
        attachments = adjuntos,  # Lista de archivos
    )
    fm = FastMail(conf)
    await fm.send_message(message)
    return { "ok": True }
```

## Activar contraseña de aplicación en Google

1. Ir a myaccount.google.com → Seguridad
2. Activar verificación en 2 pasos
3. Contraseñas de aplicación → Crear → Correo → Otro dispositivo
4. Copiar la contraseña generada al `.env`