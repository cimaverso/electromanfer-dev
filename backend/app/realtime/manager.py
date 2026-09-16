"""
Canal de push backend -> frontend, agnóstico de proveedor. Cualquier
integración que necesite avisar algo en tiempo real (CimaSuite, un
webhook de correo, lo que sea) reutiliza este mismo manager -- no crea
uno propio.

Conexiones agrupadas por usuario_id (un usuario puede tener varias
pestañas abiertas). Un solo proceso/worker por ahora -- si el backend
llega a correr con varios workers, esto debe migrar a Redis pub/sub
(mismo patrón que ya usa CimaSuite en su propio ws_manager).
"""
import asyncio
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class RealtimeManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, usuario_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(usuario_id, []).append(websocket)
        logger.info("Realtime WS conectado | usuario_id=%s", usuario_id)

    async def disconnect(self, usuario_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            conexiones = self._connections.get(usuario_id, [])
            if websocket in conexiones:
                conexiones.remove(websocket)
            if not conexiones and usuario_id in self._connections:
                del self._connections[usuario_id]
        logger.info("Realtime WS desconectado | usuario_id=%s", usuario_id)

    async def send_to_users(self, usuario_ids: list[int], payload: dict) -> None:
        """Envía payload a todas las conexiones activas de esos usuarios."""
        async with self._lock:
            objetivos = []
            for uid in set(usuario_ids):
                objetivos.extend(self._connections.get(uid, []))

        muertas = []
        for ws in objetivos:
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001
                muertas.append(ws)

        if muertas:
            async with self._lock:
                for uid, conexiones in list(self._connections.items()):
                    self._connections[uid] = [w for w in conexiones if w not in muertas]
                    if not self._connections[uid]:
                        del self._connections[uid]


# Instancia global -- se comparte en toda la app
realtime_manager = RealtimeManager()
