"""Pruebas del endpoint de Siasoft: clave, tope de peticiones y paginación."""
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.routes import siasoft


@pytest.fixture(autouse=True)
def _limpio(monkeypatch):
    siasoft._peticiones.clear()
    monkeypatch.setattr(settings, "SIASOFT_API_KEY", "clave-de-prueba")
    monkeypatch.setattr(settings, "SIASOFT_RATE_LIMIT_POR_MINUTO", 3)
    yield
    siasoft._peticiones.clear()


def test_sin_clave_configurada_esta_apagado(monkeypatch):
    monkeypatch.setattr(settings, "SIASOFT_API_KEY", "")
    with pytest.raises(HTTPException) as e:
        siasoft.verificar_siasoft("lo-que-sea")
    assert e.value.status_code == 503


def test_clave_incorrecta_o_ausente():
    for k in (None, "mala"):
        with pytest.raises(HTTPException) as e:
            siasoft.verificar_siasoft(k)
        assert e.value.status_code == 401


def test_tope_por_minuto():
    for _ in range(3):
        siasoft.verificar_siasoft("clave-de-prueba")
    with pytest.raises(HTTPException) as e:
        siasoft.verificar_siasoft("clave-de-prueba")
    assert e.value.status_code == 429
    assert int(e.value.headers["Retry-After"]) >= 1


def test_clave_mala_no_gasta_el_tope():
    for _ in range(10):
        with pytest.raises(HTTPException):
            siasoft.verificar_siasoft("mala")
    siasoft.verificar_siasoft("clave-de-prueba")
