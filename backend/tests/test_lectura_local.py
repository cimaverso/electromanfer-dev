"""Con CHAT_LEER_LOCAL el chat se lee y se opera desde las tablas propias, con la misma
forma de respuesta que daba la API (el frontend no cambia)."""
import io
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_current_user_data
from app.integrations.bot import service as bot
from app.integrations.cimasuite import almacen_chat as a
from app.integrations.cimasuite.client import WhatsappService
from app.main import app
from app.models.asesor_lineas import AsesorLinea
from app.models.usuarios import Usuarios
from app.models.whatsapp_chat import WhatsAppConversacion, WhatsAppMensaje
from app.schemas.auth import TokenData

TEL = "573001112233"


@pytest.fixture(autouse=True)
def _local(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "CHAT_LEER_LOCAL", True)
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(tmp_path / "wa"))


@pytest.fixture
def usuario(db):
    suf = uuid.uuid4().hex[:8]
    u = Usuarios(usuario=f"u{suf}", nombre_completo="Prueba", email=f"{suf}@t.local",
                 cedula_ciudadania=suf, clave="x", rol="GERENCIA", activo=True)
    db.add(u)
    db.commit()
    yield u
    db.query(AsesorLinea).filter(AsesorLinea.usuario_id == u.id).delete()
    db.delete(u)
    db.commit()


@pytest.fixture
def cliente(usuario):
    """Cliente HTTP con la sesión simulada (sin lifespan: no abre el WebSocket de cimapi)."""
    def como(rol="GERENCIA"):
        app.dependency_overrides[get_current_user_data] = lambda: TokenData(
            name="Prueba", email=usuario.email, user_id=usuario.id, role=rol
        )
        return TestClient(app)

    yield como
    app.dependency_overrides.pop(get_current_user_data, None)


def _evento(wamid=None, texto="hola", direccion="inbound", linea=7, tel=TEL, nombre="Ana", minutos=0, **extra):
    return {
        "phone_number_id": linea,
        "contact": {"name": nombre, "whatsapp_number": tel},
        "message": {
            "whatsapp_message_id": wamid or f"wamid.{uuid.uuid4().hex}", "type": extra.pop("type", "text"),
            "content": texto, "direction": direccion,
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=minutos)).isoformat(), **extra,
        },
    }


def _guardar(db, **kw):
    conv, m = a.guardar_mensaje(db, _evento(**kw))
    db.commit()
    return conv, m


def test_la_lista_tiene_la_forma_de_siempre_y_filtra_por_linea(db, cliente):
    c7, _ = _guardar(db, texto="Quiero una cotización", linea=7)
    c8, _ = _guardar(db, texto="Precio del cable", linea=8, tel="573009998877", nombre="Luis")
    http = cliente()

    todas = http.get("/api/whatsapp/conversaciones").json()
    assert {c["id"] for c in todas["data"]} == {c7.id, c8.id}
    chat = next(c for c in todas["data"] if c["id"] == c7.id)
    assert chat["contact"]["name"] == "Ana" and chat["contact_phone"]["phone"] == TEL
    assert chat["last_message"]["content"] == "Quiero una cotización" and chat["unread_count"] == 1
    assert chat["phone_number"] == {"id": 7, "display_name": "Ferretería 2"}
    assert chat["is_pinned"] is False and chat["bot_desactivado"] is False and chat["is_open"] is True
    assert todas["pagination"] == {"page": 1, "limit": 20, "total": 2, "pages": 1}

    solo8 = http.get("/api/whatsapp/conversaciones?linea_id=8").json()
    assert [c["id"] for c in solo8["data"]] == [c8.id]


def test_un_vendedor_solo_ve_y_usa_su_linea(db, cliente, usuario):
    c7, _ = _guardar(db, linea=7)
    c8, _ = _guardar(db, linea=8, tel="573009998877")
    db.add(AsesorLinea(usuario_id=usuario.id, phone_number_id="7"))
    db.commit()
    http = cliente("VENDEDOR")

    assert [c["id"] for c in http.get("/api/whatsapp/conversaciones").json()["data"]] == [c7.id]
    assert http.get(f"/api/whatsapp/conversaciones/{c7.id}/mensajes").status_code == 200
    assert http.get(f"/api/whatsapp/conversaciones/{c8.id}/mensajes").status_code == 403
    assert http.patch(f"/api/whatsapp/conversaciones/{c8.id}", json={"is_pinned": True}).status_code == 403
    assert http.delete(f"/api/whatsapp/conversaciones/{c8.id}").status_code == 403


