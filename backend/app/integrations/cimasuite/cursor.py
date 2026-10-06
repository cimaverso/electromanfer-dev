"""Cursor de eventos de CimaSuite guardado en la BD de Electromanfer (ver
CursorStore en ws_client.py). La BD es síncrona: se usa en un hilo para no
frenar el WebSocket."""
import asyncio

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

from app.core.db import SessionLocal
from app.models.cimasuite_cursor import CimaSuiteCursor


def _load() -> str | None:
    db = SessionLocal()
    try:
        fila = db.get(CimaSuiteCursor, 1)
        return fila.ultimo_evento_id if fila else None
    finally:
        db.close()


def _save(event_id: str) -> None:
    db = SessionLocal()
    try:
        stmt = insert(CimaSuiteCursor).values(id=1, ultimo_evento_id=event_id)
        db.execute(
            stmt.on_conflict_do_update(
                index_elements=[CimaSuiteCursor.id],
                set_={"ultimo_evento_id": event_id, "actualizado_en": func.now()},
            )
        )
        db.commit()
    finally:
        db.close()


class DbCursorStore:
    async def load(self) -> str | None:
        return await asyncio.to_thread(_load)

    async def save(self, event_id: str) -> None:
        await asyncio.to_thread(_save, event_id)
