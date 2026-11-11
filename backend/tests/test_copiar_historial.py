"""Copia del historial de CimaSuite a las tablas propias, conservando los ids."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select, text

from app.core.config import settings
from app.core.db import SessionLocal
from app.integrations.cimasuite import almacen_chat, copiar_historial as ch
from app.models.whatsapp_chat import WhatsAppConversacion, WhatsAppMensaje

TEL = "573001112233"


class CimaSuiteFalso:
    """Lo que lee la copia, paginado como la API real (más reciente primero)."""

    def __init__(self, conversaciones, mensajes):
        self.conv, self.msgs, self.descargas = conversaciones, mensajes, []

    def listar_conversaciones(self, page=1, limit=100, phone_number_id=None):
        trozo = self.conv[(page - 1) * limit : page * limit]
        return {"data": trozo, "pagination": {"pages": max(1, -(-len(self.conv) // limit))}}

    def obtener_mensajes(self, cid, page=1, limit=200):
        todos = sorted(self.msgs[cid], key=lambda m: m["created_at"], reverse=True)
        bloque = todos[(page - 1) * limit : page * limit]
        return {"messages": list(reversed(bloque)), "pagination": {"pages": max(1, -(-len(todos) // limit))}}

    def descargar_media(self, media_id):
        self.descargas.append(media_id)
        return b"%PDF-historico", "application/pdf"


def _msg(i, wamid, direccion, minutos, **kw):
    return {
        "id": i, "whatsapp_message_id": wamid, "direction": direccion, "type": kw.pop("type", "text"),
        "content": kw.pop("content", f"mensaje {i}"), "status": "read" if direccion != "inbound" else None,
        "created_at": (datetime.now(timezone.utc) - timedelta(minutes=minutos)).isoformat(), **kw,
    }


def _conv(cid, tel, linea, total, sin_leer=0, **kw):
    return {"id": cid, "contact": {"whatsapp_number": tel, "name": "Ana"}, "phone_number": {"id": linea, "display_name": "x"},
            "total_messages": total, "unread_count": sin_leer, **kw}


@pytest.fixture
def mundo():
    base = uuid.uuid4().int % 10**6 * 10
    w = uuid.uuid4().hex
    conv = [_conv(base + 1, TEL, 7, 3, sin_leer=1, is_pinned=True), _conv(base + 2, TEL, 8, 1)]
    msgs = {
        base + 1: [_msg(base + 11, f"wamid.{w}A", "inbound", 100), _msg(base + 12, f"wamid.{w}B", "outbound", 90),
                   _msg(base + 13, f"wamid.{w}C", "inbound", 5, type="document", content=None, media_id=f"M{w}", media_filename="Cotización.pdf")],
        base + 2: [_msg(base + 21, f"wamid.{w}D", "inbound", 30, content="por la otra línea")],
    }
    return CimaSuiteFalso(conv, msgs), base, w


def _estado(db, cid):
    return db.execute(
        text("SELECT (SELECT count(*) FROM whatsapp_mensajes WHERE conversacion_id = :c), no_leidos, is_pinned, phone_number_id "
             "FROM whatsapp_conversaciones WHERE id = :c"), {"c": cid}
    ).one()


def test_copia_conservando_los_ids_de_cimasuite_y_las_dos_lineas(db, mundo):
    cliente, base, _ = mundo

    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=False)

    assert r.mensajes_nuevos == 4 and not r.diferencias() and not r.unidas
    db.expire_all()
    assert _estado(db, base + 1) == (3, 1, True, 7)    # un entrante sin leer, fijada, línea 7
    assert _estado(db, base + 2) == (1, 0, False, 8)   # el mismo cliente en la línea 8: otra conversación
    assert db.scalar(text("SELECT count(*) FROM whatsapp_contactos")) == 1


def test_repetir_la_copia_no_duplica(db, mundo):
    cliente, base, _ = mundo
    ch.copiar_historial(cliente, SessionLocal, con_archivos=False)
    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=False)
    assert r.mensajes_nuevos == 0
    db.expire_all()
    assert _estado(db, base + 1)[0] == 3


def test_la_secuencia_sigue_despues_de_los_ids_copiados(db, mundo):
    cliente, base, _ = mundo
    ch.copiar_historial(cliente, SessionLocal, con_archivos=False)
    db.expire_all()
    conv, _ = almacen_chat.guardar_mensaje(db, {
        "phone_number_id": 7, "contact": {"whatsapp_number": "573005550000", "name": "Nuevo"},
        "message": {"whatsapp_message_id": "wamid.NUEVO", "content": "hola", "direction": "inbound"},
    })
    db.commit()
    assert conv.id > base + 2  # una conversación nueva no choca con las copiadas


def test_un_mensaje_que_ya_llego_por_evento_no_se_duplica(db, mundo):
    cliente, base, w = mundo
    db.expire_all()
    a_evento = {
        "phone_number_id": 7, "contact": {"whatsapp_number": TEL, "name": "Ana"},
        "message": {"whatsapp_message_id": f"wamid.{w}C", "content": None, "type": "document", "direction": "inbound",
                    "created_at": datetime.now(timezone.utc).isoformat(), "media_id": f"M{w}"},
    }
    almacen_chat.guardar_mensaje(db, a_evento)
    db.commit()

    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=False)

    assert r.mensajes_nuevos == 3  # el 4.º ya estaba; solo se anota su id de CimaSuite
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(WhatsAppMensaje)) == 4
    assert db.scalar(select(WhatsAppMensaje.cimasuite_mensaje_id).where(WhatsAppMensaje.whatsapp_message_id == f"wamid.{w}C")) == base + 13


def test_dos_conversaciones_del_mismo_cliente_en_la_misma_linea_se_unen(db):
    base = uuid.uuid4().int % 10**6 * 10
    w = uuid.uuid4().hex
    conv = [_conv(base + 1, TEL, 7, 1), _conv(base + 2, "+" + TEL, 7, 1)]
    msgs = {base + 1: [_msg(base + 11, f"wamid.{w}A", "inbound", 20)], base + 2: [_msg(base + 21, f"wamid.{w}B", "inbound", 10)]}
    cliente = CimaSuiteFalso(conv, msgs)

    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=False)

    assert r.unidas == {base + 2: base + 1} and not r.diferencias()
    with SessionLocal() as s:
        assert s.scalar(select(func.count()).select_from(WhatsAppConversacion)) == 1
        assert s.scalar(select(func.count()).select_from(WhatsAppMensaje)) == 2


def test_verificar_no_escribe_y_avisa_la_diferencia(db, mundo):
    cliente, base, _ = mundo
    r = ch.copiar_historial(cliente, SessionLocal, solo_verificar=True)
    assert r.mensajes_nuevos == 0 and set(r.diferencias()) == {base + 1, base + 2}
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(WhatsAppMensaje)) == 0
    assert db.scalar(text("SELECT count(*) FROM whatsapp_contactos")) == 0


def test_los_archivos_del_historial_se_copian_al_servidor(db, mundo, tmp_path, monkeypatch):
    cliente, base, w = mundo
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(tmp_path / "wa"))

    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=True)

    assert r.archivos_copiados == 1 and r.archivos_fallidos == 0 and cliente.descargas == [f"M{w}"]
    assert (tmp_path / "wa" / "whatsapp" / str(base + 1) / f"wamid.{w}C.pdf").read_bytes() == b"%PDF-historico"


def test_un_archivo_ya_en_el_disco_se_anota_sin_volver_a_descargarlo(db, mundo, tmp_path, monkeypatch):
    """Caso real: una copia anterior bajó el archivo pero no alcanzó a anotarlo en la base."""
    cliente, base, w = mundo
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(tmp_path / "wa"))
    ch.copiar_historial(cliente, SessionLocal, con_archivos=False)     # mensajes sí, archivos pendientes
    carpeta = tmp_path / "wa" / "whatsapp" / str(base + 1)
    carpeta.mkdir(parents=True)
    (carpeta / f"wamid.{w}C.pdf").write_bytes(b"%PDF-ya-estaba")

    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=True)

    assert r.archivos_copiados == 1 and r.archivos_fallidos == 0
    assert cliente.descargas == []                                      # no volvió a bajarlo
    db.expire_all()
    clave = db.scalar(select(WhatsAppMensaje.media_clave).where(WhatsAppMensaje.whatsapp_message_id == f"wamid.{w}C"))
    assert clave == f"whatsapp/{base + 1}/wamid.{w}C.pdf"


def test_los_archivos_pendientes_de_una_corrida_anterior_se_reintentan(db, mundo, tmp_path, monkeypatch):
    cliente, base, w = mundo
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(tmp_path / "wa"))
    ch.copiar_historial(cliente, SessionLocal, con_archivos=False)      # primera corrida: sin archivos
    r = ch.copiar_historial(cliente, SessionLocal, con_archivos=True)   # segunda: mensajes ya existen
    assert r.mensajes_nuevos == 0 and r.archivos_copiados == 1
    assert f"M{w}" in cliente.descargas


def test_el_script_carga_todos_los_modelos():
    """Fuera de la app el __init__ de los modelos está vacío: sin importarlos todos, guardar un
    mensaje falla con NoReferencedTableError (pasó en producción)."""
    import subprocess
    import sys

    codigo = ("import app.scripts.copiar_historial_cimasuite as s; from app.core.db import Base; "
              "assert 'usuarios' in Base.metadata.tables")
    r = subprocess.run([sys.executable, "-c", codigo], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-400:]