def test_el_historial_pagina_del_mas_reciente_y_respeta_vaciar(db, cliente):
    for n in range(5):
        conv, _ = _guardar(db, texto=f"mensaje {n}", minutos=50 - n)
    http = cliente()

    p1 = http.get(f"/api/whatsapp/conversaciones/{conv.id}/mensajes?limit=3").json()
    p2 = http.get(f"/api/whatsapp/conversaciones/{conv.id}/mensajes?limit=3&page=2").json()
    assert [m["content"] for m in p1["messages"]] == ["mensaje 2", "mensaje 3", "mensaje 4"]
    assert [m["content"] for m in p2["messages"]] == ["mensaje 0", "mensaje 1"]
    assert p1["pagination"]["pages"] == 2 and p1["contact_phone"]["phone"] == TEL and p1["bot_desactivado"] is False

    assert http.delete(f"/api/whatsapp/conversaciones/{conv.id}/mensajes").status_code == 200
    assert http.get(f"/api/whatsapp/conversaciones/{conv.id}/mensajes").json()["messages"] == []
    lista = {c["id"]: c for c in http.get("/api/whatsapp/conversaciones").json()["data"]}
    assert lista[conv.id]["last_message"] is None and lista[conv.id]["total_messages"] == 0
    # si el cliente vuelve a escribir, lo nuevo se ve
    _guardar(db, texto="de nuevo")
    assert [m["content"] for m in http.get(f"/api/whatsapp/conversaciones/{conv.id}/mensajes").json()["messages"]] == ["de nuevo"]


def test_eliminar_la_saca_de_la_lista_hasta_que_el_cliente_escriba(db, cliente):
    conv, _ = _guardar(db)
    http = cliente()
    http.patch(f"/api/whatsapp/conversaciones/{conv.id}", json={"is_pinned": True})
    assert http.get("/api/whatsapp/conversaciones").json()["data"][0]["is_pinned"] is True

    assert http.delete(f"/api/whatsapp/conversaciones/{conv.id}").status_code == 200
    assert http.get("/api/whatsapp/conversaciones").json()["data"] == []

    _guardar(db, texto="vuelvo")
    lista = http.get("/api/whatsapp/conversaciones").json()["data"]
    assert [c["id"] for c in lista] == [conv.id] and lista[0]["is_pinned"] is False


def test_buscar_por_texto_y_por_nombre(db, cliente):
    c1, _ = _guardar(db, texto="Necesito la cotización del cable calibre 12")
    _guardar(db, texto="Gracias", tel="573009998877", nombre="Luis")
    http = cliente()

    r = http.get("/api/whatsapp/buscar?q=cotizaci").json()
    assert [m["conversation_id"] for m in r["messages"]] == [c1.id]
    assert "cotizaci" in r["messages"][0]["snippet"].lower() and r["messages"][0]["contact"]["name"] == "Ana"
    assert [c["conversation_id"] for c in http.get("/api/whatsapp/buscar?q=Luis").json()["contacts"]] == [
        db.execute(select(WhatsAppConversacion.id).where(WhatsAppConversacion.id != c1.id)).scalar_one()
    ]
    assert http.get("/api/whatsapp/buscar?q=cotizaci&linea_id=8").json()["messages"] == []


