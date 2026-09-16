"""
Único endpoint WS hacia el frontend, compartido por cualquier
integración que necesite avisar algo en tiempo real (ver
app/realtime/manager.py).
"""
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.core.config import settings
from app.realtime.manager import realtime_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Realtime"])

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"


def _decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except JWTError:
        return None


@router.websocket("/ws/whatsapp")
async def ws_whatsapp(websocket: WebSocket, token: str = Query(...)):
    usuario_id = _decode_token(token)
    if usuario_id is None:
        await websocket.close(code=4001)
        logger.warning("Realtime WS rechazado | token inválido")
        return

    await realtime_manager.connect(usuario_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await realtime_manager.disconnect(usuario_id, websocket)
