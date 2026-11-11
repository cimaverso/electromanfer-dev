"""Tablas del chat de WhatsApp de Electromanfer (base de pruebas)."""
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models.whatsapp_chat import WhatsAppContacto, WhatsAppConversacion, WhatsAppMensaje


def _conversacion(db, telefono="573001112233", linea=7):
    c = WhatsAppContacto(telefono=telefono, nombre="Ana")
    db.add(c)
    db.flush()
    conv = WhatsAppConversacion(contacto_id=c.id, phone_number_id=linea)
    db.add(conv)
    db.flush()
    return c, conv


def test_un_contacto_puede_tener_una_conversacion_por_linea(db):
    c, _ = _conversacion(db, linea=7)
    db.add(WhatsAppConversacion(contacto_id=c.id, phone_number_id=8))
    db.flush()  # la otra línea sí
    db.add(WhatsAppConversacion(contacto_id=c.id, phone_number_id=7))
    with pytest.raises(IntegrityError):
        db.flush()


def test_el_telefono_del_contacto_es_unico(db):
    _conversacion(db)
    db.add(WhatsAppContacto(telefono="573001112233"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_el_mismo_wamid_no_se_guarda_dos_veces_pero_sin_wamid_si(db):
    _, conv = _conversacion(db)
    db.add(WhatsAppMensaje(conversacion_id=conv.id, whatsapp_message_id="wamid.A", direccion="inbound"))
    db.add(WhatsAppMensaje(conversacion_id=conv.id, direccion="outbound"))
    db.add(WhatsAppMensaje(conversacion_id=conv.id, direccion="outbound"))
    db.flush()
    db.add(WhatsAppMensaje(conversacion_id=conv.id, whatsapp_message_id="wamid.A", direccion="inbound"))
    with pytest.raises(IntegrityError):
        db.flush()


def test_se_puede_conservar_el_id_de_la_conversacion_de_cimasuite(db):
    c = WhatsAppContacto(telefono="573009998877")
    db.add(c)
    db.flush()
    db.add(WhatsAppConversacion(id=4321, contacto_id=c.id, phone_number_id=8))
    db.flush()
    assert db.get(WhatsAppConversacion, 4321).phone_number_id == 8


def test_borrar_el_contacto_borra_su_chat(db):
    c, conv = _conversacion(db)
    db.add(WhatsAppMensaje(conversacion_id=conv.id, direccion="inbound", contenido="hola"))
    db.flush()
    db.delete(c)
    db.flush()
    assert db.execute(text("SELECT count(*) FROM whatsapp_mensajes")).scalar_one() == 0


def test_la_busqueda_por_parte_de_una_palabra(db):
    _, conv = _conversacion(db)
    db.add(WhatsAppMensaje(conversacion_id=conv.id, direccion="inbound", contenido="Necesito cotización de cable"))
    db.flush()
    n = db.execute(text("SELECT count(*) FROM whatsapp_mensajes WHERE contenido ILIKE :q"), {"q": "%cotiza%"}).scalar_one()
    assert n == 1
