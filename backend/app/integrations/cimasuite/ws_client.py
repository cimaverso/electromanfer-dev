"""
Cliente WS persistente hacia CimAPI. Se conecta como cliente al
endpoint /ws de CimAPI, autenticado por ?api_key=... (query param, el
mismo patrón que usa Hospedia contra CimaSuite). Reintenta con backoff
exponencial si se cae la conexión.
"""
import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import websockets

from app.core.config import settings

logger = logging.getLogger(__name__)

EventHandler = Callable[[str, dict], Awaitable[None]]


class CimApiWSClient:
    def __init__(self, handler: EventHandler):
        self._handler = handler
        self._task: asyncio.Task | None = None
        self._stop = False

    def start(self) -> None:
        if not settings.CIMAPI_WS_URL:
            logger.warning("CimApiWSClient: CIMAPI_WS_URL no configurado, no se inicia")
            return
        self._stop = False
        self._task = asyncio.create_task(self._run_forever())
        logger.info("CimApiWSClient: tarea de escucha iniciada")

    async def stop(self) -> None:
        self._stop = True
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run_forever(self) -> None:
        backoff = 1
        url = f"{settings.CIMAPI_WS_URL}?api_key={settings.CIMAPI_API_KEY}"
        while not self._stop:
            try:
                async with websockets.connect(
                    url, ping_interval=20, ping_timeout=20
                ) as ws:
                    logger.info("Conectado al WS de CimAPI")
                    backoff = 1
                    async for raw in ws:
                        await self._dispatch(raw)
            except asyncio.CancelledError:
                raise
            except Exception as e:  # noqa: BLE001
                if self._stop:
                    break
                logger.warning(
                    "WS CimAPI desconectado (%s) -- reintentando en %ss", e, backoff
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def _dispatch(self, raw: str) -> None:
        try:
            payload = json.loads(raw)
            event = payload["event"]
            data = payload.get("data", {})
        except (json.JSONDecodeError, KeyError, TypeError):
            logger.warning("WS CimAPI: payload malformado: %s", raw)
            return
        try:
            await self._handler(event, data)
        except Exception:
            logger.exception("Error procesando evento WS '%s'", event)
