"""Pruebas del backend de Electromanfer.

Corren contra una base propia de pruebas. Por seguridad, se niegan a correr si el
nombre de la base no termina en _local o _test: así nunca tocan una base real.
Ejemplo: DATABASE_URL=postgresql+psycopg2://USUARIO:CLAVE@localhost:5432/electromanfer_local
         CIMAPI_BASE_URL=http://127.0.0.1:9/api/v1 (inválida a propósito, no llama a ninguna API)
"""
import importlib
import pkgutil

import pytest
from sqlalchemy import text

from app.core.config import settings
import app.models as _paquete_modelos
from app.core.db import SessionLocal, engine

# El __init__ de los modelos está vacío: se importan todos para que las claves entre tablas se resuelvan.
for _m in pkgutil.iter_modules(_paquete_modelos.__path__):
    importlib.import_module(f"app.models.{_m.name}")


def pytest_sessionstart(session):
    nombre = settings.DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]
    if not nombre.endswith(("_local", "_test")):
        pytest.exit(f"Base '{nombre}' no permitida para pruebas: debe terminar en _local o _test.", returncode=2)
    if "127.0.0.1:9" not in settings.CIMAPI_BASE_URL and "localhost:9" not in settings.CIMAPI_BASE_URL:
        pytest.exit("CIMAPI_BASE_URL debe ser una dirección local inválida para las pruebas.", returncode=2)


@pytest.fixture
def db():
    sesion = SessionLocal()
    try:
        yield sesion
    finally:
        sesion.rollback()
        sesion.close()


@pytest.fixture(autouse=True)
def _limpiar_chat():
    yield
    with engine.begin() as con:
        con.execute(text("TRUNCATE whatsapp_mensajes, whatsapp_conversaciones, whatsapp_contactos RESTART IDENTITY CASCADE"))