def test_enviar_texto_sale_por_la_linea_de_la_conversacion_y_queda_guardado(db, cliente, usuario, monkeypatch):
    conv, _ = _guardar(db, linea=8)
    enviados = []

    def enviar(to, message, conversation_id=None, phone_number_id=None):
        enviados.append((to, message, conversation_id, phone_number_id))
        return {"status": "sent", "message": {"whatsapp_message_id": "wamid.OUT1", "type": "text", "content": message, "status": "sent"}}

    monkeypatch.setattr(WhatsappService, "enviar_texto", staticmethod(enviar))

    r = cliente().post("/api/whatsapp/mensajes/texto", json={"to": "999", "message": "Claro, te cotizo", "conversation_id": conv.id})

    assert r.status_code == 200 and enviados == [(TEL, "Claro, te cotizo", None, 8)]
    db.expire_all()
    m = db.execute(select(WhatsAppMensaje).where(WhatsAppMensaje.whatsapp_message_id == "wamid.OUT1")).scalar_one()
    assert (m.direccion, m.enviado_por_usuario_id, m.enviado_por_bot, m.conversacion_id) == ("outbound", usuario.id, False, conv.id)


def test_enviar_a_una_conversacion_que_no_existe_da_404(cliente):
    r = cliente().post("/api/whatsapp/mensajes/texto", json={"to": "1", "message": "x", "conversation_id": 99999})
    assert r.status_code == 404


def test_si_no_se_puede_guardar_lo_enviado_el_usuario_no_ve_error(db, cliente, monkeypatch):
    conv, _ = _guardar(db)
    monkeypatch.setattr(WhatsappService, "enviar_texto", staticmethod(lambda *a, **k: {"status": "sent", "message": {"whatsapp_message_id": "wamid.X", "type": "text"}}))
    monkeypatch.setattr(a, "guardar_mensaje", lambda *x, **k: (_ for _ in ()).throw(RuntimeError("base caída")))
    r = cliente().post("/api/whatsapp/mensajes/texto", json={"to": "1", "message": "hola", "conversation_id": conv.id})
    assert r.status_code == 200 and r.json()["status"] == "sent"


def test_enviar_un_archivo_lo_guarda_en_el_servidor(db, cliente, tmp_path, monkeypatch):
    conv, _ = _guardar(db, linea=7)

    def enviar(to, file, conversation_id=None, caption=None, phone_number_id=None):
        assert file.file.read() == b"%PDF-contenido" and phone_number_id == 7
        return {"status": "sent", "message": {"whatsapp_message_id": "wamid.FILE1", "type": "document", "media_id": "MED1", "media_filename": "Cotizacion.pdf"}}

    monkeypatch.setattr(WhatsappService, "enviar_documento", staticmethod(enviar))
    http = cliente()

    r = http.post("/api/whatsapp/mensajes/documento", data={"to": "1", "conversation_id": conv.id},
                  files={"file": ("Cotizacion.pdf", io.BytesIO(b"%PDF-contenido"), "application/pdf")})

    assert r.status_code == 200
    db.expire_all()
    m = db.execute(select(WhatsAppMensaje).where(WhatsAppMensaje.media_id == "MED1")).scalar_one()
    assert m.media_clave == f"whatsapp/{conv.id}/wamid.FILE1.pdf"
    # y el archivo se sirve desde el servidor, sin pedirlo a cimapi
    monkeypatch.setattr(WhatsappService, "descargar_media", staticmethod(lambda mid: (_ for _ in ()).throw(AssertionError("no debe pedirlo a cimapi"))))
    ver = http.get("/api/whatsapp/media/MED1")
    assert ver.status_code == 200 and ver.content == b"%PDF-contenido" and ver.headers["content-type"].startswith("application/pdf")


def test_un_archivo_aun_no_copiado_se_pide_a_cimapi_y_queda_guardado(db, cliente, monkeypatch):
    conv, m = _guardar(db, texto=None, type="image", media_id="MED2", media_filename="foto.jpg", wamid="wamid.IMG2")
    monkeypatch.setattr(WhatsappService, "descargar_media", staticmethod(lambda mid: (b"\xff\xd8\xff-foto", "image/jpeg")))
    http = cliente()

    assert http.get("/api/whatsapp/media/MED2").content == b"\xff\xd8\xff-foto"
    db.expire_all()
    assert db.get(WhatsAppMensaje, m.id).media_clave == f"whatsapp/{conv.id}/wamid.IMG2.jpg"


# ---- el asistente (bot) ----

