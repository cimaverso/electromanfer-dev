"""Archivos del chat de WhatsApp, guardados en el servidor de Electromanfer."""
import pytest

from app.core.config import settings
from app.integrations.cimasuite import archivos_whatsapp as a


@pytest.fixture
def carpeta(tmp_path, monkeypatch):
    raiz = tmp_path / "wa"
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", str(raiz))
    return raiz


def test_la_clave_es_estable_y_va_bajo_el_prefijo():
    k1 = a.clave_archivo(7, "wamid.ABC", "image/jpeg")
    assert k1 == a.clave_archivo(7, "wamid.ABC", "image/jpeg") and k1.startswith("whatsapp/7/wamid.ABC.")
    assert a.es_clave(k1) and not a.es_clave("media/foto.jpg") and not a.es_clave(None)


def test_el_nombre_original_manda_sobre_el_tipo():
    assert a.clave_archivo(1, "wamid.X", "application/octet-stream", "Cotización.PDF").endswith(".pdf")


def test_un_id_peligroso_no_escapa():
    clave = a.clave_archivo(1, "../../etc/passwd", "image/png")
    assert ".." not in clave and clave.count("/") == 2
    with pytest.raises(ValueError):
        a.clave_archivo(1, "///", "image/png")


def test_guarda_lee_y_borra(carpeta):
    clave = a.clave_archivo(5, "wamid.G1", "application/pdf", "Cotizacion.pdf")
    assert a.configurado()
    a.guardar(clave, b"%PDF-x")
    assert (carpeta / clave).read_bytes() == b"%PDF-x"
    assert a.leer(clave) == (b"%PDF-x", "application/pdf")
    a.guardar(clave, b"%PDF-y")  # repetir pisa el mismo archivo
    assert a.leer(clave)[0] == b"%PDF-y"
    assert [p.name for p in (carpeta / "whatsapp" / "5").iterdir()] == [clave.rsplit("/", 1)[1]]
    a.borrar(clave)
    assert a.leer(clave) is None


def test_no_sale_de_la_carpeta(carpeta, tmp_path):
    (tmp_path / "secreto.txt").write_text("no")
    assert a.leer("whatsapp/../../secreto.txt") is None and a.leer("/etc/passwd") is None
    with pytest.raises(ValueError):
        a.guardar("whatsapp/../../fuera.txt", b"x")
    assert not (tmp_path / "fuera.txt").exists()


def test_sin_carpeta_no_guarda_archivos(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_ARCHIVOS_DIR", "")
    assert not a.configurado()
