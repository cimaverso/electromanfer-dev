# app/schemas/bot.py
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


class BotLineaEstado(BaseModel):
    id: int
    nombre: str
    apagada_manual: bool
    activo_ahora: bool


class BotConfigResponse(BaseModel):
    horario_activo: bool
    horario_reglas: dict
    saldo_usd: float
    instrucciones_extra: str
    lineas: list[BotLineaEstado]


class BotConfigUpdate(BaseModel):
    horario_activo: Optional[bool] = None
    horario_reglas: Optional[dict] = None
    instrucciones_extra: Optional[str] = Field(default=None, max_length=1500)


class BotLineaOverrideRequest(BaseModel):
    apagada: bool


class BotRecargaRequest(BaseModel):
    monto: float = Field(gt=0, le=10_000)


class BotChatFlagRequest(BaseModel):
    desactivado: bool


class BotUsoDia(BaseModel):
    fecha: str
    tokens_entrada: int
    tokens_salida: int
    costo_usd: float


class BotUsoResponse(BaseModel):
    total_tokens_entrada: int
    total_tokens_salida: int
    total_usd: float
    por_dia: list[BotUsoDia]
