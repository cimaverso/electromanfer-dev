"""
Bot de WhatsApp fuera de horario. Se activa desde
app.integrations.cimasuite.handler cuando llega un `message.received` en
una de las líneas conocidas (LINEAS_WHATSAPP en app/routes/whatsapp.py),
y fuera del horario de atención humana (ver schedule.py).

No hay espejo local de la conversación (mismo criterio que el resto del
proyecto, ver app/integrations/cimasuite/client.py): en cada mensaje se
trae el historial reciente de CimAPI y se lo pasa completo al agente
(app.integrations.bot.graph), que decide él mismo -- mirando ese
historial -- si ya saludó, si ya preguntó ciudad/nombre, etc. El agente
solo puede hablar de precio/disponibilidad a través de su única
herramienta (consultada contra el catálogo local ya sincronizado); para
cualquier otro tema (descuentos, envíos, garantía...) el prompt le
prohíbe inventar y lo manda a un asesor humano.
"""
import logging

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.integrations.bot.graph import responder
from app.integrations.bot.schedule import esta_en_horario_bot
from app.integrations.cimasuite.client import WhatsappService
from app.models.clientes import Clientes

logger = logging.getLogger(__name__)

LINEAS_CON_BOT = {"7", "8"}
MENSAJES_DE_CONTEXTO = 30


def _etiqueta(mensaje: dict) -> str:
    if mensaje.get("type") == "text":
        return mensaje.get("content") or ""
    return f"[{mensaje.get('type', 'adjunto')}]"


def _contexto_conversacion(conversation_id: int) -> dict | None:
    """Trae el historial reciente y confirma que lo último que hay en la
    conversación es, en efecto, un mensaje del cliente sin responder
    todavía (texto o adjunto -- si lo último es un mensaje nuestro, no
    hay nada nuevo que contestar)."""
    datos = WhatsappService.obtener_mensajes(
        conversation_id, page=1, limit=MENSAJES_DE_CONTEXTO
    )
    telefono = datos.get("contact_phone", {}).get("phone")
    mensajes = sorted(datos.get("messages", []), key=lambda m: m.get("created_at") or "")
    if not mensajes or not telefono:
        return None

    ultimo = mensajes[-1]
    if ultimo.get("direction") != "inbound":
        return None  # lo último en la conversación es nuestro, nada nuevo que contestar
    if ultimo.get("type") == "text" and not (ultimo.get("content") or ""):
        return None  # mensaje de texto vacío, no hay nada que interpretar

    return {"telefono": telefono, "mensajes": mensajes}


def _normalizar_telefono(numero: str | None) -> str:
    if not numero:
        return ""
    return "".join(c for c in numero if c.isdigit())[-10:]


def _buscar_cliente_por_telefono(db: Session, telefono_whatsapp: str) -> Clientes | None:
    """Cruza el teléfono de WhatsApp contra `clientes` (sincronizada desde
    el ERP) comparando los últimos dígitos, para no depender de que el
    formato (+57, espacios, etc.) coincida exacto."""
    objetivo = _normalizar_telefono(telefono_whatsapp)
    if len(objetivo) < 7:
        return None
    candidatos = (
        db.execute(select(Clientes).where(Clientes.telefono.ilike(f"%{objetivo[-7:]}")))
        .scalars()
        .all()
    )
    for cliente in candidatos:
        if _normalizar_telefono(cliente.telefono) == objetivo:
            return cliente
    return None


def _contexto_cliente_mensaje(cliente: Clientes | None) -> SystemMessage | None:
    if cliente is None:
        return None
    nombre = cliente.nombre_contacto or cliente.nombre_razon_social
    datos = []
    if nombre and nombre.strip():
        datos.append(f"nombre/empresa = {nombre.strip()}")
    if cliente.ciudad and cliente.ciudad.strip():
        datos.append(f"ciudad = {cliente.ciudad.strip()}")
    if not datos:
        return None
    return SystemMessage(
        content=(
            "Dato interno (no se lo repitas literal al cliente, es solo "
            "para que no se lo vuelvas a preguntar): ya sabemos que "
            + ", ".join(datos)
            + "."
        )
    )


def _historial_a_mensajes(mensajes: list[dict]) -> list[BaseMessage]:
    convertidos: list[BaseMessage] = []
    for m in mensajes:
        texto = _etiqueta(m)
        if not texto:
            continue
        if m.get("direction") == "inbound":
            convertidos.append(HumanMessage(content=texto))
        else:
            convertidos.append(AIMessage(content=texto))
    return convertidos


def procesar_mensaje_entrante(phone_number_id, conversation_id: int | None) -> None:
    if conversation_id is None or str(phone_number_id) not in LINEAS_CON_BOT:
        return

    if not esta_en_horario_bot():
        return

    try:
        contexto = _contexto_conversacion(conversation_id)
    except Exception:
        logger.exception(
            "Bot WA: error consultando la conversación | conversation_id=%s", conversation_id
        )
        return

    if contexto is None:
        return

    db = SessionLocal()
    try:
        cliente = _buscar_cliente_por_telefono(db, contexto["telefono"])
    finally:
        db.close()

    mensajes_lc: list[BaseMessage] = []
    contexto_cliente = _contexto_cliente_mensaje(cliente)
    if contexto_cliente is not None:
        mensajes_lc.append(contexto_cliente)
    mensajes_lc.extend(_historial_a_mensajes(contexto["mensajes"]))

    try:
        texto_respuesta = responder(mensajes_lc)
    except Exception:
        logger.exception(
            "Bot WA: error generando respuesta | conversation_id=%s", conversation_id
        )
        return

    if not texto_respuesta:
        return

    WhatsappService.enviar_texto(contexto["telefono"], texto_respuesta, conversation_id)
    logger.info("Bot WA: respuesta enviada | conversation_id=%s", conversation_id)
