"""El chat de WhatsApp entregado por eventos se guarda en las tablas propias."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.integrations.cimasuite import almacen_chat as a
from app.integrations.cimasuite import archivos_whatsapp, handler
from app.models.whatsapp_chat import WhatsAppContacto, WhatsAppConversacion, WhatsAppMensaje

TEL = "573001112233"


def _evento(wamid=None, texto="hola", direccion="inbound", linea=7, tel=TEL, nombre="Ana", cuando=None, **extra):
    return {
        "conversation_id": None,
        "phone_number_id": linea,
        "contact": {"id": None, "name": nombre, "whatsapp_number": tel},
        "message": {
            "id": None, "whatsapp_message_id": wamid or f"wamid.{uuid.uuid4().hex}", "type": extra.pop("type", "text"),
            "content": texto, "direction": direccion,
            "created_at": (cuando or datetime.now(timezone.utc)).isoformat(), **extra,
        },
    }


def _contar(db, modelo):
    return db.execute(select(func.count()).select_from(modelo)).scalar_one()


def test_un_mensaje_entrante_crea_contacto_conversacion_y_mensaje(db):
    conv, m = a.guardar_mensaje(db, _evento())
    db.commit()
    assert m.direccion == "inbound" and m.leido_en is None
    assert (conv.no_leidos, conv.phone_number_id) == (1, 7) and conv.ultimo_entrante_en is not None
    assert db.get(WhatsAppContacto, conv.contacto_id).telefono == TEL


def test_repetir_el_evento_no_duplica_ni_suma(db):
    ev = _evento(wamid="wamid.REP")
    for _ in range(3):
        a.guardar_mensaje(db, ev)
        db.commit()
    assert _contar(db, WhatsAppMensaje) == 1 and _contar(db, WhatsAppConversacion) == 1
    assert db.execute(select(WhatsAppConversacion.no_leidos)).scalar_one() == 1


def test_el_mismo_cliente_en_dos_lineas_son_dos_conversaciones(db):
    c7, _ = a.guardar_mensaje(db, _evento(linea=7))
    c8, _ = a.guardar_mensaje(db, _evento(linea=8))
    db.commit()
    assert c7.id != c8.id and c7.contacto_id == c8.contacto_id and _contar(db, WhatsAppContacto) == 1


def test_el_telefono_con_formato_distinto_es_el_mismo_contacto(db):
    a.guardar_mensaje(db, _evento(tel="+57 300 111 2233"))
    a.guardar_mensaje(db, _evento(tel="573001112233"))
    db.commit()
    assert _contar(db, WhatsAppContacto) == 1 and _contar(db, WhatsAppConversacion) == 1


def test_el_nombre_solo_rellena_un_hueco(db):
    a.guardar_mensaje(db, _evento(nombre=None))
    a.guardar_mensaje(db, _evento(nombre="Ana"))
    a.guardar_mensaje(db, _evento(nombre="Otra"))
    db.commit()
    assert db.execute(select(WhatsAppContacto.nombre)).scalar_one() == "Ana"


def test_lo_que_escribe_el_equipo_no_queda_sin_leer(db):
    conv, m = a.guardar_mensaje(db, _evento(direccion="outbound"))
    db.commit()
    assert m.direccion == "outbound" and m.leido_en is not None and m.estado == "sent"
    assert conv.no_leidos == 0 and conv.ultimo_entrante_en is None


def test_un_mensaje_viejo_que_llega_tarde_no_cambia_el_ultimo(db):
    ahora = datetime.now(timezone.utc)
    a.guardar_mensaje(db, _evento(texto="nuevo", cuando=ahora))
    conv, _ = a.guardar_mensaje(db, _evento(texto="viejo", cuando=ahora - timedelta(hours=1)))
    db.commit()
    assert db.get(WhatsAppMensaje, conv.ultimo_mensaje_id).contenido == "nuevo" and conv.no_leidos == 2


def test_una_conversacion_eliminada_reaparece_cuando_el_cliente_escribe(db):
    conv, _ = a.guardar_mensaje(db, _evento())
    conv.eliminada = True
    db.commit()
    conv, _ = a.guardar_mensaje(db, _evento())
    db.commit()
    assert conv.eliminada is False


def test_un_evento_sin_contacto_o_sin_linea_se_ignora(db):
    assert a.guardar_mensaje(db, {"message": {"content": "x"}}) is None
    assert a.guardar_mensaje(db, {**_evento(), "phone_number_id": None}) is None
    assert _contar(db, WhatsAppMensaje) == 0


def test_el_estado_solo_avanza(db):
    a.guardar_mensaje(db, _evento(wamid="wamid.S1", direccion="outbound"))
    assert a.actualizar_estado(db, {"whatsapp_message_id": "wamid.S1", "status": "read"})
    assert not a.actualizar_estado(db, {"whatsapp_message_id": "wamid.S1", "status": "delivered"})
    assert not a.actualizar_estado(db, {"whatsapp_message_id": "wamid.NO", "status": "read"})
    db.commit()
    assert db.execute(select(WhatsAppMensaje.estado)).scalar_one() == "read"


def test_el_archivo_se_copia_al_servidor_y_si_falla_el_mensaje_queda(db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(tmp_path / "wa"))
    conv, m = a.guardar_mensaje(db, _evento(wamid="wamid.F1", texto=None, type="document", media_id="M1", media_filename="Cotización.pdf"))
    db.commit()

    assert a.copiar_archivo(db, m.id, lambda media_id: (b"%PDF-x", "application/pdf"))
    assert db.get(WhatsAppMensaje, m.id).media_clave == f"whatsapp/{conv.id}/wamid.F1.pdf"
    assert archivos_whatsapp.leer(f"whatsapp/{conv.id}/wamid.F1.pdf")[0] == b"%PDF-x"

    conv2, m2 = a.guardar_mensaje(db, _evento(wamid="wamid.F2", texto=None, type="image", media_id="M2"))
    db.commit()
    def roto(media_id):
        raise RuntimeError("cimapi caído")
    assert not a.copiar_archivo(db, m2.id, roto)
    assert db.get(WhatsAppMensaje, m2.id).media_clave is None and db.get(WhatsAppMensaje, m2.id) is not None


def test_sin_carpeta_el_mensaje_se_guarda_y_el_archivo_queda_pendiente(db, monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", "")
    _, m = a.guardar_mensaje(db, _evento(texto=None, media_id="M3", type="image"))
    db.commit()
    assert not a.copiar_archivo(db, m.id, lambda x: (_ for _ in ()).throw(AssertionError("no debe descargar")))


# ---- el manejador de eventos ----

@pytest.fixture
def aislado(monkeypatch):
    """Sin avisos a usuarios y con el bot sustituido: la prueba no usa IA ni red."""
    llamadas = []
    monkeypatch.setattr(handler, "_usuarios_a_notificar_en_sesion", lambda phone: [])
    monkeypatch.setattr(handler, "procesar_mensaje_entrante", lambda phone, conv: llamadas.append((phone, conv)))
    return llamadas


def _fila_local(db):
    return db.execute(select(WhatsAppConversacion.id)).scalars().all()


def test_el_manejador_no_guarda_nada_con_el_ajuste_apagado(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", False)
    asyncio.run(handler.handle_cimapi_event("message.received", _evento()))
    assert _contar(db, WhatsAppMensaje) == 0
    assert aislado == [(7, None)]  # el bot recibe lo mismo de siempre


def test_el_manejador_guarda_y_con_leer_local_el_bot_recibe_el_id_local(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", True)
    monkeypatch.setattr(settings, "CHAT_LEER_LOCAL", True)
    asyncio.run(handler.handle_cimapi_event("message.received", _evento(wamid="wamid.H1")))
    db.expire_all()
    (local_id,) = _fila_local(db)
    assert aislado == [(7, local_id)]


def test_guardar_sin_leer_local_no_cambia_lo_que_recibe_el_bot(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", True)
    monkeypatch.setattr(settings, "CHAT_LEER_LOCAL", False)
    asyncio.run(handler.handle_cimapi_event("message.received", {**_evento(), "conversation_id": 555}))
    assert _contar(db, WhatsAppMensaje) == 1 and aislado == [(7, 555)]


def test_si_guardar_falla_el_bot_y_los_avisos_siguen(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", True)
    monkeypatch.setattr(handler.almacen_chat, "guardar_mensaje", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("base caída")))
    asyncio.run(handler.handle_cimapi_event("message.received", {**_evento(), "conversation_id": 9}))
    assert aislado == [(7, 9)]


def test_el_manejador_guarda_el_estado(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", True)
    asyncio.run(handler.handle_cimapi_event("message.received", _evento(wamid="wamid.E1", direccion="outbound")))
    asyncio.run(handler.handle_cimapi_event("message.status", {"whatsapp_message_id": "wamid.E1", "status": "delivered"}))
    db.expire_all()
    assert db.execute(select(WhatsAppMensaje.estado)).scalar_one() == "delivered"


def test_un_mensaje_saliente_no_activa_al_bot(db, aislado, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_GUARDAR_LOCAL", True)
    asyncio.run(handler.handle_cimapi_event("message.received", _evento(direccion="outbound")))
    assert aislado == []
