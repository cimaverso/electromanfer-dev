"""
Cliente WebSocket hacia CimaSuite. Es el mismo archivo en Hospedia y en
Electromanfer: cualquier cambio se copia a los dos.

- Se autentica con el header "api-key" (en la URL quedaba escrita en los
  access logs de CimaSuite y de cualquier proxy intermedio).
- Guarda el id del último evento procesado y al reconectar lo manda en
  "Last-Event-ID": CimaSuite reenvía, en orden, lo que llegó mientras tanto.
  Así ni un corte de red ni un redeploy pierden mensajes.
- Reintenta con backoff exponencial si se cae la conexión.
"""
import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Protocol

import websockets

logger = logging.getLogger(__name__)

EventHandler = Callable[[str, dict], Awaitable[None]]

# Un fallo puntual (BD caída un instante) se reintenta antes de dar el evento
# por perdido; sin tope, un evento que siempre falla frenaría todos los demás.
HANDLER_ATTEMPTS = 3
HANDLER_RETRY_SECONDS = 2
MAX_BACKOFF_SECONDS = 60


class CursorStore(Protocol):
    """Dónde se guarda el id del último evento procesado (sobrevive reinicios)."""

    async def load(self) -> str | None: ...

    async def save(self, event_id: str) -> None: ...


class CimaSuiteWSClient:
    def __init__(
        self,
        url: str,
        api_key: str,
        handler: EventHandler,
        cursor_store: CursorStore | None = None,
    ):
        self._url = url
        self._api_key = api_key
        self._handler = handler
        self._cursor_store = cursor_store
        self._cursor: str | None = None
        self._task: asyncio.Task | None = None
        self._stop = False

    def start(self) -> None:
        if not self._url or not self._api_key:
            logger.warning("CimaSuiteWSClient: falta URL o api-key, no se inicia")
            return
        self._stop = False
        self._task = asyncio.create_task(self._run_forever())
        logger.info("CimaSuiteWSClient: tarea de escucha iniciada")

    async def stop(self) -> None:
        self._stop = True
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run_forever(self) -> None:
        if self._cursor_store:
            try:
                self._cursor = await self._cursor_store.load()
            except Exception:
                logger.exception("CimaSuiteWSClient: no se pudo leer el cursor guardado")
        backoff = 1
        while not self._stop:
            headers = {"api-key": self._api_key}
            if self._cursor:
                headers["Last-Event-ID"] = self._cursor
            try:
                async with websockets.connect(
                    self._url, additional_headers=headers, ping_interval=20, ping_timeout=20
                ) as ws:
                    logger.info(
                        "Conectado al WS de CimaSuite (desde evento %s)", self._cursor or "actual"
                    )
                    backoff = 1
                    async for raw in ws:
                        await self._dispatch(raw)
            except asyncio.CancelledError:
                raise
            except Exception as e:  # noqa: BLE001
                if self._stop:
                    break
                # Solo el tipo: el texto de algunas excepciones trae la URL o headers.
                logger.warning(
                    "WS CimaSuite desconectado (%s) -- reintentando en %ss",
                    type(e).__name__,
                    backoff,
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF_SECONDS)

    async def _dispatch(self, raw: str) -> None:
        try:
            payload = json.loads(raw)
            event = payload["event"]
            data = payload.get("data") or {}
        except (json.JSONDecodeError, KeyError, TypeError):
            logger.warning("WS CimaSuite: payload malformado (%d bytes)", len(raw))
            return

        if event == "events.truncated":
            # CimaSuite ya no tiene todo lo que pasó desde el cursor: el
            # handler decide cómo resincronizar.
            logger.error("WS CimaSuite: se perdieron eventos anteriores a la reconexión")

        for attempt in range(1, HANDLER_ATTEMPTS + 1):
            try:
                await self._handler(event, data)
                break
            except Exception:
                logger.exception(
                    "Error procesando evento WS '%s' (intento %s/%s)",
                    event,
                    attempt,
                    HANDLER_ATTEMPTS,
                )
                if attempt < HANDLER_ATTEMPTS:
                    await asyncio.sleep(HANDLER_RETRY_SECONDS)

        event_id = payload.get("id")
        if event_id:
            await self._save_cursor(event_id)

    async def _save_cursor(self, event_id: str) -> None:
        self._cursor = event_id
        if not self._cursor_store:
            return
        try:
            await self._cursor_store.save(event_id)
        except Exception:
            # Queda en memoria: si se reconecta sin reiniciar no se pierde nada.
            logger.exception("CimaSuiteWSClient: no se pudo guardar el cursor %s", event_id)