class _Respuestas:
    def __init__(self):
        self.enviados, self.historial = [], None


@pytest.fixture
def asistente(monkeypatch):
    r = _Respuestas()
    monkeypatch.setattr(bot, "obtener_config", lambda db: SimpleNamespace(instrucciones_extra=""))
    monkeypatch.setattr(bot, "bot_activo_ahora", lambda db, linea: True)
    monkeypatch.setattr(bot, "registrar_uso", lambda *a, **k: None)

    def responder(mensajes, instrucciones):
        r.historial = [(type(m).__name__, m.content) for m in mensajes]
        return "Hola, ¿de qué ciudad nos escribes?", {"input_tokens": 10, "output_tokens": 5}

    def enviar(to, message, conversation_id=None, phone_number_id=None):
        r.enviados.append((to, message, conversation_id, phone_number_id))
        return {"status": "sent", "message": {"whatsapp_message_id": f"wamid.BOT{len(r.enviados)}", "type": "text", "content": message, "status": "sent"}}

    monkeypatch.setattr(bot, "responder", responder)
    monkeypatch.setattr(WhatsappService, "enviar_texto", staticmethod(enviar))
    return r


def test_el_asistente_lee_el_historial_de_la_base_propia_y_su_respuesta_queda_guardada(db, asistente):
    _guardar(db, texto="Buenas, necesito cable", minutos=10)
    conv, _ = _guardar(db, texto="¿tienen calibre 12?", minutos=1)

    bot.procesar_mensaje_entrante(7, conv.id)

    assert asistente.historial == [("HumanMessage", "Buenas, necesito cable"), ("HumanMessage", "¿tienen calibre 12?")]
    assert asistente.enviados == [(TEL, "Hola, ¿de qué ciudad nos escribes?", None, 7)]
    db.expire_all()
    m = db.execute(select(WhatsAppMensaje).where(WhatsAppMensaje.whatsapp_message_id == "wamid.BOT1")).scalar_one()
    assert (m.direccion, m.enviado_por_bot, m.enviado_por_usuario_id) == ("outbound", True, None)
    # la siguiente vez, su respuesta ya está en el historial y no vuelve a contestar sobre lo mismo
    asistente.enviados.clear()
    bot.procesar_mensaje_entrante(7, conv.id)
    assert asistente.enviados == []


def test_el_asistente_no_responde_si_lo_ultimo_es_nuestro_ni_con_el_bot_apagado_en_el_chat(db, asistente):
    conv, _ = _guardar(db, texto="hola", minutos=5)
    a.guardar_mensaje(db, _evento(texto="ya te atendemos", direccion="outbound"))
    db.commit()
    bot.procesar_mensaje_entrante(7, conv.id)
    assert asistente.enviados == []

    conv2, _ = _guardar(db, texto="otra consulta", tel="573009998877")
    from app.models.bot_chat_desactivado import BotChatDesactivado
    db.add(BotChatDesactivado(conversation_id=conv2.id))
    db.commit()
    bot.procesar_mensaje_entrante(7, conv2.id)
    assert asistente.enviados == []
    db.query(BotChatDesactivado).delete()
    db.commit()


def test_el_asistente_solo_atiende_las_lineas_con_bot(db, asistente):
    conv, _ = _guardar(db, texto="hola", linea=9)
    bot.procesar_mensaje_entrante(9, conv.id)
    assert asistente.enviados == [] and asistente.historial is None


def test_el_bot_ignora_mensajes_de_mas_de_15_minutos():
    from datetime import datetime, timedelta, timezone

    from app.integrations.cimasuite.handler import _es_reciente

    ahora = datetime.now(timezone.utc)
    nuevo = {"message": {"created_at": (ahora - timedelta(minutes=2)).isoformat()}}
    viejo = {"message": {"created_at": (ahora - timedelta(hours=9)).isoformat()}}
    assert _es_reciente(nuevo, ahora) is True
    assert _es_reciente(viejo, ahora) is False
    assert _es_reciente({"message": {}}, ahora) is True            # sin fecha: se comporta como siempre
    assert _es_reciente({"message": {"created_at": "basura"}}, ahora) is True
